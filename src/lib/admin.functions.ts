import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_PASSWORD = "2361996arakf";

function assertAdmin(password: string) {
  if (password !== ADMIN_PASSWORD) throw new Error("Unauthorized");
}

/* ============== Application approve/reject (existing) ============== */

const inputSchema = z.object({
  password: z.string(),
  kind: z.enum(["merchant", "driver"]),
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().nullable().optional(),
});

const APPROVE_MSG = "تم قبول طلبك من الإدارة، يمكنك الآن تسجيل الدخول واستخدام حسابك";
const REJECT_MSG = "تم رفض طلبك من الإدارة";

export const adminActOnApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "merchant" ? "merchant_applications" : "driver_applications";
    const baseNote = data.decision === "approved" ? APPROVE_MSG : REJECT_MSG;
    const admin_note = data.note ? `${baseNote} — ${data.note}` : baseNote;

    const { data: updated, error } = await supabaseAdmin
      .from(table)
      .update({ status: data.decision, admin_note })
      .eq("id", data.id)
      .select("user_id")
      .single();
    if (error) throw new Error(error.message);

    if (data.decision === "approved" && updated?.user_id) {
      const role = data.kind === "merchant" ? "merchant" : "driver";
      await supabaseAdmin.from("user_roles").insert({ user_id: updated.user_id, role }).select();
      await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", updated.user_id);
    }
    return { ok: true };
  });

/* ============== Advertisements ============== */

const adSchema = z.object({
  password: z.string(),
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
  .inputValidator((d: unknown) => adSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, ...row } = data;
    void _p;
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
  .inputValidator((d: unknown) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("advertisements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Delivery areas ============== */

const areaSchema = z.object({
  password: z.string(),
  id: z.string().uuid().optional(),
  name_ar: z.string().min(1),
  name_en: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  fee_iqd: z.number().int().min(0),
  min_order_iqd: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const adminSaveArea = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => areaSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, ...row } = data;
    void _p;
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
  .inputValidator((d: unknown) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("delivery_areas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Stores (admin edits) ============== */

const storeSchema = z.object({
  password: z.string(),
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
  .inputValidator((d: unknown) => storeSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, ...row } = data;
    void _p;
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
  .inputValidator((d: unknown) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Products ============== */

const productSchema = z.object({
  password: z.string(),
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
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, ...row } = data;
    void _p;
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
  .inputValidator((d: unknown) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Driver areas assignment ============== */

export const adminSetDriverAreas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      password: z.string(),
      driver_id: z.string().uuid(),
      area_ids: z.array(z.string().uuid()),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("driver_delivery_areas").delete().eq("driver_id", data.driver_id);
    if (data.area_ids.length > 0) {
      const rows = data.area_ids.map((area_id) => ({ driver_id: data.driver_id, area_id }));
      const { error } = await supabaseAdmin.from("driver_delivery_areas").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
