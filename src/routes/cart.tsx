import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "../lib/cart";
import { storeById, type Store } from "../lib/data";
import { adaptDbStore, type DbStoreRow } from "../lib/db-stores";
import { supabase } from "../integrations/supabase/client";
import { formatIQD } from "../lib/format";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, storeId, updateQty, removeItem, clear, subtotal } = useCart();
  const staticStore = storeId ? storeById(storeId) : null;
  const [dbStore, setDbStore] = useState<Store | null>(null);
  useEffect(() => {
    if (!storeId || staticStore) {
      setDbStore(null);
      return;
    }
    let alive = true;
    supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setDbStore(data ? adaptDbStore(data as unknown as DbStoreRow) : null);
      });
    return () => {
      alive = false;
    };
  }, [storeId, staticStore]);
  const store = staticStore ?? dbStore;
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);

  const deliveryFee = store?.deliveryFee ?? 0;
  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const apply = () => {
    const c = coupon.trim().toUpperCase();
    if (!c) return;
    if (c === "THAWANI30") setApplied({ code: c, discount: Math.round(subtotal * 0.3) });
    else if (c === "FREE") setApplied({ code: c, discount: deliveryFee });
    else setApplied({ code: c, discount: 0 });
  };

  if (items.length === 0) {
    return (
      <>
        <header className="mx-auto max-w-2xl px-4 pt-6">
          <h1 className="text-2xl font-black text-foreground">السلة</h1>
        </header>
        <main className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-16 text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-14 w-14 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-black text-foreground">سلتك فارغة</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            ابدأ بإضافة منتجاتك المفضلة من المتاجر القريبة منك.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant"
          >
            استكشف المتاجر
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">السلة</h1>
          {store && <p className="text-xs text-muted-foreground">من {store.name}</p>}
        </div>

        <button
          onClick={clear}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
        >
          إفراغ السلة
        </button>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {items.map((it) => {
          const p = it.product;
          if (!p) return null;
          const price = p.discountPrice ?? p.price;
          return (
            <div
              key={it.productId}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
            >
              <img
                src={p.image}
                alt=""
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-bold text-foreground">{p.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatIQD(price)} × {it.quantity}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                    <button
                      onClick={() => updateQty(it.productId, it.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-card"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-black">{it.quantity}</span>
                    <button
                      onClick={() => updateQty(it.productId, it.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-card"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-black text-primary">
                    {formatIQD(price * it.quantity)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeItem(it.productId)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="أدخل كود الخصم"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-primary"
            />
            <button
              onClick={apply}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              تطبيق
            </button>
          </div>
          {applied && (
            <p
              className={`mt-2 text-xs font-bold ${
                applied.discount > 0 ? "text-success" : "text-destructive"
              }`}
            >
              {applied.discount > 0
                ? `تم تطبيق كود ${applied.code} — خصم ${formatIQD(applied.discount)}`
                : "الكود غير صالح"}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="space-y-2 text-sm">
            <Row label="المجموع الفرعي" value={formatIQD(subtotal)} />

            {discount > 0 && (
              <Row label="الخصم" value={`- ${formatIQD(discount)}`} accent />
            )}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between text-lg font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{formatIQD(total)}</span>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-nav-offset left-0 right-0 z-30 px-3 sm:px-4">
        <Link
          to="/checkout"
          className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-black text-primary-foreground shadow-elegant"
        >
          متابعة الطلب • {formatIQD(total)}
        </Link>
      </div>
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${accent ? "text-success" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
