import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useCart } from "../lib/cart";
import { storeById, type Store } from "../lib/data";
import { StoreCard } from "../components/StoreCard";
import { ProductCard } from "../components/ProductCard";
import { useDbStores, useDbProductsByIds } from "../lib/db-stores";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favStores, favorites } = useCart();
  const [tab, setTab] = useState<"stores" | "products">("stores");
  const { stores: dbStores } = useDbStores();

  const stores: Store[] = favStores
    .map((id) => storeById(id) ?? dbStores.find((s) => s.id === id) ?? null)
    .filter((s): s is Store => Boolean(s));
  const products = favorites.map((id) => productById(id)).filter(Boolean);

  return (
    <>
      <header className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-2xl font-black text-foreground">المفضلة</h1>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab("stores")}
            className={`flex-1 rounded-full py-2 text-xs font-bold ${
              tab === "stores"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            المتاجر ({stores.length})
          </button>
          <button
            onClick={() => setTab("products")}
            className={`flex-1 rounded-full py-2 text-xs font-bold ${
              tab === "products"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            المنتجات ({products.length})
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {tab === "stores" &&
          (stores.length === 0 ? (
            <Empty label="لم تضف أي متجر إلى المفضلة" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {stores.map((s) => (
                <StoreCard key={s.id} store={s} />
              ))}
            </div>
          ))}
        {tab === "products" &&
          (products.length === 0 ? (
            <Empty label="لم تضف أي منتج إلى المفضلة" />
          ) : (
            <div className="space-y-3">
              {products.map((p) => p && <ProductCard key={p.id} product={p} />)}
            </div>
          ))}
      </main>
    </>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted">
        <Heart className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-lg font-black">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        ابحث عن ما يعجبك واضغط على القلب لحفظه.
      </p>
      <Link
        to="/"
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
      >
        استكشف الآن
      </Link>
    </div>
  );
}
