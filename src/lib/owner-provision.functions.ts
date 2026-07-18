import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The single Owner phone. Kept server-side.
const OWNER_PHONE = "07800181794";
const OWNER_EMAIL = `${OWNER_PHONE}@thawani.app`;

const inputSchema = z.object({
  phone: z.string(),
  password: z.string().min(6),
});

/**
 * Ensures the Owner auth account exists. Called by the admin-login page
 * before signInWithPassword. If the Owner account is missing (first-time
 * setup), it is created with the provided password and granted the admin
 * role. If the account already exists, this function is a no-op — normal
 * password verification is enforced by Supabase Auth.
 *
 * Scoped strictly to the single Owner phone; any other phone is rejected.
 */
export const ensureOwnerAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.phone !== OWNER_PHONE) {
      return { ok: false, reason: "not_owner" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up existing user by generated email.
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL);

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: OWNER_EMAIL,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: "المالك", phone: OWNER_PHONE },
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? "create failed");
      userId = created.user.id;

      // Ensure profile row exists (trigger normally handles this; belt-and-braces).
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, full_name: "المالك", phone: OWNER_PHONE, status: "active" }, { onConflict: "id" });
    }

    // Ensure admin role is bound.
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true as const, created: !existing };
  });
