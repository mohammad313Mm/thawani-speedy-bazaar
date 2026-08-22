import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizePhone, phoneToEmail } from "./phone-auth";

const phoneSchema = z.object({
  phone: z.string().trim().min(6).max(20),
});

const signUpSchema = phoneSchema.extend({
  fullName: z.string().trim().min(2).max(80),
});

async function derivePassword(normalized: string) {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`thawani:customer:${normalized}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Links the signed-in account to an admin-authorized taxi phone number
 * (if any) so the taxi "طلباتي" panel unlocks automatically.
 */
async function linkTaxiAuthorization(normalized: string, userId: string | null) {
  if (!userId) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Keep the profile phone in sync so phone-based authorization matches.
    await supabaseAdmin.from("profiles").update({ phone: normalized }).eq("id", userId);
    await supabaseAdmin
      .from("taxi_drivers")
      .update({ user_id: userId })
      .eq("phone", normalized)
      .is("user_id", null);
  } catch (e) {
    console.error("[linkTaxiAuthorization]", e);
  }
}

async function signInWithDerived(email: string, password: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user?.id ?? null,
  };
}

export const customerSignUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signUpSchema.parse(d))
  .handler(async ({ data }) => {
    const normalized = normalizePhone(data.phone);
    if (!normalized) return { ok: false as const, error: "رقم الهاتف غير صالح" };
    const email = phoneToEmail(normalized);
    const password = await derivePassword(normalized);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: normalized },
    });
    if (error && !/already/i.test(error.message)) {
      return { ok: false as const, error: "تعذر إنشاء الحساب، حاول مرة أخرى" };
    }
    if (error) {
      return { ok: false as const, error: "هذا الرقم مسجل مسبقاً، سجّل الدخول" };
    }

    const session = await signInWithDerived(email, password);
    if (!session) return { ok: false as const, error: "تعذر تسجيل الدخول بعد التسجيل" };
    return { ok: true as const, session };
  });

export const customerSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => phoneSchema.parse(d))
  .handler(async ({ data }) => {
    const normalized = normalizePhone(data.phone);
    if (!normalized) return { ok: false as const, error: "رقم الهاتف غير صالح" };
    const email = phoneToEmail(normalized);
    const password = await derivePassword(normalized);
    const session = await signInWithDerived(email, password);
    if (!session) return { ok: false as const, error: "لا يوجد حساب بهذا الرقم، أنشئ حساباً جديداً" };
    return { ok: true as const, session };
  });
