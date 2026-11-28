/**
 * Store-owner side of the order lifecycle (بقية المتاجر + العامة).
 * Once the owner/admin (or the store) approved an order it must stay visible
 * to the store as «بانتظار التسليم» until the driver confirms delivery.
 */

/** Statuses between approval and the driver's «تم التسليم». */
export const AWAITING_DELIVERY_STATUSES = [
  "accepted",
  "searching_driver",
  "preparing",
  "ready",
  "driver_assigned",
  "picked_up",
  "on_the_way",
] as const;

const BASE_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  delivered: "تم التسليم",
  rejected: "مرفوض",
  cancelled: "ملغي",
  missed: "فاتك الطلب",
};

/** Label shown on the store owner's order card. */
export function merchantOrderLabel(status: string): string {
  if ((AWAITING_DELIVERY_STATUSES as readonly string[]).includes(status)) return "بانتظار التسليم";
  return BASE_LABEL[status] ?? status;
}

/**
 * Current statuses from which the store may move an order to `next`.
 * `null` = no restriction. A stale ringing card must never overwrite an order
 * the owner already approved (that pulled it out of the active lists).
 */
export function merchantAllowedFrom(next: string): string[] | null {
  if (next === "missed") return ["pending"];
  if (next === "rejected" || next === "searching_driver") return ["pending", "missed"];
  return null;
}
