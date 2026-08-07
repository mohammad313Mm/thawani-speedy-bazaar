import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Search, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { CategoryCard } from "../components/CategoryCard";
import { BannerCarousel } from "../components/BannerCarousel";
import { CATEGORIES, STORES, PRODUCTS } from "../lib/data";
import { formatIQD } from "../lib/format";
import splashLogo from "@/assets/splash-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const WELCOME_MESSAGES = [
  "كل ما تحتاجه... مع ثواني.",
  "مرحباً بك في ثواني.",
  "كل احتياجات عائلتك... في مكان واحد.",
  "ابدأ تجربة تسوق أسرع.",
  "اكتشف أفضل المتاجر القريبة منك.",
];

function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const [message, setMessage] = useState(WELCOME_MESSAGES[0]);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMessage(WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]);
    const t1 = setTimeout(() => setFading(true), 2800);
    const t2 = setTimeout(onDone, 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);


  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary text-primary-foreground transition-opacity duration-700 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-scale-in flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-ring rounded-3xl" />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white/15 backdrop-blur-xl shadow-glow sm:h-40 sm:w-40">
            <img
              src={splashLogo.url}
              alt="شعار ثواني"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight">ثواني</h1>
          <p className="mt-3 max-w-xs text-sm font-medium opacity-90 animate-fade-in-slow">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ar`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.city || a.town || a.village || a.state,
      a.suburb || a.neighbourhood || a.city_district || a.county,
    ].filter(Boolean);
    return parts.join(" — ") || data.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}

type LocStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

type SavedLocation = {
  label: string;
  lat: number;
  lng: number;
  savedAt: string;
};

const LOC_STORAGE_KEY = "thawani-location";

function loadSavedLocation(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(LOC_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLocation;
  } catch {
    return null;
  }
}

function saveLocation(loc: SavedLocation) {
  try {
    localStorage.setItem(LOC_STORAGE_KEY, JSON.stringify(loc));
  } catch {}
}

function LocationCard({
  location,
  onLocation,
}: {
  location: string | null;
  onLocation: (loc: string) => void;
}) {
  const [status, setStatus] = useState<LocStatus>("idle");

  const handleGetLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      alert("هاتفك لا يدعم تحديد الموقع");
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log("تم جلب الموقع بنجاح:", lat, lng);
        const label = await reverseGeocode(lat, lng);
        saveLocation({ label, lat, lng, savedAt: new Date().toISOString() });
        onLocation(label);
        setStatus("granted");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح/التطبيق.");
          setStatus("denied");
        } else if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          alert("تعذر الحصول على موقع دقيق. تأكد من تفعيل GPS ومن وجود إشارة واضحة.");
          setStatus("error");
        } else {
          alert("حدث خطأ أثناء تحديد الموقع. حاول مرة أخرى.");
          setStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [onLocation]);

  const message =
    status === "denied"
      ? "تم رفض إذن الموقع. يرجى تفعيل خدمة الموقع (GPS) في هاتفك ليتم تحديده فوراً."
      : status === "unsupported"
      ? "هاتفك لا يدعم تحديد الموقع."
      : status === "error"
      ? "تعذر تحديد الموقع. حاول مرة أخرى أو تأكد من تفعيل GPS."
      : null;

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
              {location ?? "لم يتم تحديد الموقع بعد"}
            </p>
          </div>
        </div>
        <button
          onClick={handleGetLocation}
          disabled={status === "requesting"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-elegant transition-all active:scale-95 disabled:opacity-70"
        >
          {status === "requesting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {status === "requesting" ? "جاري التحديد..." : "تحديد موقعي"}
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded-xl bg-muted/60 p-2.5 text-xs font-medium text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}

function SearchResults({ query }: { query: string }) {
  const q = query.toLowerCase();
  const stores = STORES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      s.description.toLowerCase().includes(q),
  ).slice(0, 6);
  const products = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  ).slice(0, 8);
  const cats = CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
  const empty = stores.length + products.length + cats.length === 0;

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
            {cats.map((c) => (
              <Link
                key={c.key}
                to="/category/$key"
                params={{ key: c.key }}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/80"
              >
                <span>{c.icon}</span>
                {c.name}
              </Link>
            ))}
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
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
                >
                  <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-primary">
                    {formatIQD(p.discountPrice ?? p.price)}
                  </span>
                </Link>
              </li>
            ))}
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
    if (typeof sessionStorage === "undefined") return;
    const seen = sessionStorage.getItem("thawani-splash");
    if (seen) setShowSplash(false);
    const saved = loadSavedLocation();
    if (saved) setLocation(saved.label);
  }, []);

  const finishSplash = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem("thawani-splash", "1");
    } catch {}
    // request fresh location after splash
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const label = await reverseGeocode(lat, lng);
          saveLocation({ label, lat, lng, savedAt: new Date().toISOString() });
          setLocation(label);
        },
        () => {
          const saved = loadSavedLocation();
          if (saved) setLocation(saved.label);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  };

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
            مرحباً بك في ثواني
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
