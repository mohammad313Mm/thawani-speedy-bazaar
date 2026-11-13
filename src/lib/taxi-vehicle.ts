import { z } from "zod";

export const taxiVehicleTypeSchema = z.enum(["taxi", "tuktuk"], {
  message: "يرجى اختيار نوع المركبة",
});
export type TaxiVehicleType = z.infer<typeof taxiVehicleTypeSchema>;

export function taxiVehicleLabel(value: string | null | undefined): string {
  if (value === "taxi") return "تكسي";
  if (value === "tuktuk") return "تكتك";
  return "غير محدد";
}