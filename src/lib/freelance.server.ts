// Server-only helpers for freelance ("مندوب حر") orders. Reuses the existing
// FCM sender and the same payloads as before — no new notification system.
import type { SupabaseClient } from "@supabase/supabase-js";

export const FREELANCE_STORE_NAME = "مندوب حر";

type FreelanceOrder = {
  id: string;
  local_order_id: string | null;
  address: string;
  notes: string | null;
  total: number;
  area_id: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any>;

export async function isFreelanceOrder(db: Admin, orderId: string): Promise<FreelanceOrder | null> {
  const { data } = await db
    .from("customer_orders")
    .select("id, local_order_id, address, notes, total, area_id, status, stores(name)")
    .eq("id", orderId)
    .maybeSingle();
  const row = data as (FreelanceOrder & { status: string; stores: { name: string } | null }) | null;
  if (!row || row.status !== "pending" || row.stores?.name !== FREELANCE_STORE_NAME) return null;
  return row;
}

// Same admin push as regular new orders in placeOrder.
export async function notifyAdminsNewFreelanceOrder(
  db: Admin,
  o: { id: string; localId: string; address: string },
) {
  const { data: tokens } = await db.from("device_tokens").select("token").eq("role", "admin");
  const list = (tokens ?? []).map((t: { token: string }) => t.token);
  if (!list.length) return { sent: 0 };
  const { sendFcmToTokens } = await import("./fcm.server");
  const orderNum = o.localId.slice(-6).toUpperCase();
  const result = await sendFcmToTokens(list, {
    title: "طلب جديد",
    body: [`العنوان: ${o.address}`, `الإجمالي: 2000 د.ع`, "مندوب حر"].join("\n"),
    tag: `order-${o.id}`,
    data: { order_id: o.id, order_num: orderNum, route: "/admin", kind: "store_order" },
  });
  if (result.invalidTokens.length) {
    await db.from("device_tokens").delete().in("token", result.invalidTokens);
  }
  return { sent: list.length - result.invalidTokens.length };
}

// Same driver push the freelance flow sent before approval was required.
export async function notifyDriversFreelanceOrder(db: Admin, o: FreelanceOrder) {
  if (!o.area_id) return;
  const { data: areaDrivers } = await db.from("profiles").select("id").eq("area_id", o.area_id);
  const driverIds = (areaDrivers ?? []).map((p: { id: string }) => p.id);
  if (!driverIds.length) return;
  const { data: tokens } = await db
    .from("device_tokens")
    .select("token")
    .eq("role", "driver")
    .in("user_id", driverIds);
  const list = (tokens ?? []).map((t: { token: string }) => t.token);
  if (!list.length) return;
  const { sendFcmToTokens } = await import("./fcm.server");
  const details = o.notes ?? "";
  const result = await sendFcmToTokens(list, {
    title: "طلب مندوب حر جديد",
    body: [
      `الطلب: ${details.slice(0, 80)}`,
      `العنوان: ${o.address}`,
      `الإجمالي: ${o.total.toLocaleString("ar-IQ")} د.ع`,
    ].join("\n"),
    tag: `order-${o.id}`,
    data: {
      order_id: o.id,
      order_num: o.local_order_id ?? o.id,
      store_name: FREELANCE_STORE_NAME,
      address: o.address,
      total: String(o.total),
      route: "/driver/dashboard",
      kind: "driver_order",
    },
  });
  if (result.invalidTokens.length) {
    await db.from("device_tokens").delete().in("token", result.invalidTokens);
  }
}
