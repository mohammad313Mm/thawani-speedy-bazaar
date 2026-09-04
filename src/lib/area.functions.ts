import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Multi-area isolation. The area a caller belongs to is ALWAYS resolved on the
// server from real coordinates against the admin-drawn polygons. Clients never
// send an area id — sending one has no effect.

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const STORE_COLUMNS =
  "id,owner_id,name,category,phone,address,description,cover_url,logo_url,is_open,status,working_hours,created_at,area_id";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function areaForPoint(lat: number, lng: number): Promise<string | null> {
  const db = await admin();
  const { data, error } = await db.rpc("area_for_point" as never, {
    _lat: lat,
    _lng: lng,
  } as never);
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

async function areaInfo(areaId: string | null) {
  if (!areaId) return null;
  const db = await admin();
  const { data } = await db
    .from("delivery_areas")
    .select("id, name_ar, city, is_active")
    .eq("id", areaId)
    .maybeSingle();
  if (!data || !(data as { is_active: boolean }).is_active) return null;
  return {
    id: (data as { id: string }).id,
    name: (data as { name_ar: string }).name_ar,
    city: (data as { city: string | null }).city,
  };
}

/** Public: resolve which admin-defined area a coordinate falls inside. */
export const resolveArea = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => coordsSchema.parse(d))
  .handler(async ({ data }) => {
    const id = await areaForPoint(data.lat, data.lng);
    return { area: await areaInfo(id) };
  });

/** Signed-in: resolve + persist the area on the caller's own profile. */
export const syncMyArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => coordsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const id = await areaForPoint(data.lat, data.lng);
    const db = await admin();
    await db.from("profiles").update({ area_id: id }).eq("id", context.userId);
    return { area: await areaInfo(id) };
  });

/** Signed-in store owner: re-resolve their store area from its saved coordinates. */
export const syncMyStoreArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: store } = await db
      .from("stores")
      .select("id, latitude, longitude")
      .eq("owner_id", context.userId)
      .maybeSingle();
    const row = store as { id: string; latitude: number | null; longitude: number | null } | null;
    if (!row) return { area: null };
    const id =
      row.latitude != null && row.longitude != null
        ? await areaForPoint(row.latitude, row.longitude)
        : null;
    await db.from("stores").update({ area_id: id }).eq("id", row.id);
    return { area: await areaInfo(id) };
  });

/** Public (area-scoped): active stores inside the caller's resolved area. */
export const listAreaStores = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => coordsSchema.parse(d))
  .handler(async ({ data }) => {
    const areaId = await areaForPoint(data.lat, data.lng);
    if (!areaId) return { areaId: null, stores: [] };
    const db = await admin();
    const { data: rows } = await db
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("status", "active")
      .eq("area_id", areaId)
      .order("created_at", { ascending: false });
    return { areaId, stores: rows ?? [] };
  });

/** Public (area-scoped): a single store, only when it is inside the caller's area. */
export const getAreaStore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => coordsSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const areaId = await areaForPoint(data.lat, data.lng);
    if (!areaId) return { store: null };
    const db = await admin();
    const { data: row } = await db
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("id", data.id)
      .eq("area_id", areaId)
      .eq("status", "active")
      .maybeSingle();
    return { store: row ?? null };
  });

/** Public (area-scoped): products of a store that belongs to the caller's area. */
export const listAreaProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => coordsSchema.extend({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const areaId = await areaForPoint(data.lat, data.lng);
    if (!areaId) return { products: [] };
    const db = await admin();
    const { data: store } = await db
      .from("stores")
      .select("id")
      .eq("id", data.storeId)
      .eq("area_id", areaId)
      .eq("status", "active")
      .maybeSingle();
    if (!store) return { products: [] };
    const { data: rows } = await db
      .from("products")
      .select("*")
      .eq("store_id", data.storeId)
      .order("sort_order");
    return { products: rows ?? [] };
  });

/** Public (area-scoped): specific products by id (used by favorites / product page). */
export const listAreaProductsByIds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    coordsSchema.extend({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const areaId = await areaForPoint(data.lat, data.lng);
    if (!areaId) return { products: [] };
    const db = await admin();
    const { data: rows } = await db
      .from("products")
      .select("*, stores!inner(id,name,status,area_id)")
      .in("id", data.ids)
      .eq("stores.status", "active")
      .eq("stores.area_id", areaId);
    return { products: rows ?? [] };
  });

/** Public (area-scoped): product search limited to the caller's area. */
export const searchAreaProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => coordsSchema.extend({ q: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const areaId = await areaForPoint(data.lat, data.lng);
    if (!areaId) return { products: [] };
    const db = await admin();
    const safe = data.q.replace(/[%,()]/g, " ");
    const { data: rows } = await db
      .from("products")
      .select("*, stores!inner(id,name,status,area_id)")
      .eq("is_available", true)
      .eq("stores.status", "active")
      .eq("stores.area_id", areaId)
      .or(`name_ar.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`)
      .limit(20);
    return { products: rows ?? [] };
  });

/** Public (area-scoped): ads for the caller's area (global ads have no area). */
export const listAreaAds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    coordsSchema.partial().extend({ position: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const areaId =
      data.lat != null && data.lng != null ? await areaForPoint(data.lat, data.lng) : null;
    const db = await admin();
    const q = db
      .from("advertisements")
      .select("id, title, image_url, link_url, area_id, store_id")
      .eq("is_active", true)
      .eq("position", data.position)
      .order("sort_order");
    const { data: rows } = areaId ? await q.or(`area_id.is.null,area_id.eq.${areaId}`) : await q.is("area_id", null);
    let ads = (rows ?? []) as { id: string; store_id?: string | null }[];

    // Ads linked to a store follow the STORE's area, not the ad's manual area.
    const storeIds = Array.from(
      new Set(ads.map((a) => a.store_id).filter((s): s is string => !!s)),
    );
    if (storeIds.length > 0) {
      const { data: stores } = await db
        .from("stores")
        .select("id, area_id, status")
        .in("id", storeIds);
      const ok = new Set(
        (stores ?? [])
          .filter((s) => s.status !== "suspended" && areaId != null && s.area_id === areaId)
          .map((s) => s.id),
      );
      ads = ads.filter((a) => !a.store_id || ok.has(a.store_id));
    }
    return { ads };

  });
