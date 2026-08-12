import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone, StickyNote, Wallet, Banknote, Check, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCart } from "../lib/cart";
import { useOrders } from "../lib/orders";
import { storeById } from "../lib/data";
import { formatIQD, formatDistanceKm } from "../lib/format";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function feeForDistance(km: number): number {
  if (km < 3) return 1000;
  if (km < 5) return 2000;
  if (km < 8) return 3000;
  if (km < 11) return 4000;
  if (km < 15) return 5000;
  return 6000;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}


function CheckoutPage() {
  const navigate = useNavigate();
  const { items, storeId, subtotal, clear } = useCart();
  const { addOrder } = useOrders();
  const staticStore = storeId ? storeById(storeId) : null;
  const [dbStore, setDbStore] = useState<ReturnType<typeof storeById> | null>(null);
  useEffect(() => {
    if (!storeId || staticStore) {
      setDbStore(null);
      return;
    }
    let alive = true;
    (async () => {
      const { supabase } = await import("../integrations/supabase/client");
      const { adaptDbStore } = await import("../lib/db-stores");
      const { data } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
      if (alive) setDbStore(data ? (adaptDbStore(data as never) ?? null) : null);
    })();
    return () => {
      alive = false;
    };
  }, [storeId, staticStore]);
  const store = staticStore ?? dbStore;

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cod" | "wallet">("cod");
  const [placing, setPlacing] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number>(store?.distanceKm ?? 3);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">لا يوجد لديك طلب لإتمامه.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-primary">
          العودة للرئيسية
        </Link>
      </main>
    );
  }

  const deliveryFee = feeForDistance(distanceKm);
  const total = subtotal + deliveryFee;

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("خدمة تحديد الموقع غير متاحة على هذا الجهاز");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          // Reverse-geocode via Nominatim (best-effort)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`,
          );
          if (res.ok) {
            const j = await res.json();
            if (j.display_name) setAddress(j.display_name);
          }
          // Keep the store's declared distance as the source of truth for demo stores.
          // Real stores with coordinates could compute Haversine here.
          if (store) setDistanceKm(store.distanceKm);
          toast.success("تم تحديد موقعك");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error("تعذّر الوصول إلى موقعك");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const place = () => {
    if (!fullName.trim()) return toast.error("الرجاء إدخال الاسم الكامل");
    if (!phone.trim() || phone.trim().length < 10) return toast.error("الرجاء إدخال رقم هاتف صحيح");
    if (!address.trim()) return toast.error("الرجاء إدخال عنوان التوصيل");
    if (items.length === 0) return toast.error("السلة فارغة");

    setPlacing(true);
    setTimeout(async () => {
      const order = addOrder({
        storeId: storeId ?? "",
        items,
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        etaMin: store?.deliveryMin ?? 30,
        address,
        phone,
        notes: notes || undefined,
        paymentMethod: payment,
      });
      try {
        const { supabase } = await import("../integrations/supabase/client");
        const { data: userRes } = await supabase.auth.getUser();
        const { placeOrder } = await import("../lib/orders.functions");
        await placeOrder({
          data: {
            local_order_id: order.id,
            store_id: storeId ?? "",
            customer_id: userRes.user?.id ?? null,
            customer_name: fullName,
            customer_phone: phone,
            address,
            notes: notes || null,
            items: items
              .filter((it) => /^[0-9a-f-]{36}$/i.test(it.productId))
              .map((it) => ({ product_id: it.productId, qty: it.quantity })),
            distance_km: distanceKm,
            payment_method: payment,
            customer_lat: coords?.lat ?? null,
            customer_lng: coords?.lng ?? null,
          },
        });
      } catch {
        /* non-fatal — local order still saved */
      }

      clear();
      toast.success("تم استلام طلبك بنجاح");
      navigate({ to: "/orders" });
    }, 700);
  };



  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-foreground">إتمام الطلب</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-40">
        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <label className="text-xs font-black text-foreground">
            <User className="mb-1 inline h-3.5 w-3.5 text-primary" /> الاسم الكامل
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="اكتب اسمك الكامل"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-foreground">
              <MapPin className="mb-1 inline h-3.5 w-3.5 text-primary" /> عنوان التوصيل
            </label>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary disabled:opacity-60"
            >
              {locating ? "..." : "استخدم موقعي"}
            </button>
          </div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="أدخل عنوان التوصيل"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            المسافة إلى {store?.name ?? "المتجر"}: {formatDistanceKm(distanceKm)}
          </p>
        </section>


        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <label className="text-xs font-black text-foreground">
            <Phone className="mb-1 inline h-3.5 w-3.5 text-primary" /> رقم الهاتف
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXXX"
            dir="ltr"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <label className="text-xs font-black text-foreground">
            <StickyNote className="mb-1 inline h-3.5 w-3.5 text-primary" /> ملاحظات على الطلب
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اختياري — أي طلب خاص أو تفاصيل للسائق"
            className="mt-2 h-20 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <h3 className="text-xs font-black text-foreground">طريقة الدفع</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PaymentOption
              icon={<Banknote className="h-5 w-5" />}
              label="الدفع عند الاستلام"
              selected={payment === "cod"}
              onClick={() => setPayment("cod")}
            />
            <PaymentOption
              icon={<Wallet className="h-5 w-5" />}
              label="المحفظة (قريباً)"
              selected={payment === "wallet"}
              onClick={() => setPayment("wallet")}
              disabled
            />
          </div>
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <h3 className="mb-3 text-xs font-black text-foreground">ملخص الطلب</h3>
          <div className="space-y-1.5 text-sm">
            <Row label="المجموع الفرعي" value={formatIQD(subtotal)} />
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between text-base font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{formatIQD(subtotal)}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            الوصول المتوقع خلال {store?.deliveryMin ?? 30} دقيقة.
          </p>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl p-4">
          <button
            disabled={placing}
            onClick={place}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-black text-primary-foreground shadow-elegant transition-transform active:scale-95 disabled:opacity-70"
          >
            {placing ? "جاري تأكيد الطلب..." : `تأكيد الطلب • ${formatIQD(subtotal)}`}
          </button>
        </div>
      </div>
    </>
  );
}

function PaymentOption({
  icon,
  label,
  selected,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all ${
        selected ? "border-primary bg-primary/5" : "border-border bg-background"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </div>
      <span className="flex-1 text-xs font-bold text-foreground">{label}</span>
      {selected && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
