import { describe, it, expect } from "bun:test";
import { FINISHED_ORDER_STATUSES, isFinishedOrder, retainedOrderCache } from "./order-deletion";

describe("finished order deletion", () => {
  it("allows only delivered, rejected and cancelled orders", () => {
    expect([...FINISHED_ORDER_STATUSES]).toEqual(["delivered", "rejected", "cancelled"]);
    for (const status of FINISHED_ORDER_STATUSES) expect(isFinishedOrder(status)).toBe(true);
  });
  it("blocks pending and every active status", () => {
    for (const status of ["pending", "accepted", "preparing", "ready", "searching_driver", "driver_assigned", "picked_up", "on_the_way", "unknown"]) {
      expect(isFinishedOrder(status)).toBe(false);
    }
  });
  it("removes only missing saved orders and keeps other server orders", () => {
    const orders = [{ id: "deleted", status: "delivered", remote: true }, { id: "other", status: "delivered", remote: true }];
    expect(retainedOrderCache(orders, new Set(["other"]))).toEqual([orders[1]]);
  });
  it("does not resurrect a deleted finished legacy cache after reopening", () => {
    expect(retainedOrderCache([{ id: "old", status: "cancelled" }], new Set())).toEqual([]);
  });
  it("preserves a new local submission still being saved", () => {
    const order = { id: "new", status: "pending" };
    expect(retainedOrderCache([order], new Set(), new Set(["new"]))).toEqual([order]);
  });
  it("removes a deleted legacy cache even if its last local status was active", () => {
    expect(retainedOrderCache([{ id: "stale", status: "accepted" }], new Set())).toEqual([]);
  });
});