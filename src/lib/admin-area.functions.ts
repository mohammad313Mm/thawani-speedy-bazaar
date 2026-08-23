import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Area-scoped admin reads. The area filter is applied on the server, so the
// admin dashboard can never receive rows belonging to another area.

const areaInput = z.object({ area_id: z.string().uuid() });

/** Applications (merchant / driver) of users whose profile belongs to the area. */
export const adminAreaApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    areaInput
      .extend({
        kind: z.enum(["merchant", "driver"]),
        status: z.enum(["pending", "approved", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("area_id", data.area_id);
    const ids = (profs ?? []).map((p) => p.id as string);
    if (ids.length === 0) return { rows: [] };

    const table = data.kind === "merchant" ? "merchant_applications" : "driver_applications";
    const { data: rows, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("status", data.status)
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/** Stores of one area. */
export const adminAreaStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("area_id", data.area_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/** Drivers (profiles with the driver role) of one area. */
export const adminAreaDrivers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "driver");
    const ids = (roles ?? []).map((r) => r.user_id as string);
    if (ids.length === 0) return { rows: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, status, created_at")
      .in("id", ids)
      .eq("area_id", data.area_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/** Advertisements of one area. */
export const adminAreaAds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("advertisements")
      .select("*")
      .eq("area_id", data.area_id)
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/** Admin alerts + sent broadcasts of one area. */
export const adminAreaNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rows }, { data: broadcasts }] = await Promise.all([
      supabaseAdmin
        .from("admin_notifications")
        .select("*")
        .eq("area_id", data.area_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("broadcast_notifications")
        .select("id, title, body, created_at")
        .eq("area_id", data.area_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return { rows: rows ?? [], broadcasts: broadcasts ?? [] };
  });

/** Mark every alert of one area as read. */
export const adminAreaMarkNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => areaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("area_id", data.area_id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The areas the admin can pick from (single source: إدارة المناطق). */
export const adminListAreasForPicker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminCaller } = await import("./admin-guard.server");
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("delivery_areas")
      .select("id, name_ar, city, is_active")
      .order("name_ar");
    if (error) throw new Error(error.message);
    return { areas: rows ?? [] };
  });
