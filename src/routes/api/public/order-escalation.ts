import { createFileRoute } from "@tanstack/react-router";

// Server-side escalation: orders that were notified to the store owner but are
// still "pending" 5 minutes later get escalated to the area owner (admin).
// Triggered every minute by a database cron job (pg_cron + pg_net), so it keeps
// working when the merchant/driver apps are closed. Idempotent: the row is
// claimed with a conditional UPDATE before any push is sent.

type OrderRow = {
  id: string;
  local_order_id: string | null;
  store_id: string;
  customer_name: string | null;
  total: number;
  status: string;
  area_id: string | null;
  created_at: string;
  notified_at: string | null;
  owner_escalation_sent_at: string | null;
};

export const Route = createFileRoute("/api/public/order-escalation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const { data: secretRow } = await supabaseAdmin
          .from("internal_job_secrets")
          .select("secret")
          .eq("name", "order_escalation")
          .maybeSingle();
        const expected = (secretRow as { secret?: string } | null)?.secret ?? "";
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const nowIso = new Date().toISOString();

        // Fetch candidates (latest state straight from the database).
        const { data: due } = await supabaseAdmin
          .from("customer_orders")
          .select("id")
          .eq("status", "pending")
          .eq("owner_escalation_sent", false)
          .not("escalation_due_at", "is", null)
          .lte("escalation_due_at", nowIso)
          .limit(50);

        let escalated = 0;

        for (const cand of (due ?? []) as { id: string }[]) {
          // Atomic claim — re-checks the freshest status and the idempotency
          // flag in the same statement, so two concurrent runs (or an accept
          // landing at the deadline) can never produce a second push.
          const { data: claimed } = await supabaseAdmin
            .from("customer_orders")
            .update({ owner_escalation_sent: true, owner_escalation_sent_at: nowIso })
            .eq("id", cand.id)
            .eq("status", "pending")
            .eq("owner_escalation_sent", false)
            .select(
              "id, local_order_id, store_id, customer_name, total, status, area_id, created_at, notified_at, owner_escalation_sent_at",
            )
            .maybeSingle();
          const order = claimed as OrderRow | null;
          if (!order) continue;

          const orderNum = (order.local_order_id ?? order.id).slice(-6).toUpperCase();

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("name")
            .eq("id", order.store_id)
            .maybeSingle();
          const storeName = (store as { name?: string } | null)?.name ?? "متجر";

          let areaName = "";
          if (order.area_id) {
            const { data: area } = await supabaseAdmin
              .from("delivery_areas")
              .select("name_ar")
              .eq("id", order.area_id)
              .maybeSingle();
            areaName = (area as { name_ar?: string } | null)?.name_ar ?? "";
          }

          const totalFmt = `${Math.round(order.total).toLocaleString("ar-IQ")} د.ع`;
          const bodyLines = [
            `الطلب رقم: ${orderNum}`,
            "لم تتم الموافقة على الطلب خلال 5 دقائق.",
            `المتجر: ${storeName}`,
            order.customer_name ? `الزبون: ${order.customer_name}` : null,
            areaName ? `المنطقة: ${areaName}` : null,
            `القيمة: ${totalFmt}`,
            `الحالة: ${order.status}`,
          ]
            .filter(Boolean)
            .join("\n");

          // In-app owner notification (existing admin notification channel).
          await supabaseAdmin.from("admin_notifications").insert({
            kind: "order_escalation",
            title: "طلب يحتاج إلى متابعة",
            body: bodyLines,
            ref_table: "customer_orders",
            ref_id: order.id,
            area_id: order.area_id,
          });

          // Push to the owner (admin) accounts of this order's area only.
          const { data: adminRoles } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");
          const adminIds = (adminRoles ?? []).map((r) => r.user_id as string);
          let ownerIds: string[] = [];
          if (adminIds.length) {
            if (order.area_id) {
              const { data: profs } = await supabaseAdmin
                .from("profiles")
                .select("id, area_id")
                .in("id", adminIds);
              ownerIds = (profs ?? [])
                .filter(
                  (p) =>
                    (p as { area_id: string | null }).area_id === order.area_id ||
                    (p as { area_id: string | null }).area_id === null,
                )
                .map((p) => p.id as string);
            } else {
              ownerIds = adminIds;
            }
          }

          if (ownerIds.length) {
            const { data: tokens } = await supabaseAdmin
              .from("device_tokens")
              .select("token")
              .in("user_id", ownerIds);
            const list = (tokens ?? []).map((t) => t.token as string);
            if (list.length) {
              const { sendFcmToTokens } = await import("@/lib/fcm.server");
              const result = await sendFcmToTokens(list, {
                title: "طلب يحتاج إلى متابعة",
                body: bodyLines,
                tag: `escalation-${order.id}`,
                data: {
                  order_id: order.id,
                  order_num: orderNum,
                  store_name: storeName,
                  area: areaName,
                  total: String(order.total),
                  order_status: order.status,
                  created_at: order.created_at,
                  notified_at: order.notified_at ?? "",
                  escalated_at: order.owner_escalation_sent_at ?? nowIso,
                  route: "/admin",
                  kind: "order_escalation",
                },
              });
              if (result.invalidTokens.length) {
                await supabaseAdmin
                  .from("device_tokens")
                  .delete()
                  .in("token", result.invalidTokens);
              }
            }
          }

          escalated++;
        }

        return Response.json({ ok: true, escalated });
      },
    },
  },
});
