export type StoreOrderGroup<T> = {
  storeId: string;
  orders: T[];
};

/**
 * Group order rows under the store they belong to (data comes from the database,
 * never from static text). Incoming order is preserved for both the groups and
 * the orders inside each group, so the newest store and the newest order stay first.
 */
export function groupOrdersByStore<T extends { store_id: string }>(orders: T[]): StoreOrderGroup<T>[] {
  const groups: StoreOrderGroup<T>[] = [];
  const position = new Map<string, number>();

  for (const order of orders) {
    const at = position.get(order.store_id);
    if (at === undefined) {
      position.set(order.store_id, groups.length);
      groups.push({ storeId: order.store_id, orders: [order] });
      continue;
    }
    const group = groups[at];
    if (group) group.orders.push(order);
  }

  return groups;
}
