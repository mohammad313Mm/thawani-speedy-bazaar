import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, ChevronLeft } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { CategoryCard } from "../components/CategoryCard";
import { BannerCarousel } from "../components/BannerCarousel";
import { CATEGORIES } from "../lib/data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const WELCOME_MESSAGES = [
  "كل ما تحتاجه... مع الصافي.",
  "مرحباً بك في الصافي.",
  "كل احتياجات عائلتك... في مكان واحد.",
  "ابدأ تجربة تسوق أسرع.",
  "اكتشف أفضل المتاجر القريبة منك.",
];

function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const message = useMemo(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
    [],
  );
  const [fading, setFading] = useState(false);

  useEffect(() => {
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
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-xl shadow-glow">
            <span className="text-6xl font-black">ث</span>
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

function LocationPrompt({ onLocation }: { onLocation: (loc: string) => void }) {
  const [status, setStatus] = useState<"idle" | "requesting" | "denied">("idle");

  const request = () => {
    if (!("geolocation" in navigator)) {
      onLocation("بابل — الهاشمية");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      () => {
        onLocation("بابل — الهاشمية");
      },
      () => setStatus("denied"),
      { timeout: 6000 },
    );
  };

  if (status === "denied") {
    return (
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-sm font-semibold text-foreground">
          يرجى تفعيل الموقع للحصول على أقرب المتاجر.
        </p>
        <button
          onClick={request}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-elegant"
        >
          <MapPin className="h-4 w-4" /> تفعيل الموقع
        </button>
      </div>
    );
  }
  return null;
}

function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [location, setLocation] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const seen = sessionStorage.getItem("thawani-splash");
    if (seen) setShowSplash(false);
  }, []);

  const finishSplash = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem("thawani-splash", "1");
    } catch {}
    // request location after splash
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocation("بابل — الهاشمية"),
        () => setLocation(null),
        { timeout: 6000 },
      );
    } else {
      setLocation("بابل — الهاشمية");
    }
  };

  useEffect(() => {
    if (!showSplash && location === null) {
      // best-effort ask on subsequent visits
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => setLocation("بابل — الهاشمية"),
          () => {},
          { timeout: 4000 },
        );
      }
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
              placeholder="ابحث عن مطعم، مخبز، كوزمتك، مواد إنشائية..."
              className="h-14 w-full rounded-2xl border border-border bg-card pr-12 pl-4 text-sm font-medium text-foreground shadow-soft outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-elegant"
            />
          </div>
        </div>

        {!location && <LocationPrompt onLocation={setLocation} />}

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
