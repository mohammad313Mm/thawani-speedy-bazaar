import { Tag } from "lucide-react";
import { formatIQD } from "../lib/format";

/** "العروض" block shown under the original price in merchant and admin product forms. */
export function OfferFields({
  discount,
  onDiscount,
  active,
  onActive,
  error,
}: {
  discount: string;
  onDiscount: (v: string) => void;
  active: boolean;
  onActive: (v: boolean) => void;
  error?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-black text-foreground">
          <Tag className="h-3.5 w-3.5 text-primary" /> العروض
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="تفعيل العرض"
          onClick={() => onActive(!active)}
          className={`rounded-full px-3 py-1 text-[11px] font-black ${active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"}`}
        >
          {active ? "العرض مفعّل" : "العرض متوقف"}
        </button>
      </div>
      <label className="mt-2 block">
        <span className="text-[11px] font-bold text-muted-foreground">السعر بعد الخصم (د.ع)</span>
        <input
          value={discount}
          onChange={(e) => onDiscount(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="أقل من السعر الأصلي"
          className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </label>
      {error && <p className="mt-1 text-[11px] font-bold text-destructive">{error}</p>}
    </div>
  );
}

/** Original price struck through, discounted price underneath. */
export function OfferPrice({ price, discount, size = "sm" }: { price: number; discount?: number | null; size?: "sm" | "lg" }) {
  const fmt = formatIQD;
  const big = size === "lg" ? "text-2xl" : "text-sm";
  if (discount == null || discount >= price) {
    return <span className={`${big} font-black text-primary`}>{fmt(price)}</span>;
  }
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={`${size === "lg" ? "text-sm" : "text-[11px]"} font-semibold text-muted-foreground line-through decoration-2`}>{fmt(price)}</span>
      <span className={`${big} font-black text-destructive`}>{fmt(discount)}</span>
    </span>
  );
}
