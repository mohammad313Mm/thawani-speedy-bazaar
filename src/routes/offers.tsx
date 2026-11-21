import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { listAreaOffers } from "../lib/area.functions";
import { currentCoords } from "../lib/use-area";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "عروض ثواني — خصومات المتاجر في منطقتك" },
      { name: "description", content: "تصفّح المطاعم والمتاجر التي تقدّم خصومات فعّالة في منطقتك على ثواني." },
      { property: "og:title", content: "عروض ثواني" },
      { property: "og:description", content: "خصومات المطاعم والمتاجر في منطقتك على ثواني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OffersPage,
});

type OfferStore = Awaited<ReturnType<typeof listAreaOffers>>["stores"][number];

function OffersPage() {
  const [stores, setStores] = useState<OfferStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [noLocation, setNoLocation] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const coords = currentCoords();
      if (!coords) { if (alive) { setNoLocation(true); setLoading(false); } return; }
      try {
        const r = await listAreaOffers({ data: coords });
        if (alive) setStores(r.stores);
      } catch {
        if (alive) setStores([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const ch = supabase
      .channel(`offers_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted" aria-label="رجوع">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
          <Tag className="h-5 w-5 text-primary" /> عروض ثواني
        </h1>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm font-semibold text-muted-foreground shadow-card">جاري تحميل العروض...</p>
      ) : noLocation ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm font-semibold text-muted-foreground shadow-card">حدّد موقعك أولاً لعرض عروض منطقتك.</p>
      ) : stores.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm font-semibold text-muted-foreground shadow-card">لا توجد عروض فعّالة في منطقتك حاليًا.</p>
      ) : (
        <div className="space-y-4">
          {stores.map((s) => (
            <Link
              key={s.id}
              to="/store/$id"
              params={{ id: s.id }}
              className="block overflow-hidden rounded-3xl bg-card shadow-card transition-all hover:shadow-elegant"
            >
              <div className="relative h-28 bg-muted">
                {s.cover_url && <img src={s.cover_url} alt="" className="h-full w-full object-cover" />}
                <div className="absolute bottom-2 right-3 flex items-center gap-2">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-background bg-background">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-black text-foreground">{s.name}</span>
                </div>
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground shadow-elegant">
                  <Tag className="h-3.5 w-3.5" /> {s.products.length} {s.products.length === 1 ? "عرض" : s.products.length === 2 ? "عرضان" : "عروض"}
                </span>
                {!s.is_open && (
                  <span className="absolute left-3 top-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">مغلق</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
