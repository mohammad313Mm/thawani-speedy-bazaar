import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdminCaller(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin role required");
}

/* ============== Application approve/reject ============== */

const inputSchema = z.object({
  kind: z.enum(["merchant", "driver"]),
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().nullable().optional(),
});

const APPROVE_MSG = "تم قبول طلبك من الإدارة، يمكنك الآن تسجيل الدخول واستخدام حسابك";
const REJECT_MSG = "تم رفض طلبك من الإدارة";

export const adminActOnApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "merchant" ? "merchant_applications" : "driver_applications";
    const baseNote = data.decision === "approved" ? APPROVE_MSG : REJECT_MSG;
    const admin_note = data.note ? `${baseNote} — ${data.note}` : baseNote;

    const { data: updated, error } = await supabaseAdmin
      .from(table)
      .update({ status: data.decision, admin_note })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (data.decision === "approved" && updated?.user_id) {
      const role = data.kind === "merchant" ? "merchant" : "driver";
      await supabaseAdmin.from("user_roles").insert({ user_id: updated.user_id, role }).select();
      await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", updated.user_id);

      if (data.kind === "merchant") {
        const { data: existing } = await supabaseAdmin
          .from("stores")
          .select("id")
          .eq("owner_id", updated.user_id)
          .maybeSingle();
        if (!existing) {
          await supabaseAdmin.from("stores").insert({
            owner_id: updated.user_id,
            name: (updated as { store_name?: string | null }).store_name || "متجري",
            status: "active",
            is_open: true,
          });
        } else {
          await supabaseAdmin.from("stores").update({ status: "active" }).eq("id", existing.id);
        }
      }
    }
    return { ok: true };
  });

/* ============== Advertisements ============== */

const adSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  image_url: z.string().min(1),
  link_url: z.string().nullable().optional(),
  position: z.string().default("home_top"),
  category: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const adminSaveAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("advertisements").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("advertisements").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("advertisements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Delivery areas ============== */

const areaSchema = z.object({
  id: z.string().uuid().optional(),
  name_ar: z.string().min(1),
  name_en: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  fee_iqd: z.number().int().min(0),
  min_order_iqd: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  boundary_points: z
    .array(z.object({ lat: z.number(), lng: z.number() }))
    .max(500)
    .default([]),
});

export const adminSaveArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("delivery_areas").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("delivery_areas").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("delivery_areas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Stores ============== */

const storeSchema = z.object({
  id: z.string().uuid().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  working_hours: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  commission_rate: z.number().min(0).max(100).default(15),
  commission_type: z.enum(["percent", "fixed"]).default("percent"),
  commission_amount: z.number().min(0).default(0),
  delivery_available: z.boolean().default(true),
  is_open: z.boolean().default(true),
});

export const adminSaveStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("stores").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("stores").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Products ============== */

const productSchema = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid(),
  name_ar: z.string().min(1),
  description: z.string().nullable().optional(),
  price_iqd: z.number().int().min(0),
  image_url: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("products").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Driver areas ============== */

export const adminSetDriverAreas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      driver_id: z.string().uuid(),
      area_ids: z.array(z.string().uuid()),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("driver_delivery_areas").delete().eq("driver_id", data.driver_id);
    if (data.area_ids.length > 0) {
      const rows = data.area_ids.map((area_id) => ({ driver_id: data.driver_id, area_id }));
      const { error } = await supabaseAdmin.from("driver_delivery_areas").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ============== Customer orders ============== */

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("customer_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const storeIds = Array.from(new Set((orders ?? []).map((o) => o.store_id)));
    let storeMap: Record<string, { id: string; name: string }> = {};
    if (storeIds.length) {
      const { data: stores } = await supabaseAdmin
        .from("stores")
        .select("id, name")
        .in("id", storeIds);
      storeMap = Object.fromEntries((stores ?? []).map((s) => [s.id, s as { id: string; name: string }]));
    }
    return { orders: orders ?? [], stores: storeMap };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum([
        "pending",
        "accepted",
        "preparing",
        "ready",
        "driver_assigned",
        "delivered",
        "rejected",
        "cancelled",
      ]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("customer_orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Broadcast notifications ============== */

export const adminSendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().max(120).optional(),
        body: z.string().trim().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("broadcast_notifications").insert({
      title: data.title && data.title.length > 0 ? data.title : "إشعار",
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("broadcast_notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== App categories (home-screen sections) ============== */

const appCategorySchema = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "المعرف يجب أن يكون حروفاً إنجليزية صغيرة أو أرقاماً"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  image_url: z.string().nullable().optional(),
  icon_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const adminSaveAppCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => appCategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...row } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("app_categories").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("app_categories").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteAppCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAppCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_categories")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

/* ============== Products inside an admin-created app category ============== */

const categoryProductSchema = z.object({
  id: z.string().uuid().optional(),
  category_key: z.string().trim().min(1),
  category_name: z.string().trim().min(1),
  name_ar: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  image_url: z.string().nullable().optional(),
  price_iqd: z.number().int().min(0).default(0),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

// Every category needs a container store so the normal store/product/order
// pipeline (cart -> checkout -> merchant + admin) keeps working unchanged.
async function ensureCategoryStore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  categoryKey: string,
  categoryName: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("stores")
    .select("id")
    .eq("category", categoryKey)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await admin
    .from("stores")
    .insert({ name: categoryName, category: categoryKey, status: "active", is_open: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created!.id as string;
}

export const adminListCategoryProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ category_key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("category", data.category_key);
    const ids = (stores ?? []).map((s) => s.id);
    if (ids.length === 0) return { rows: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("store_id", ids)
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminSaveCategoryProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categoryProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storeId = await ensureCategoryStore(supabaseAdmin, data.category_key, data.category_name);
    const row = {
      store_id: storeId,
      name_ar: data.name_ar,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      price_iqd: data.price_iqd,
      category: data.category_key,
      is_available: data.is_available,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("products").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
