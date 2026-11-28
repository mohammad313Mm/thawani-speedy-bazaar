import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ message_id: z.string().uuid() });

/**
 * Push for one support-chat message, sent to the *other* side of the thread:
 * a customer's message goes to the registered admin devices, an admin's reply
 * goes to that customer's devices. The chat itself still writes its rows
 * directly; this only fans out the existing FCM sender.
 */
export const notifySupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: msg } = await supabaseAdmin
      .from("support_chat_messages")
      .select("id,user_id,sender,body")
      .eq("id", data.message_id)
      .maybeSingle();
    if (!msg) return { ok: false, reason: "not_found" as const };

    const fromCustomer = msg.sender === "user";
    if (fromCustomer) {
      if (msg.user_id !== context.userId) throw new Error("Forbidden");
    } else if (msg.sender === "admin") {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (isAdmin !== true) throw new Error("Forbidden");
    } else {
      return { ok: false, reason: "not_notifiable" as const };
    }

    // Atomic claim: one message produces one push, however often this is called.
    const { data: claimed } = await supabaseAdmin
      .from("support_chat_messages")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", msg.id)
      .is("push_sent_at", null)
      .select("id");
    if (!claimed?.length) return { ok: true, reason: "already_sent" as const };

    try {
      // Never the author: an admin writing in their own thread gets nothing.
      const lookup = supabaseAdmin.from("device_tokens").select("token");
      const { data: rows, error: tokenError } = fromCustomer
        ? await lookup.eq("role", "admin").neq("user_id", msg.user_id)
        : await lookup.eq("user_id", msg.user_id).neq("user_id", context.userId);
      if (tokenError) throw new Error(`Token lookup failed: ${tokenError.message}`);
      const tokens = [...new Set((rows ?? []).map((t) => t.token as string))];
      if (!tokens.length) {
        console.warn("[support push] recipient has no registered devices", {
          message_id: msg.id,
          to: fromCustomer ? "admin" : "customer",
        });
        return { ok: true, reason: "no_devices" as const, sent: 0 };
      }

      const preview = msg.body.slice(0, 140);
      let title = "لديك رد جديد من دعم ثواني";
      let body = preview;
      if (fromCustomer) {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("full_name,phone")
          .eq("id", msg.user_id)
          .maybeSingle();
        title = "رسالة دعم جديدة";
        body = `${prof?.full_name || prof?.phone || "زبون"}: ${preview}`;
      }

      const { sendFcmToTokens } = await import("./fcm.server");
      const result = await sendFcmToTokens(tokens, {
        title,
        body,
        tag: `support-${msg.id}`,
        data: {
          kind: "support_chat",
          message_id: msg.id,
          thread_user_id: msg.user_id,
          route: fromCustomer ? "/admin" : "/support",
        },
      });
      // Counts only: never log tokens or message text.
      console.info("[support push] result", {
        message_id: msg.id,
        to: fromCustomer ? "admin" : "customer",
        targeted: tokens.length,
        sent: result.sent,
        failed: result.failed,
      });
      if (result.invalidTokens.length) {
        await supabaseAdmin.from("device_tokens").delete().in("token", result.invalidTokens);
      }
      return { ok: true, sent: result.sent, failed: result.failed };
    } catch (e) {
      // Release the claim so a retry can still deliver this message.
      await supabaseAdmin
        .from("support_chat_messages")
        .update({ push_sent_at: null })
        .eq("id", msg.id);
      console.error("[support push] failed", e);
      return { ok: false, reason: "send_failed" as const };
    }
  });
