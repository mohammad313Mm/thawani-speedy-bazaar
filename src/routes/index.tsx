import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Search, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { CategoryCard } from "../components/CategoryCard";
import { BannerCarousel } from "../components/BannerCarousel";
import { LocationPermissionDialog } from "../components/LocationPermissionDialog";
import { CATEGORIES, STORES, PRODUCTS } from "../lib/data";
import { formatIQD } from "../lib/format";
import { prefetchDbStores, useDbStores, useDbProductSearch } from "../lib/db-stores";
import { loadSavedLocation } from "../lib/geo";
import { useLocationPicker } from "../lib/use-location";

import splashLogo from "@/assets/splash-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const SPLASH_TEXT = "كل ما تحتاجه.. مع ثواني";
const SPLASH_DURATION = 3000; // 3 seconds total
const FADE_START = 2500; // start fading at 2.5s

function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let doneTimer = 0;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (elapsed >= FADE_START && !fading) {
        setFading(true);
      }

      if (elapsed < SPLASH_DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        doneTimer = window.setTimeout(onDone, 350);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(doneTimer);
    };
  }, [onDone, fading]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-scale-in flex w-full max-w-sm flex-col items-center gap-5 px-6">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-ring rounded-3xl" />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white/15 backdrop-blur-xl shadow-glow">
            <img
              src={splashLogo.url}
              alt="شعار ثواني"
              className="h-full w-full object-contain p-3"
            />
          </div>
        </div>
        <p className="w-full text-center text-base font-bold text-primary-foreground">
          {SPLASH_TEXT}
        </p>
      </div>
    </div>
  );
}

// location helpers live in ../lib/geo



function LocationCard({
  location,
  onLocation,
}: {
  location: string | null;
  onLocation: (loc: string) => void;
}) {
  const geo = useLocationPicker(onLocation);
  const shown = geo.label ?? location;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">موقع التوصيل</p>
            <p className="truncate text-sm font-bold text-foreground">
              {shown ?? "لم يتم تحديد الموقع بعد"}
            </p>
          </div>
        </div>
        <button
          onClick={geo.openDialog}
          disabled={geo.status === "requesting"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-elegant transition-all active:scale-95 disabled:opacity-70"
        >
          {geo.status === "requesting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {geo.status === "requesting" ? "جاري التحديد..." : "تحديد موقعي"}
        </button>
      </div>
      <LocationPermissionDialog
        open={geo.dialogOpen}
        onOpenChange={(open) => !open && geo.cancel()}
        onConfirm={geo.confirm}
        onCancel={geo.cancel}
        hint={geo.hint}
        busy={geo.busy}
        showSettings={geo.isNative}
        onOpenSettings={geo.openSettings}
      />

    </div>
  );
}


function SearchResults({ query }: { query: string }) {
  const q = query.toLowerCase();
  const { stores: dbStores } = useDbStores();
  const { products: dbProducts, loading: productsLoading } = useDbProductSearch(query);

  const allStores = [...dbStores, ...STORES.filter((s) => !dbStores.some((d) => d.id === s.id))];
  const stores = allStores
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q),
    )
    .slice(0, 6);
  const staticProducts = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
  const products = [
    ...dbProducts,
    ...staticProducts.filter((p) => !dbProducts.some((d) => d.id === p.id)),
  ].slice(0, 12);
  const cats = CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
  const empty = !productsLoading && stores.length + products.length + cats.length === 0;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant animate-fade-in">
      {empty && (
        <div className="p-6 text-center text-sm font-semibold text-muted-foreground">
          لا توجد نتائج مطابقة لـ "{query}"
        </div>
      )}
      {cats.length > 0 && (
        <div className="border-b border-border/60 p-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">الأقسام</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) =>
              c.key === "freelance" ? (
                <Link
                  key={c.key}
                  to="/freelance-agent"
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/80"
                >
                  <span>{c.icon}</span>
                  {c.name}
                </Link>
              ) : (
                <Link
                  key={c.key}
                  to="/category/$key"
                  params={{ key: c.key }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/80"
                >
                  <span>{c.icon}</span>
                  {c.name}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
      {stores.length > 0 && (
        <div className="border-b border-border/60 p-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">المتاجر</p>
          <ul className="space-y-2">
            {stores.map((s) => (
              <li key={s.id}>
                <Link
                  to="/store/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
                >
                  <img src={s.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.tags.join(" • ")}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-primary">
                    {s.isOpen ? "مفتوح" : "مغلق"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {products.length > 0 && (
        <div className="p-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">المنتجات</p>
          <ul className="space-y-2">
            {products.map((p) => {
              const isDb = dbProducts.some((d) => d.id === p.id);
              const storeLabel = (p as { storeName?: string }).storeName;
              return (
              <li key={p.id}>
                <Link
                  {...(isDb
                    ? { to: "/store/$id" as const, params: { id: p.storeId } }
                    : { to: "/product/$id" as const, params: { id: p.id } })}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
                >
                  <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {storeLabel || p.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-primary">
                    {formatIQD(p.discountPrice ?? p.price)}
                  </span>
                </Link>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}



function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [location, setLocation] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Warm the stores cache immediately so category pages open instantly.
    void prefetchDbStores();
    if (typeof sessionStorage === "undefined") return;
    const seen = sessionStorage.getItem("thawani-splash");
    if (seen) setShowSplash(false);
    const saved = loadSavedLocation();
    if (saved) setLocation(saved.label);
  }, []);


  const finishSplash = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem("thawani-splash", "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!showSplash && location === null) {
      const saved = loadSavedLocation();
      if (saved) setLocation(saved.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSplash]);

  return (
    <>
      {showSplash && <WelcomeSplash onDone={finishSplash} />}

      <AppHeader location={location ?? "حدد موقعك"} />

      <main className="mx-auto max-w-2xl px-4 pb-8">
        {/* Welcome message */}
        <div className="mt-4 animate-fade-in">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            مرحباً بك في{" "}
            <span className="text-orange-500">ثواني</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            اكتشف كل ما تحتاجه من متاجر قريبة منك.
          </p>
        </div>

        {/* Search */}
        <div className="mt-4 animate-fade-in">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن متجر، مطعم، بقالة، كوزمتك، حلويات، منتج..."
              className="h-14 w-full rounded-2xl border border-border bg-card pr-12 pl-4 text-sm font-medium text-foreground shadow-soft outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-elegant"
            />
          </div>
          {search.trim().length > 0 && <SearchResults query={search.trim()} />}
        </div>

        <LocationCard location={location} onLocation={setLocation} />

        {/* Banners */}
        <section className="mt-6 animate-slide-up">
          <BannerCarousel />
        </section>

        {/* Categories */}
        <section className="mt-8 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-foreground">الأقسام الرئيسية</h3>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              الكل <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <CategoryCard key={c.key} category={c} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
