// Single source of truth for delivery pricing.
// Used by BOTH the checkout UI (via the server quote) and order creation.

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance in KM -> delivery fee in IQD. Boundaries are exact. */
export function feeForDistance(km: number): number {
  if (km < 3) return 1000;
  if (km < 5) return 2000;
  if (km < 7) return 3000;
  if (km < 10) return 4000;
  if (km <= 12) return 5000;
  return 6000;
}

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export const STORE_NO_LOCATION_MSG =
  "لم يحدد المتجر موقعه على الخريطة بعد، لذلك لا يمكن احتساب أجور التوصيل. يرجى التواصل مع الدعم.";
