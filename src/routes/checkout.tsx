import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone, StickyNote, Wallet, Banknote, Check, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "../lib/cart";
import { useOrders } from "../lib/orders";
import { storeById, productById } from "../lib/data";
import { formatIQD, formatDistanceKm } from "../lib/format";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function feeForDistance(km: number): number {
  if (km < 4) return 1000;
  if (km < 7) return 2000;
  if (km < 12) return 3000;
  return 5000;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, storeId, subtotal, clear } = useCart();
  const { addOrder } = useOrders();
  const store = storeId ? storeById(storeId) : null;

  const [address, setAddress] = useState("بابل — الهاشمية، بيت رقم ٥");
  const [phone, setPhone] = useState("07701234567");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cod" | "wallet">("cod");
  const [placing, setPlacing] = useState(false);

  if (!store || items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">لا يوجد لديك طلب لإتمامه.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-primary">
          العودة للرئيسية
        </Link>
      </main>
    );
  }

  const deliveryFee = store.deliveryFee;
  const total = subtotal + deliveryFee;

  const place = () => {
    setPlacing(true);
    setTimeout(async () => {
      const order = addOrder({
        storeId: store.id,
        items,
        subtotal,
        deliveryFee,
        discount: 0,
        total,
        etaMin: store.deliveryMin,
        address,
        phone,
        notes: notes || undefined,
        paymentMethod: payment,
      });
      // Best-effort DB write so the merchant sees the order in real time.
      // Silently ignored for demo/static stores whose id isn't a UUID.
      try {
        const { supabase } = await import("../integrations/supabase/client");
        const { data: userRes } = await supabase.auth.getUser();
        await supabase.from("customer_orders").insert({
          local_order_id: order.id,
          store_id: store.id,
          customer_id: userRes.user?.id ?? null,
          customer_name: (userRes.user?.user_metadata as { full_name?: string } | null)?.full_name ?? null,
          customer_phone: phone,
          address,
          notes: notes || null,
          items: items.map((it) => {
            const p = productById(it.productId);
            return { name: p?.name ?? it.productId, qty: it.quantity, price: p?.price ?? 0 };
          }),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: payment,
          status: "pending",
        });
      } catch {
        /* non-fatal */
      }
      clear();
      navigate({ to: "/order/$id", params: { id: order.id } });
    }, 900);
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
            <MapPin className="mb-1 inline h-3.5 w-3.5 text-primary" /> عنوان التوصيل
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <label className="text-xs font-black text-foreground">
            <Phone className="mb-1 inline h-3.5 w-3.5 text-primary" /> رقم الهاتف
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            <Row label="رسوم التوصيل" value={formatIQD(deliveryFee)} />
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between text-base font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{formatIQD(total)}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            الوصول المتوقع خلال {store.deliveryMin} دقيقة.
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
            {placing ? "جاري تأكيد الطلب..." : `تأكيد الطلب • ${formatIQD(total)}`}
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
