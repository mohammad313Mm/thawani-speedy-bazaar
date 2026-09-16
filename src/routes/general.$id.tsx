import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MapPin, Loader2, Send, Info } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../lib/auth";
import { getGeneralStore, placeGeneralOrder, type GeneralStorePublic } from "../lib/general.functions";
import { quoteDeliveryFee } from "../lib/delivery.functions";
import { loadSavedLocation } from "../lib/geo";
import { useLocationPicker } from "../lib/use-location";

export const Route = createFileRoute("/general/$id")({
  component: GeneralStorePage,
  head: () => ({
    meta: [
      { title: "طلب خاص — ثواني" },
      { name: "description", content: "أرسل طلبك الخاص إلى المتجر مع احتساب أجور التوصيل حسب المسافة." },
      { property: "og:title", content: "طلب خاص — ثواني" },
      { property: "og:description", content: "أرسل طلبك الخاص إلى المتجر مع احتساب أجور التوصيل حسب المسافة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function GeneralStorePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [store, setStore] = useState<GeneralStorePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<{ fee: number; km: number } | null>(null);

  useEffect(() => {
    let alive = true;
    getGeneralStore({ data: { id } })
      .then((r) => { if (alive) setStore(r.store); })
      .catch(() => { if (alive) setStore(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const refreshQuote = useCallback(async () => {
    const saved = loadSavedLocation();
    if (!saved) { setQuote(null); return; }
    try {
      const res = await quoteDeliveryFee({
        data: { store_id: id, customer_lat: saved.lat, customer_lng: saved.lng },
      });
      setQuote(res.ok ? { fee: res.delivery_fee, km: res.distance_km } : null);
      if (!res.ok && res.reason === "store_no_location") {
        toast.error("لم يحدد المتجر موقعه بعد، تعذر احتساب أجور التوصيل.");
      }
    } catch {
      setQuote(null);
    }
  }, [id]);

  const onLocation = (loc: string) => {
    setLocation(loc);
    void refreshQuote();
  };

  const geo = useLocationPicker(onLocation);
  const shownLocation = geo.label ?? location;

  const submit = async () => {
    if (!store) return;
    if (!store.is_open) { toast.error("المتجر غير متوفر حالياً"); return; }
    const saved = loadSavedLocation();
    if (!shownLocation || !saved) { toast.error("يرجى تحديد موقعك أولاً"); return; }
    if (!name.trim()) { toast.error("يرجى إدخال الاسم"); return; }
    if (phone.trim().length < 6) { toast.error("يرجى إدخال رقم هاتف صحيح"); return; }
    if (!details.trim()) { toast.error("يرجى كتابة تفاصيل طلبك"); return; }
    setSubmitting(true);
    try {
      const res = await placeGeneralOrder({
        data: {
          store_id: store.id,
          customer_id: user?.id ?? null,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          address: shownLocation,
          details: details.trim(),
          customer_lat: saved.lat,
          customer_lng: saved.lng,
        },
      });
      toast.success(`تم إرسال طلبك (${res.local_order_id})`);
      setDetails("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
        <h1 className="text-lg font-black">غير متاح</h1>
        <p className="text-sm text-muted-foreground">هذه الخدمة غير متوفرة حالياً.</p>
        <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">
          العودة للرئيسية
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-foreground">{store.name}</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {store.is_open ? "اكتب طلبك وسنقوم بتوصيله" : "غير متوفر حالياً"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        {!store.is_open && (
          <div className="rounded-2xl bg-destructive/10 p-4 text-center text-sm font-bold text-destructive">
            هذا المتجر غير متوفر حالياً ولا يستقبل الطلبات.
          </div>
        )}

        {store.description && (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
            {store.description}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">موقع التوصيل</p>
                <p className="truncate text-sm font-bold text-foreground">
                  {shownLocation ?? "لم يتم تحديد الموقع بعد"}
                </p>
              </div>
            </div>
            <button
              onClick={() => void geo.request()}
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
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-2">
          <div>
            <label htmlFor="general-name" className="mb-2 block text-sm font-bold text-foreground">الاسم</label>
            <input
              id="general-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
              placeholder="اسمك"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="general-phone" className="mb-2 block text-sm font-bold text-foreground">رقم الهاتف</label>
            <input
              id="general-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={30}
              placeholder="رقم الهاتف"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label htmlFor="general-details" className="mb-2 block text-sm font-bold text-foreground">
            تفاصيل الطلب
          </label>
          <textarea
            id="general-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={6}
            placeholder="اكتب طلبك بالتفصيل"
            className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm font-medium outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                أجور التوصيل:{" "}
                {quote
                  ? `${quote.fee.toLocaleString("ar-IQ")} د.ع`
                  : "يُحدد بعد تحديد موقعك"}
              </p>
              {quote && (
                <p className="mt-1 text-xs text-muted-foreground">
                  المسافة التقريبية: {quote.km.toFixed(1)} كم
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting || !store.is_open}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black text-primary-foreground shadow-elegant transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
        </button>
      </main>
    </div>
  );
}
