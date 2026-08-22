import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, phoneToEmail } from "./phone-auth";

// Taxi module: customer requests + admin-managed taxi driver accounts.

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

    const localRef = `TX-${Date.now().toString(36).toUpperCase()}`;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("taxi_requests")
      .insert({
        local_ref: localRef,
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name || null,
        customer_phone: data.customer_phone,
        address: data.address,
        notes: data.notes || null,
        customer_lat: data.customer_lat ?? null,
        customer_lng: data.customer_lng ?? null,
        status: "pending",
      })
      .select("id, local_ref")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Best-effort push fan-out to taxi drivers.
    try {
      const { data: tokens } = await supabaseAdmin
        .from("device_tokens")
        .select("token")
        .eq("role", "taxi");
      const list = (tokens ?? []).map((t) => t.token as string);
      if (list.length) {
        const { sendFcmToTokens } = await import("./fcm.server");
        const result = await sendFcmToTokens(list, {
          title: "طلب تكسي جديد",
          body: [`الموقع: ${data.address}`, `الملاحظات: ${data.notes || "لا توجد ملاحظات"}`].join("\n"),
          tag: `taxi-${inserted.id}`,
          data: {
            order_id: inserted.id as string,
            route: "/taxi/orders",
            kind: "taxi_request",
          },
        });
        if (result.invalidTokens.length) {
          await supabaseAdmin.from("device_tokens").delete().in("token", result.invalidTokens);
        }
      }
    } catch (e) {
      console.error("[placeTaxiRequest] push notify failed", e);
    }

    return { ok: true, request_id: inserted.id as string, local_ref: localRef };
  });

/* ---------------- Driver actions ---------------- */

export const taxiRespondToRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        action: z.enum(["accept", "reject", "deliver"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isTaxi } = await context.supabase.rpc("is_taxi_driver", {
      _user_id: context.userId,
    });
    if (!isTaxi) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("taxi_requests")
      .select("id, status, driver_id")
      .eq("id", data.request_id)
      .maybeSingle();
    if (error || !row) throw new Error("Request not found");

    const current = row as { status: string; driver_id: string | null };

    if (data.action === "accept") {
      if (current.driver_id && current.driver_id !== context.userId)
        throw new Error("تم قبول الطلب من سائق آخر");
      const { error: e } = await supabaseAdmin
        .from("taxi_requests")
        .update({
          status: "accepted",
          driver_id: context.userId,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", data.request_id)
        .is("driver_id", null);
      if (e) throw new Error(e.message);
    } else if (data.action === "reject") {
      const { error: e } = await supabaseAdmin
        .from("taxi_requests")
        .update({ status: "rejected", rejected_at: new Date().toISOString() })
        .eq("id", data.request_id);
      if (e) throw new Error(e.message);
    } else {
      if (current.driver_id !== context.userId) throw new Error("Forbidden");
      const { error: e } = await supabaseAdmin
        .from("taxi_requests")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", data.request_id);
      if (e) throw new Error(e.message);
    }
    return { ok: true };
  });

/* ---------------- Admin management ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin role required");
}

export const adminCreateTaxiDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        phone: z.string().trim().min(6).max(30),
        password: z.string().min(4).max(72),
        full_name: z.string().trim().max(200).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const normalized = normalizePhone(data.phone);
    if (!normalized) throw new Error("رقم هاتف غير صالح");
    const email = phoneToEmail(normalized);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: normalized, full_name: data.full_name ?? null },
    });
    if (createErr) {
      // Existing account → reset its password and grant taxi access.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => u.email === email);
      if (!found) throw new Error(createErr.message);
      userId = found.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("تعذر إنشاء الحساب");

    const { error: upErr } = await supabaseAdmin
      .from("taxi_drivers")
      .upsert(
        {
          user_id: userId,
          phone: normalized,
          full_name: data.full_name || null,
          is_active: true,
        },
        { onConflict: "user_id" },
      );
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", userId);

    return { ok: true, user_id: userId, phone: normalized };
  });

export const adminSetTaxiDriverActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taxi_drivers")
      .update({ is_active: data.is_active })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTaxiDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taxi_drivers")
      .delete()
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListTaxi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [drivers, requests] = await Promise.all([
      supabaseAdmin
        .from("taxi_drivers")
        .select("user_id, phone, full_name, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("taxi_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const driverRows = (drivers.data ?? []) as Array<{
      user_id: string;
      phone: string;
      full_name: string | null;
      is_active: boolean;
      created_at: string;
    }>;
    const byId = new Map(driverRows.map((d) => [d.user_id, d]));
    const requestRows = ((requests.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      driver_phone: r["driver_id"] ? byId.get(r["driver_id"] as string)?.phone ?? null : null,
    }));
    return { drivers: driverRows, requests: requestRows };
  });
