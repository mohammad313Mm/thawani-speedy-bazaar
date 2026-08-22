import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Taxi request: customer requests a taxi to their current location.

const TAXI_STORE_NAME = "تكسي";

const inputSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().trim().max(200).nullable().optional(),
  customer_phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).nullable().optional(),
  customer_lat: z.number().nullable().optional(),
  customer_lng: z.number().nullable().optional(),
});

export const placeTaxiRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Virtual store that owns all taxi requests (created once).
    let storeId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("name", TAXI_STORE_NAME)
      .maybeSingle();
    storeId = (existing as { id: string } | null)?.id ?? null;
    if (!storeId) {
      const { data: created, error: storeErr } = await supabaseAdmin
        .from("stores")
        .insert({
          name: TAXI_STORE_NAME,
          category: "taxi",
          description: "طلبات التكسي",
          status: "active",
          is_open: true,
          delivery_available: true,
        })
        .select("id")
        .single();
      if (storeErr) throw new Error(storeErr.message);
      storeId = created.id as string;
    }

    const localId = `TX-${Date.now().toString(36).toUpperCase()}`;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("customer_orders")
      .insert({
        local_order_id: localId,
        store_id: storeId,
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name || null,
        customer_phone: data.customer_phone,
        address: data.address,
        notes: data.notes || null,
        items: [{ name: "طلب تكسي", qty: 1, price: 0 }],
        subtotal: 0,
        delivery_fee: 0,
        total: 0,
        payment_method: "cod",
        status: "searching_driver",
        customer_lat: data.customer_lat ?? null,
        customer_lng: data.customer_lng ?? null,
      })
      .select("id, local_order_id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Push notification fan-out to drivers (best effort).
    try {
      const { data: tokens } = await supabaseAdmin
        .from("device_tokens")
        .select("token")
        .eq("role", "driver");
      const list = (tokens ?? []).map((t) => t.token as string);
      if (list.length) {
        const { sendFcmToTokens } = await import("./fcm.server");
        const result = await sendFcmToTokens(list, {
          title: "طلب تكسي جديد",
          body: [`الموقع: ${data.address}`, `الملاحظات: ${data.notes || "لا توجد ملاحظات"}`].join("\n"),
          tag: `order-${inserted.id}`,
          data: {
            order_id: inserted.id as string,
            order_num: localId,
            store_name: TAXI_STORE_NAME,
            address: data.address,
            total: "0",
            route: "/driver.dashboard",
            kind: "driver_order",
          },
        });
        if (result.invalidTokens.length) {
          await supabaseAdmin.from("device_tokens").delete().in("token", result.invalidTokens);
        }
      }
    } catch (e) {
      console.error("[placeTaxiRequest] push notify failed", e);
    }

    return { ok: true, order_id: inserted.id as string, local_order_id: localId };
  });
