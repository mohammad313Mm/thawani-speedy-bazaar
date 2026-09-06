import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { feeForDistance, haversineKm, isValidCoord } from "./delivery-fee";

const quoteSchema = z.object({
  store_id: z.string().uuid(),
  customer_lat: z.number(),
  customer_lng: z.number(),
});

/**
 * Authoritative delivery quote: distance is computed from the STORE coordinates
 * stored in the database and the customer's live coordinates. The client never
 * dictates the distance.
 */
export const quoteDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => quoteSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select("latitude, longitude")
      .eq("id", data.store_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const lat = (store as { latitude: number | null } | null)?.latitude;
    const lng = (store as { longitude: number | null } | null)?.longitude;
    if (!isValidCoord(lat, lng)) {
      return { ok: false as const, reason: "store_no_location" as const };
    }
    if (!isValidCoord(data.customer_lat, data.customer_lng)) {
      return { ok: false as const, reason: "customer_no_location" as const };
    }

    const distance_km = haversineKm(
      { lat: data.customer_lat, lng: data.customer_lng },
      { lat: lat as number, lng: lng as number },
    );
    return { ok: true as const, distance_km, delivery_fee: feeForDistance(distance_km) };
  });
