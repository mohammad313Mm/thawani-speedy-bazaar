import { describe, it, expect } from "bun:test";
import { groupOrdersByStore } from "./admin-order-groups";

describe("admin finished orders grouped by store", () => {
  it("puts every order of the same store under one group", () => {
    const orders = [
      { id: "a", store_id: "s1" },
      { id: "b", store_id: "s2" },
      { id: "c", store_id: "s1" },
    ];
    const groups = groupOrdersByStore(orders);
    expect(groups.map((g) => g.storeId)).toEqual(["s1", "s2"]);
    expect(groups[0]?.orders.map((o) => o.id)).toEqual(["a", "c"]);
    expect(groups[1]?.orders.map((o) => o.id)).toEqual(["b"]);
  });

  it("keeps the newest store first and never repeats a store header", () => {
    const groups = groupOrdersByStore([
      { id: "1", store_id: "s3" },
      { id: "2", store_id: "s1" },
      { id: "3", store_id: "s3" },
      { id: "4", store_id: "s1" },
    ]);
    expect(groups.map((g) => g.storeId)).toEqual(["s3", "s1"]);
    expect(groups).toHaveLength(2);
  });

  it("returns no groups when there are no orders", () => {
    expect(groupOrdersByStore([])).toEqual([]);
  });
});
