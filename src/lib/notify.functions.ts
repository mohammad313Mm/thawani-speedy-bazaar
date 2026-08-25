import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function pruneInvalid(tokens: string[]) {
  if (tokens.length === 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("device_tokens").delete().in("token", tokens);
}

// Notify all available drivers about an order that needs a courier.
// Called by the merchant client right after accepting an order.
export const notifyDriversForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendFcmToTokens } = await import("./fcm.server");

    // Only the store owner of this order (or an admin) may fan out to drivers.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("customer_orders")
      .select("id, store_id, local_order_id, address, total, area_id, stores(owner_id, name)")
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");

    const storeRel = (order as { stores: { owner_id: string; name: string | null } | null }).stores;
    const ownerId = storeRel?.owner_id;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (ownerId !== context.userId && !isAdmin) throw new Error("Forbidden");

    // Area isolation: only drivers belonging to the order's area are notified.
    const orderAreaId = (order as { area_id: string | null }).area_id;
    const { data: areaDrivers } = orderAreaId
      ? await supabaseAdmin.from("profiles").select("id").eq("area_id", orderAreaId)
      : { data: [] as { id: string }[] };
    const driverIds = (areaDrivers ?? []).map((p) => p.id as string);
    const { data: tokens } = driverIds.length
      ? await supabaseAdmin
          .from("device_tokens")
          .select("token")
          .eq("role", "driver")
          .in("user_id", driverIds)
      : { data: [] as { token: string }[] };

    const list = (tokens ?? []).map((t) => t.token as string);
    const orderRow = order as {
      local_order_id: string | null;
      address: string | null;
      total: number;
    };
    const orderNum = (orderRow.local_order_id ?? data.order_id).slice(-6).toUpperCase();
    const storeName = storeRel?.name || "متجر";
    const totalFmt = `${Math.round(orderRow.total).toLocaleString("ar-IQ")} د.ع`;
    const address = orderRow.address?.trim() || "بدون عنوان";
    const bodyLines = [
      `المتجر: ${storeName}`,
      `العنوان: ${address}`,
      `الإجمالي: ${totalFmt}`,
    ].join("\n");

    const result = await sendFcmToTokens(list, {
      title: "طلب توصيل جديد",
      body: bodyLines,
      tag: `order-${data.order_id}`,
      data: {
        order_id: data.order_id,
        order_num: orderNum,
        store_name: storeName,
        address,
        total: String(orderRow.total),
        route: "/driver/dashboard",
        kind: "driver_order",
      },
    });
    await pruneInvalid(result.invalidTokens);
    return { sent: result.sent, failed: result.failed };
  });
