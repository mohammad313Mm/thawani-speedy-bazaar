import { describe, expect, test } from "bun:test";
import { taxiVehicleLabel, taxiVehicleTypeSchema } from "./taxi-vehicle";

describe("taxi vehicle selection", () => {
  test("accepts exactly taxi and tuktuk", () => {
    expect(taxiVehicleTypeSchema.parse("taxi")).toBe("taxi");
    expect(taxiVehicleTypeSchema.parse("tuktuk")).toBe("tuktuk");
    expect(taxiVehicleTypeSchema.safeParse("bus").success).toBe(false);
  });
  test("requires a selection for new requests", () => {
    for (const value of [undefined, null, ""]) {
      expect(taxiVehicleTypeSchema.safeParse(value).success).toBe(false);
    }
  });
  test("keeps legacy requests readable without assigning a vehicle", () => {
    expect(taxiVehicleLabel(null)).toBe("غير محدد");
    expect(taxiVehicleLabel(undefined)).toBe("غير محدد");
  });
});