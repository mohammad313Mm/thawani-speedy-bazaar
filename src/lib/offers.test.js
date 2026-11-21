import { describe, it, expect } from "bun:test";
import { effectivePrice, validateOffer, hasActiveOffer } from "./offers";

describe("offers", () => {
  it("charges the discount price when the offer is active", () => {
    expect(effectivePrice({ price_iqd: 5000, discount_price_iqd: 4000, discount_active: true })).toBe(4000);
  });
  it("keeps the original price when the offer is off", () => {
    expect(effectivePrice({ price_iqd: 5000, discount_price_iqd: 4000, discount_active: false })).toBe(5000);
  });
  it("rejects a discount equal to the original price", () => {
    expect(validateOffer(5000, 5000, true)).not.toBeNull();
  });
  it("rejects a discount above the original price", () => {
    expect(validateOffer(5000, 6000, true)).not.toBeNull();
  });
  it("requires a discount price to activate", () => {
    expect(validateOffer(5000, null, true)).not.toBeNull();
  });
  it("ignores an invalid stored discount", () => {
    expect(hasActiveOffer({ price_iqd: 5000, discount_price_iqd: 5000, discount_active: true })).toBe(false);
  });
});
