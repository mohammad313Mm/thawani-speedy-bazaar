// Shared "عروض ثواني" rules: one place decides the price a customer pays.
export type OfferFields = {
  price_iqd: number;
  discount_price_iqd?: number | null;
  discount_active?: boolean | null;
};

/** True only when the offer is switched on and its price is a real discount. */
export function hasActiveOffer(p: OfferFields): boolean {
  return (
    !!p.discount_active &&
    p.discount_price_iqd != null &&
    p.discount_price_iqd >= 0 &&
    p.discount_price_iqd < p.price_iqd
  );
}

/** The price charged for a product right now. */
export function effectivePrice(p: OfferFields): number {
  return hasActiveOffer(p) ? (p.discount_price_iqd as number) : p.price_iqd;
}

/** Returns an Arabic error message, or null when the offer input is valid. */
export function validateOffer(price: number, discount: number | null, active: boolean): string | null {
  if (!active && discount == null) return null;
  if (discount == null || !Number.isFinite(discount)) return active ? "أدخل سعر الخصم لتفعيل العرض" : null;
  if (discount < 0) return "سعر الخصم غير صالح";
  if (discount >= price) return "سعر الخصم يجب أن يكون أقل من السعر الأصلي";
  return null;
}
