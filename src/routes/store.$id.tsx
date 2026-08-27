import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star, Heart, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { productsByStore, storeById } from "../lib/data";
import { formatIQD } from "../lib/format";

import { ProductCard } from "../components/ProductCard";
import { useCart } from "../lib/cart";
import { useDbStore, useDbProducts } from "../lib/db-stores";

export const Route = createFileRoute("/store/$id")({
  component: StorePage,
});

function StorePage() {
  const { id } = Route.useParams();
  const staticStore = storeById(id);
  const { store: dbStore, loading: dbLoading } = useDbStore(staticStore ? "" : id);
  const { products: dbProducts, loading: productsLoading } = useDbProducts(staticStore ? "" : id);
  const store = staticStore ?? dbStore;

  const products = useMemo(() => {
    if (!store) return [];
    return staticStore ? productsByStore(store.id) : dbProducts;
  }, [store, staticStore, dbProducts]);
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products],
  );
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter((p) => p.category === activeCat);
    if (q.trim()) list = list.filter((p) => p.name.includes(q.trim()));
    return list;
  }, [products, activeCat, q]);

  const { favStores, toggleFavStore, itemCount, subtotal } = useCart();

  if (!store) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
        {dbLoading ? (
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <>
            <p className="text-lg font-black">المتجر غير موجود</p>
            <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">
              العودة للرئيسية
            </Link>
          </>
        )}
      </main>
    );
  }

  const fav = favStores.includes(store.id);

  return (
    <>
      {/* Cover */}
      <div className="relative h-64 overflow-hidden sm:h-72">
        <img
          src={store.cover}
          alt={store.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-black/10" />

        {/* Top actions */}
        <div className="absolute top-0 right-0 left-0 flex items-center justify-between p-4">
          <Link
            to="/category/$key"
            params={{ key: store.category }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant backdrop-blur"
          >
            <ArrowRight className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavStore(store.id)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant backdrop-blur"
            >
              <Heart
                className={`h-5 w-5 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
              />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-elegant backdrop-blur">
              <Share2 className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Store identity */}
      <div className="relative z-10 mx-auto -mt-14 flex max-w-2xl flex-col items-center px-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-background shadow-elegant sm:h-32 sm:w-32">
          <img
            src={store.logo}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Info card */}
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="rounded-3xl bg-card p-6 shadow-elegant">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-black text-foreground sm:text-2xl">
              {store.name}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {store.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                {store.rating}
              </div>
              {store.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>



        </div>
      </div>

      {/* Search + category tabs */}
      <div className="sticky top-0 z-20 mt-6 border-y border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في القائمة..."
            className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm font-medium outline-none focus:border-primary"
          />
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCat("all")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                activeCat === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  activeCat === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="mx-auto max-w-2xl px-4 py-4 pb-32">
        {productsLoading && filtered.length === 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-2xl bg-card p-3 shadow-card"
              >
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-muted" />
                <div className="flex flex-1 flex-col gap-2 py-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="mt-auto h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">
              🛒
            </div>
            <h3 className="text-base font-black text-foreground">
              لا توجد منتجات متاحة حالياً
            </h3>
            <p className="text-xs text-muted-foreground">
              سيتم عرض المنتجات هنا فور إضافتها من قِبل المتجر.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      {/* Cart floating bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-nav-offset left-0 right-0 z-30 px-3 sm:px-4">
          <Link
            to="/cart"
            className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-elegant animate-slide-up"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-black">
              {itemCount}
            </span>
            <span className="text-sm font-bold">عرض السلة</span>
            <span className="text-sm font-black">{formatIQD(subtotal)}</span>
          </Link>
        </div>
      )}
    </>
  );
}
