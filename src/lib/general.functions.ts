import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  feeForDistance,
  haversineKm,
  isValidCoord,
  STORE_NO_LOCATION_MSG,
} from "./delivery-fee";

/**
 * "العامة" — admin-created store icons.
 *
 * They are ordinary rows in `public.stores` flagged with `is_general = true`, so
 * every existing system (orders, merchant dashboard, drivers, admin, area
 * isolation, notifications, delivery pricing) keeps working unchanged.
 *
 * - `status` ('active' | 'suspended')  -> مفعّلة / معطّلة (admin only)
 * - `is_open` (boolean)                -> متوفر / غير متوفر (admin + owner)
 * - `general_store_areas`              -> the areas the icon shows in
 */

export type GeneralStorePublic = {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_open: boolean;
};

const listSchema = z.object({ area_id: z.string().uuid().nullable().optional() });

/** Active general icons, optionally restricted to one area (public). */
export const listGeneralStores = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ids: string[] | null = null;
    if (data.area_id) {
      const { data: links } = await supabaseAdmin
        .from("general_store_areas")
        .select("store_id")
        .eq("area_id", data.area_id);
      ids = (links ?? []).map((l) => l.store_id as string);
      if (ids.length === 0) return { stores: [] as GeneralStorePublic[] };
    }

    let q = supabaseAdmin
      .from("stores")
      .select("id, name, logo_url, description, is_open")
      .eq("is_general", true)
      .eq("status", "active")
      .order("name");
    if (ids) q = q.in("id", ids);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { stores: (rows ?? []) as unknown as GeneralStorePublic[] };
  });

/** One general icon by id (public). */
export const getGeneralStore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, logo_url, description, is_open, status, is_general")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const s = row as (GeneralStorePublic & { status: string; is_general: boolean }) | null;
    if (!s || !s.is_general || s.status !== "active") return { store: null };
    return {
      store: {
        id: s.id,
        name: s.name,
        logo_url: s.logo_url,
        description: s.description,
        is_open: s.is_open,
      } satisfies GeneralStorePublic,
    };
  });

const orderSchema = z.object({
  store_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(6).max(30),
  address: z.string().min(1).max(500),
  details: z.string().min(1).max(2000),
  customer_lat: z.number(),
  customer_lng: z.number(),
});

/**
 * Free-text order for a general store. Uses the SAME orders table, the SAME
 * area resolution and the SAME delivery-fee module as regular stores.
 */
export const placeGeneralOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: storeRow, error: storeErr } = await supabaseAdmin
      .from("stores")
      .select("id, name, owner_id, is_general, status, is_open, latitude, longitude")
      .eq("id", data.store_id)
      .maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    const store = storeRow as {
      id: string;
      name: string;
      owner_id: string | null;
      is_general: boolean;
      status: string;
      is_open: boolean;
      latitude: number | null;
      longitude: number | null;
    } | null;
    if (!store || !store.is_general || store.status !== "active") {
      throw new Error("هذا المتجر غير متاح حالياً.");
    }
    if (!store.is_open) {
      throw new Error("المتجر غير متوفر حالياً ولا يمكن استقبال الطلبات.");
    }

    if (!isValidCoord(data.customer_lat, data.customer_lng)) {
      throw new Error("يرجى تحديد موقعك أولاً لاحتساب أجور التوصيل.");
    }
    if (!isValidCoord(store.latitude, store.longitude)) {
      throw new Error(STORE_NO_LOCATION_MSG);
    }

    // Area of the CUSTOMER (same rule as the rest of the app).
    const { data: resolved } = await supabaseAdmin.rpc("area_for_point" as never, {
      _lat: data.customer_lat,
      _lng: data.customer_lng,
    } as never);
    const areaId = (resolved as string | null) ?? null;
    if (!areaId) throw new Error("عذراً، الخدمة غير متوفرة في موقعك حالياً.");

    const { data: link } = await supabaseAdmin
      .from("general_store_areas")
      .select("area_id")
      .eq("store_id", store.id)
      .eq("area_id", areaId)
      .maybeSingle();
    if (!link) throw new Error("عذراً، هذا المتجر لا يخدم منطقتك.");

    const distance_km = haversineKm(
      { lat: data.customer_lat, lng: data.customer_lng },
      { lat: store.latitude as number, lng: store.longitude as number },
    );
    const delivery_fee = feeForDistance(distance_km);
    const subtotal = 0;
    const total = subtotal + delivery_fee;

    const local_order_id = `G-${Date.now().toString(36).toUpperCase()}`;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("customer_orders")
      .insert({
        local_order_id,
        store_id: store.id,
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        address: data.address,
        notes: data.details,
        items: [{ name: `طلب الزبون: ${data.details}`, qty: 1, price: 0 }],
        subtotal,
        delivery_fee,
        total,
        payment_method: "cod",
        status: "pending",
        area_id: areaId,
        customer_lat: data.customer_lat,
        customer_lng: data.customer_lng,
      })
      .select("id, local_order_id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Same notification pipeline as regular store orders.
    try {
      if (store.owner_id) {
        const { data: tokens } = await supabaseAdmin
          .from("device_tokens")
          .select("token")
          .eq("user_id", store.owner_id);
        const list = (tokens ?? []).map((t) => t.token as string);
        if (list.length) {
          const { sendFcmToTokens } = await import("./fcm.server");
          const orderNum = (inserted.local_order_id ?? inserted.id).slice(-6).toUpperCase();
          const result = await sendFcmToTokens(list, {
            title: "طلب جديد",
            body: "لديك طلب جديد. يرجى المراجعة والقبول أو الرفض.",
            tag: `order-${inserted.id}`,
            data: {
              order_id: inserted.id,
              order_num: orderNum,
              route: "/merchant/dashboard",
              kind: "store_order",
            },
          });
          if (result.invalidTokens.length) {
            await supabaseAdmin.from("device_tokens").delete().in("token", result.invalidTokens);
          }
          if (result.sent > 0) {
            const sentAt = new Date();
            await supabaseAdmin
              .from("customer_orders")
              .update({
                notified_at: sentAt.toISOString(),
                escalation_due_at: new Date(sentAt.getTime() + 5 * 60 * 1000).toISOString(),
              })
              .eq("id", inserted.id);
          }
        }
      }
      await supabaseAdmin.from("admin_notifications").insert({
        kind: "general_order",
        title: "طلب جديد من العامة",
        body: `${store.name} — ${data.details.slice(0, 200)}`,
        ref_table: "customer_orders",
        ref_id: inserted.id,
        area_id: areaId,
      });
    } catch (e) {
      console.error("[placeGeneralOrder] notify failed", e);
    }

    return { ok: true, local_order_id, delivery_fee, distance_km, total };
  });

/* ============== Merchant side: claiming an admin-created "العامة" store ============== */

/**
 * Signed-in merchant: the admin-created "العامة" icons that are still free
 * (no owner yet). Dynamic — always read from the database.
 */
export const listClaimableGeneralStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, logo_url, description, is_open, owner_id")
      .eq("is_general", true)
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    const stores = (rows ?? [])
      .filter((s) => !s.owner_id || s.owner_id === context.userId)
      .map((s) => ({
        id: s.id as string,
        name: s.name as string,
        logo_url: s.logo_url as string | null,
        description: s.description as string | null,
        is_open: s.is_open as boolean,
      })) satisfies GeneralStorePublic[];
    return { stores };
  });

const claimSchema = z.object({
  store_id: z.string().uuid(),
  phone: z.string().min(6).max(30),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Signed-in approved merchant takes ownership of one free "العامة" icon and
 * saves its phone + location. Area binding reuses `area_for_point` and the
 * existing `general_store_areas` link table.
 */
export const claimGeneralStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => claimSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isMerchant = (roles ?? []).some((r) => r.role === "merchant");
    if (!isMerchant) throw new Error("حسابك غير معتمد كصاحب متجر بعد.");

    const { data: row, error } = await supabaseAdmin
      .from("stores")
      .select("id, owner_id, is_general, status")
      .eq("id", data.store_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const store = row as
      | { id: string; owner_id: string | null; is_general: boolean; status: string }
      | null;
    if (!store || !store.is_general || store.status !== "active") {
      throw new Error("هذا المتجر غير متاح.");
    }
    if (store.owner_id && store.owner_id !== userId) {
      throw new Error("تم اختيار هذا المتجر من قبل صاحب متجر آخر.");
    }

    const { data: resolved } = await supabaseAdmin.rpc("area_for_point" as never, {
      _lat: data.lat,
      _lng: data.lng,
    } as never);
    const areaId = (resolved as string | null) ?? null;

    const { error: upErr } = await supabaseAdmin
      .from("stores")
      .update({
        owner_id: userId,
        phone: data.phone,
        latitude: data.lat,
        longitude: data.lng,
        area_id: areaId,
        is_open: true,
      })
      .eq("id", store.id);
    if (upErr) throw new Error(upErr.message);

    if (areaId) {
      await supabaseAdmin
        .from("general_store_areas")
        .upsert({ store_id: store.id, area_id: areaId }, { onConflict: "store_id,area_id" });
    }

    return { ok: true as const, area_id: areaId };
  });
