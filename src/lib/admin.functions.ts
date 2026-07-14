import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_PASSWORD = "09244443Mm";

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
    if (data.password !== ADMIN_PASSWORD) {
      throw new Error("Unauthorized");
    }
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
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: updated.user_id, role })
        .select();
      await supabaseAdmin
        .from("profiles")
        .update({ status: "active" })
        .eq("id", updated.user_id);
    }

    return { ok: true };
  });
