export const FINISHED_ORDER_STATUSES = ["delivered", "rejected", "cancelled"] as const;

export function isFinishedOrder(status: string): boolean {
  return FINISHED_ORDER_STATUSES.some((value) => value === status);
}

/** Keep only server-backed orders and local submissions still in flight. */
export function retainedOrderCache<T extends { id: string }>(
  cached: T[],
  serverIds: Set<string>,
  inFlightIds: Set<string> = new Set(),
): T[] {
  return cached.filter((order) => serverIds.has(order.id) || inFlightIds.has(order.id));
}