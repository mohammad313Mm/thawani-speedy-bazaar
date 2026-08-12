import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, MapPin, Loader2, Send, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { placeFreelanceOrder } from "../lib/freelance.functions";


export const Route = createFileRoute("/freelance-agent")({
  component: FreelanceAgentPage,
});

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

function LocationSelector({
  location,
  onLocation,
}: {
  location: string | null;
  onLocation: (loc: string) => void;
}) {
  const [status, setStatus] = useState<LocStatus>("idle");

  const handleGetLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("هاتفك لا يدعم تحديد الموقع");
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const label = await reverseGeocode(lat, lng);
        saveLocation({ label, lat, lng, savedAt: new Date().toISOString() });
        onLocation(label);
        setStatus("granted");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح/التطبيق.");
          setStatus("denied");
        } else if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          toast.error("تعذر الحصول على موقع دقيق. تأكد من تفعيل GPS ومن وجود إشارة واضحة.");
          setStatus("error");
        } else {
          toast.error("حدث خطأ أثناء تحديد الموقع. حاول مرة أخرى.");
          setStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [onLocation]);

  useEffect(() => {
    const saved = loadSavedLocation();
    if (saved) {
      onLocation(saved.label);
      setStatus("granted");
    }
  }, [onLocation]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
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
    </div>
  );
}

function FreelanceAgentPage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);


  const handleSubmit = async () => {
    if (!location) {
      toast.error("يرجى تحديد موقع التوصيل أولاً");
      return;
    }
    if (!request.trim()) {
      toast.error("يرجى كتابة تفاصيل طلبك");
      return;
    }
    if (phone.trim().length < 6) {
      toast.error("يرجى إدخال رقم هاتف صحيح للتواصل");
      return;
    }
    setSubmitting(true);
    try {
      const saved = loadSavedLocation();
      const res = await placeFreelanceOrder({
        data: {
          customer_id: user?.id ?? null,
          customer_name: name.trim() || null,
          customer_phone: phone.trim(),
          address: location,
          details: request.trim(),
          customer_lat: saved?.lat ?? null,
          customer_lng: saved?.lng ?? null,
        },
      });
      toast.success(`تم إرسال طلبك إلى المندوبين (${res.local_order_id})`);
      setRequest("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الطلب، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-foreground">مندوب حر</h1>
            <p className="truncate text-[11px] text-muted-foreground">اطلب أي شيء من السوق</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        <LocationSelector location={location} onLocation={setLocation} />

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label
            htmlFor="freelance-request"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            تفاصيل الطلب
          </label>
          <textarea
            id="freelance-request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={6}
            placeholder="اكتب طلبك الذي تحتاجه من السوق وسوف نقوم بتوصيله (ما عدا الأدوية)"
            className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-elegant"
          />
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-2">
          <div>
            <label htmlFor="freelance-name" className="mb-2 block text-sm font-bold text-foreground">
              الاسم (اختياري)
            </label>
            <input
              id="freelance-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="اسمك"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="freelance-phone" className="mb-2 block text-sm font-bold text-foreground">
              رقم الهاتف
            </label>
            <input
              id="freelance-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              maxLength={30}
              placeholder="07xxxxxxxxx"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>


        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">تكلفة التوصيل داخل المنطقة: 2000 دينار عراقي</p>
              <p className="mt-1 text-xs text-muted-foreground">
                السعر النهائي قد يتغير حسب بعد المسافة أو حجم الطلب.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black text-primary-foreground shadow-elegant transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
        </button>
      </main>
    </div>
  );
}
