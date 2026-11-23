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
        // Waits for the owner's approval in the admin panel first.
        status: "pending",
        area_id: areaId,
        customer_lat: data.customer_lat ?? null,
        customer_lng: data.customer_lng ?? null,
      })
      .select("id, local_order_id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Owner approval comes first: notify admins with the same push used for
    // regular new orders. Drivers are notified once the owner approves.
    try {
      const { notifyAdminsNewFreelanceOrder } = await import("./freelance.server");
      await notifyAdminsNewFreelanceOrder(supabaseAdmin, {
        id: inserted.id as string,
        localId,
        address: data.address,
      });
    } catch (e) {
      console.error("[placeFreelanceOrder] admin push failed", e);
    }

    return { ok: true, order_id: inserted.id as string, local_order_id: localId };
  });
