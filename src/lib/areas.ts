import { supabase } from "@/integrations/supabase/client";

export type BoundaryPoint = { lat: number; lng: number };

export type DeliveryArea = {
  id: string;
  name_ar: string;
  name_en: string | null;
  city: string | null;
  fee_iqd: number;
  min_order_iqd: number;
  is_active: boolean;
  boundary_points: BoundaryPoint[];
};

/** يحوّل قيمة jsonb المخزنة إلى مصفوفة نقاط صالحة. */
export function parseBoundary(value: unknown): BoundaryPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((p) => {
      const o = p as { lat?: unknown; lng?: unknown };
      return { lat: Number(o?.lat), lng: Number(o?.lng) };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** خوارزمية Ray casting: هل النقطة داخل المضلع؟ */
export function isPointInPolygon(point: BoundaryPoint, polygon: BoundaryPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.lng;
    const yi = polygon[i]!.lat;
    const xj = polygon[j]!.lng;
    const yj = polygon[j]!.lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** يعيد أول منطقة نشطة تقع النقطة داخل حدودها، أو null. */
export function findAreaForPoint(
  point: BoundaryPoint,
  areas: DeliveryArea[],
): DeliveryArea | null {
  return (
    areas.find((a) => a.is_active && isPointInPolygon(point, parseBoundary(a.boundary_points))) ??
    null
  );
}

/** يجلب المناطق النشطة التي لها حدود محفوظة. */
export async function fetchActiveAreas(): Promise<DeliveryArea[]> {
  const { data } = await supabase
    .from("delivery_areas")
    .select("id, name_ar, name_en, city, fee_iqd, min_order_iqd, is_active, boundary_points")
    .eq("is_active", true)
    .order("name_ar");
  return ((data ?? []) as unknown as DeliveryArea[]).map((a) => ({
    ...a,
    boundary_points: parseBoundary(a.boundary_points),
  }));
}
