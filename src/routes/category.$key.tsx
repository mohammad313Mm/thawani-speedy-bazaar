import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, SlidersHorizontal, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { storesByCategory } from "../lib/data";
import { StoreCard } from "../components/StoreCard";
import { useDbStores } from "../lib/db-stores";
import { useCategory } from "../lib/app-categories";
import { useMyArea } from "../lib/use-area";

export const Route = createFileRoute("/category/$key")({
  component: CategoryPage,
});

type Sort = "recommended" | "rating" | "nearest" | "fastest";

function CategoryPage() {
  const { key } = Route.useParams();
  const { area } = useMyArea();
  const { category, loading: catLoading } = useCategory(key, { areaId: area?.id });

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [openOnly, setOpenOnly] = useState(false);
  const { stores: dbStores, loading: storesLoading } = useDbStores();

  const stores = useMemo(() => {
    if (!category) return [];
    const dbForCat = dbStores.filter((s) => s.category === category.key);
    let list = [...dbForCat, ...storesByCategory(category.key)];
    if (q.trim()) {
      const s = q.trim();
      list = list.filter(
        (st) => st.name.includes(s) || st.tags.some((t) => t.includes(s)),
      );
    }
    if (openOnly) list = list.filter((s) => s.isOpen);
    switch (sort) {
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "nearest":
        list = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
        break;
      case "fastest":
        list = [...list].sort((a, b) => a.deliveryMin - b.deliveryMin);
        break;
    }
    return list;
  }, [category, q, sort, openOnly, dbStores]);

  if (!category) {
    if (catLoading) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-muted-foreground">
          جاري التحميل...
        </main>
      );
    }
    throw notFound();
  }


  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-base font-black text-foreground">
              {category.iconUrl ? (
                <img src={category.iconUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />
              ) : (
                <span>{category.icon}</span>
              )}
              {category.name}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {stores.length} متجر متاح
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`ابحث في ${category.name}...`}
              className="h-11 w-full rounded-2xl border border-border bg-card pr-11 pl-4 text-sm font-medium text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setOpenOnly((v) => !v)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                openOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              مفتوح الآن
            </button>
            {(
              [
                ["recommended", "الأكثر تناسباً"],
                ["rating", "الأعلى تقييماً"],
                ["nearest", "الأقرب"],
                ["fastest", "الأسرع توصيلاً"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  sort === k
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
            <button className="shrink-0 flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              فلاتر
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {(category.imageUrl || category.description) && (
          <section className="mb-4 overflow-hidden rounded-3xl bg-card shadow-soft">
            {category.imageUrl && (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="h-40 w-full object-cover sm:h-52"
              />
            )}
            {category.description && (
              <p className="p-4 text-sm font-medium leading-relaxed text-muted-foreground">
                {category.description}
              </p>
            )}
          </section>
        )}
        {storesLoading && stores.length === 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl bg-card shadow-card">
                <div className="h-28 w-full animate-pulse bg-muted sm:h-32" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-4xl">
              🔎
            </div>
            <h3 className="text-lg font-bold">لا توجد متاجر مطابقة</h3>
            <p className="text-sm text-muted-foreground">
              جرّب تعديل البحث أو الفلاتر.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {stores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
