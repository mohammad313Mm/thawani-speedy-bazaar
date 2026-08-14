import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, MapPin, Loader2, Send, Info } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../lib/auth";
import { placeFreelanceOrder } from "../lib/freelance.functions";
import { loadSavedLocation } from "../lib/geo";
import { useLocationPicker } from "../lib/use-location";


export const Route = createFileRoute("/freelance-agent")({
  component: FreelanceAgentPage,
});

function LocationSelector({
  location,
  onLocation,
}: {
  location: string | null;
  onLocation: (loc: string) => void;
}) {
  const geo = useLocationPicker(onLocation);
  const shown = geo.label ?? location;

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
              {shown ?? "لم يتم تحديد الموقع بعد"}
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
              placeholder="رقم الهاتف"
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
