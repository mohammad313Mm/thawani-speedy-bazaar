import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server-authoritative order placement. Prices, delivery fee, and totals are
// recomputed from the database — the client cannot dictate them.

const inputSchema = z.object({
  local_order_id: z.string().min(1),
  store_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(6).max(30),
  address: z.string().min(1).max(500),
  notes: z.string().max(1000).nullable().optional(),
  items: z
    .array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(999) }))
    .min(1)
    .max(200),
  distance_km: z.number().min(0).max(500),
  payment_method: z.enum(["cod", "wallet"]),
  customer_lat: z.number().nullable().optional(),
  customer_lng: z.number().nullable().optional(),
});

function feeForDistance(km: number): number {
  if (km < 4) return 1000;
  if (km < 7) return 2000;
  if (km < 12) return 3000;
  return 5000;
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const productIds = data.items.map((it) => it.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, store_id, name_ar, price_iqd, is_available")
      .in("id", productIds);
    if (prodErr) throw new Error(prodErr.message);

    const priceMap = new Map<string, { name: string; price: number; store_id: string; available: boolean }>();
    for (const p of products ?? []) {
      priceMap.set(p.id as string, {
        name: (p as { name_ar: string }).name_ar,
        price: (p as { price_iqd: number }).price_iqd,
        store_id: (p as { store_id: string }).store_id,
        available: (p as { is_available: boolean }).is_available,
      });
    }

    let subtotal = 0;
    const items: Array<{ name: string; qty: number; price: number }> = [];
    for (const it of data.items) {
      const p = priceMap.get(it.product_id);
      if (!p) throw new Error("Invalid product in cart");
      if (!p.available) throw new Error("Product no longer available");
      if (p.store_id !== data.store_id) throw new Error("Product does not belong to this store");
      subtotal += p.price * it.qty;
      items.push({ name: p.name, qty: it.qty, price: p.price });
    }

    const delivery_fee = feeForDistance(data.distance_km);
    const total = subtotal + delivery_fee;

    const { error: insErr } = await supabaseAdmin.from("customer_orders").insert({
      local_order_id: data.local_order_id,
      store_id: data.store_id,
      customer_id: data.customer_id ?? null,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      address: data.address,
      notes: data.notes ?? null,
      items,
      subtotal,
      delivery_fee,
      total,
      payment_method: data.payment_method,
      status: "pending",
      customer_lat: data.customer_lat ?? null,
      customer_lng: data.customer_lng ?? null,
    });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, subtotal, delivery_fee, total };
  });
