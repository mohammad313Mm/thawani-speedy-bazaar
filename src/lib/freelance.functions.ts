import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Freelance courier request ("مندوب حر"): the customer describes what they
// need from the market and the request goes straight into the drivers pool.

const FREELANCE_STORE_NAME = "مندوب حر";
const FREELANCE_FEE = 2000;

const inputSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().trim().max(200).nullable().optional(),
  customer_phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(1).max(500),
  details: z.string().trim().min(1).max(1000),
  customer_lat: z.number().nullable().optional(),
  customer_lng: z.number().nullable().optional(),
});

export const placeFreelanceOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Virtual store that owns all freelance requests (created once).
    let storeId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("name", FREELANCE_STORE_NAME)
      .maybeSingle();
    storeId = (existing as { id: string } | null)?.id ?? null;
    if (!storeId) {
      const { data: created, error: storeErr } = await supabaseAdmin
        .from("stores")
        .insert({
          name: FREELANCE_STORE_NAME,
          category: "freelance",
          description: "طلبات المندوب الحر",
          status: "active",
          is_open: true,
          delivery_available: true,
        })
        .select("id")
        .single();
      if (storeErr) throw new Error(storeErr.message);
      storeId = created.id as string;
    }

    // Area isolation: resolved server-side from the customer's coordinates.
    let areaId: string | null = null;
    if (data.customer_lat != null && data.customer_lng != null) {
      const { data: a } = await supabaseAdmin.rpc("area_for_point" as never, {
        _lat: data.customer_lat,
        _lng: data.customer_lng,
      } as never);
      areaId = (a as string | null) ?? null;
    }
    if (!areaId) throw new Error("عذرًا، الخدمة غير متوفرة في موقعك حاليًا.");

    const localId = `FR-${Date.now().toString(36).toUpperCase()}`;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("customer_orders")
      .insert({
        local_order_id: localId,
        store_id: storeId,
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name || null,
        customer_phone: data.customer_phone,
        address: data.address,
        notes: data.details,
        items: [{ name: data.details, qty: 1, price: 0 }],
        subtotal: 0,
        delivery_fee: FREELANCE_FEE,
        total: FREELANCE_FEE,
        payment_method: "cod",
        // Straight into the drivers pool — no merchant approval step.
        status: "searching_driver",
        area_id: areaId,
        customer_lat: data.customer_lat ?? null,
        customer_lng: data.customer_lng ?? null,
      })
      .select("id, local_order_id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Push notification fan-out to drivers (best effort).
    try {
      // Only drivers registered inside the same area are notified.
      const { data: areaDrivers } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("area_id", areaId);
      const driverIds = (areaDrivers ?? []).map((p) => p.id as string);
      const { data: tokens } = driverIds.length
        ? await supabaseAdmin
            .from("device_tokens")
            .select("token")
            .eq("role", "driver")
            .in("user_id", driverIds)
        : { data: [] as { token: string }[] };
      const list = (tokens ?? []).map((t) => t.token as string);
      if (list.length) {
        const { sendFcmToTokens } = await import("./fcm.server");
        const result = await sendFcmToTokens(list, {
          title: "طلب مندوب حر جديد",
          body: [
            `الطلب: ${data.details.slice(0, 80)}`,
            `العنوان: ${data.address}`,
            `الإجمالي: ${FREELANCE_FEE.toLocaleString("ar-IQ")} د.ع`,
          ].join("\n"),
          tag: `order-${inserted.id}`,
          data: {
            order_id: inserted.id as string,
            order_num: localId,
            store_name: FREELANCE_STORE_NAME,
            address: data.address,
            total: String(FREELANCE_FEE),
            route: "/driver/dashboard",
            kind: "driver_order",
          },
        });
        if (result.invalidTokens.length) {
          await supabaseAdmin.from("device_tokens").delete().in("token", result.invalidTokens);
        }
      }
    } catch (e) {
      console.error("[placeFreelanceOrder] push notify failed", e);
    }

    return { ok: true, order_id: inserted.id as string, local_order_id: localId };
  });
