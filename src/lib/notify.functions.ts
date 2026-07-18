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
      .select("id, store_id, local_order_id, stores(owner_id)")
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");

    const ownerId = (order as { stores: { owner_id: string } | null }).stores?.owner_id;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (ownerId !== context.userId && !isAdmin) throw new Error("Forbidden");

    const { data: tokens } = await supabaseAdmin
      .from("device_tokens")
      .select("token")
      .eq("role", "driver");

    const list = (tokens ?? []).map((t) => t.token as string);
    const orderNum = ((order as { local_order_id: string | null }).local_order_id ?? data.order_id)
      .slice(-6)
      .toUpperCase();

    const result = await sendFcmToTokens(list, {
      title: "طلب توصيل جديد",
      body: "لديك طلب توصيل جديد. اضغط للمراجعة والقبول.",
      tag: `order-${data.order_id}`,
      data: {
        order_id: data.order_id,
        order_num: orderNum,
        route: "/driver.dashboard",
        kind: "driver_order",
      },
    });
    await pruneInvalid(result.invalidTokens);
    return { sent: result.sent, failed: result.failed };
  });
