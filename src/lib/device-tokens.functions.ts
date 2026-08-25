import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registerSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  role: z.enum(["merchant", "driver", "customer", "admin", "taxi"]),
});

export const registerDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // "taxi" is not an app_role — it is granted by the admin through the
    // taxi_drivers table, so never take the client's word for it. Taxi pushes
    // carry the customer's address and phone.
    if (data.role === "taxi") {
      const { data: isTaxi } = await context.supabase.rpc("is_taxi_driver", {
        _user_id: context.userId,
      });
      if (isTaxi !== true) throw new Error("Forbidden");
    }
    // Move token off any previous owner (device re-used), then upsert.
    await supabaseAdmin
      .from("device_tokens")
      .delete()
      .eq("token", data.token)
      .neq("user_id", context.userId);
    const { error } = await supabaseAdmin.from("device_tokens").upsert(
      {
        user_id: context.userId,
        token: data.token,
        platform: data.platform,
        role: data.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const removeSchema = z.object({ token: z.string().min(10).max(500) });

export const removeDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => removeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("device_tokens")
      .delete()
      .eq("token", data.token)
      .eq("user_id", context.userId);
    return { ok: true };
  });
