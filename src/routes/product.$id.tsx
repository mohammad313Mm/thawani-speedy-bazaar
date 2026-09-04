import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, Star, Clock, Heart, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { productById, storeById } from "../lib/data";
import { formatIQD, formatMinutes } from "../lib/format";
import { useCart } from "../lib/cart";
import { useDbProductsByIds, useDbStore } from "../lib/db-stores";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const staticProduct = productById(id);
  const { products: dbProducts, loading } = useDbProductsByIds(staticProduct ? [] : [id]);
  const product = staticProduct ?? dbProducts[0] ?? null;
  const { store: dbStore } = useDbStore(
    product && !storeById(product.storeId) ? product.storeId : "",
  );
  const store = product ? (storeById(product.storeId) ?? dbStore) : null;

  const { addItem, favorites, toggleFavorite } = useCart();
  const fav = product ? favorites.includes(product.id) : false;

  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const basePrice = (product?.discountPrice ?? product?.price) ?? 0;
  const extras = useMemo(() => {
    let sum = 0;
    for (const opt of product?.options ?? []) {
      const chosen = selectedOptions[opt.name];
      if (chosen) {
        const choice = opt.choices.find((c) => c.name === chosen);
        if (choice) sum += choice.price;
      }
    }
    return sum;
  }, [product, selectedOptions]);

  const total = (basePrice + extras) * qty;

  const canAdd =
    Boolean(product?.available) &&
    (product?.options ?? []).filter((o) => o.required).every((o) => selectedOptions[o.name]);

  if (!product) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        {loading ? (
          <div className="mx-auto h-40 w-full animate-pulse rounded-2xl bg-muted" />
        ) : (
          <>
            <h1 className="text-lg font-black">المنتج غير متوفر</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              قد يكون المنتج محذوفًا أو خارج منطقتك.
            </p>
            <Link
              to="/"
              className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              العودة للرئيسية
            </Link>
          </>
        )}
      </main>
    );
  }

  return (
    <>
      <div className="relative h-72 overflow-hidden bg-muted">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="safe-top absolute top-0 right-0 left-0 flex items-center justify-between p-4">
          <button
            onClick={() => router.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant"
          >
            <ArrowRight className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(product.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant"
            >
              <Heart
                className={`h-5 w-5 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
              />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant">
              <Share2 className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-40">
        {!product.available && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm font-black text-destructive">
            المنتج غير متوفر حاليًا
          </div>
        )}
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">{product.name}</h1>
            {store && (
              <Link
                to="/store/$id"
                params={{ id: store.id }}
                className="mt-1 inline-block text-xs font-bold text-primary"
              >
                من متجر {store.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm font-bold">
            <Star className="h-4 w-4 fill-accent text-accent" />
            {product.rating}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-2xl font-black text-primary">{formatIQD(basePrice)}</span>
          {product.discountPrice && (
            <span className="text-sm font-semibold text-muted-foreground line-through">
              {formatIQD(product.price)}
            </span>
          )}
          <span className="mr-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {formatMinutes(product.prepMin)}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {(product.options ?? []).map((opt) => (
          <section key={opt.name} className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">{opt.name}</h3>
              <span
                className={`text-[11px] font-semibold ${
                  opt.required ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {opt.required ? "مطلوب" : "اختياري"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {opt.choices.map((c) => {
                const selected = selectedOptions[opt.name] === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() =>
                      setSelectedOptions((s) => ({
                        ...s,
                        [opt.name]: selected && !opt.required ? "" : c.name,
                      }))
                    }
                    className={`flex items-center justify-between rounded-2xl border p-3 text-right transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-sm font-bold text-foreground">{c.name}</span>
                    {c.price > 0 && (
                      <span className="text-xs font-bold text-primary">
                        +{formatIQD(c.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-black text-foreground">ملاحظات خاصة</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أضف ملاحظاتك للطاهي..."
            className="h-24 w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
          />
        </section>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-nav-offset left-0 right-0 z-30 rounded-t-3xl border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 p-4">
          <div className="flex items-center gap-2 rounded-full bg-muted p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-black">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            disabled={!canAdd}
            onClick={() => {
              addItem(product, qty);
              router.history.back();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-elegant transition-transform active:scale-95 disabled:opacity-50"
          >
            <span>أضف إلى السلة</span>
            <span className="opacity-80">•</span>
            <span>{formatIQD(total)}</span>
          </button>
        </div>
      </div>
    </>
  );
}
