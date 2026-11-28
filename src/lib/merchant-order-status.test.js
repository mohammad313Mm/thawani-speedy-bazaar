import { describe, it, expect } from "bun:test";
import { merchantOrderLabel, merchantAllowedFrom } from "./merchant-order-status";

describe("store owner order status", () => {
  it("shows «بانتظار التسليم» after owner approval until delivery", () => {
    for (const s of ["accepted", "searching_driver", "preparing", "ready", "driver_assigned"]) {
      expect(merchantOrderLabel(s)).toBe("بانتظار التسليم");
    }
  });
  it("shows «تم التسليم» only for delivered", () => {
    expect(merchantOrderLabel("delivered")).toBe("تم التسليم");
    expect(merchantOrderLabel("accepted")).not.toBe("تم التسليم");
    expect(merchantOrderLabel("pending")).toBe("قيد المراجعة");
  });
  it("never lets a stale card mark an approved order missed or rejected", () => {
    expect(merchantAllowedFrom("missed")).toEqual(["pending"]);
    expect(merchantAllowedFrom("rejected")).not.toContain("accepted");
    expect(merchantAllowedFrom("rejected")).not.toContain("driver_assigned");
    expect(merchantAllowedFrom("searching_driver")).toEqual(["pending", "missed"]);
    expect(merchantAllowedFrom("ready")).toBeNull();
  });
});
