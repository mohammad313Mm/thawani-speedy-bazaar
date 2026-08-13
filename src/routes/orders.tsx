import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useOrders, type Order } from "../lib/orders";
import { storeById } from "../lib/data";
import { formatIQD } from "../lib/format";
import { ClipboardList, ChevronDown, MapPin, Phone, StickyNote, CreditCard } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

type Tab = "current" | "completed" | "cancelled";

function OrdersPage() {
  const { orders } = useOrders();
  const [tab, setTab] = useState<Tab>("current");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (tab === "completed") return o.status === "delivered";
    if (tab === "cancelled") return o.status === "cancelled";
    return o.status !== "delivered" && o.status !== "cancelled";
  });

  return (
    <>
      <header className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-2xl font-black text-foreground">طلباتي</h1>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {(
            [
              ["current", "الحالية"],
              ["completed", "المنتهية"],
              ["cancelled", "الملغاة"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                tab === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-lg font-black">لا توجد طلبات هنا</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              عند إجراء طلب ستظهر تفاصيله هنا.
            </p>
            <Link
              to="/"
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              ابدأ بالتسوق
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                open={expanded === o.id}
                onToggle={() => setExpanded((prev) => (prev === o.id ? null : o.id))}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function OrderCard({
  order,
  open,
  onToggle,
}: {
  order: Order;
  open: boolean;
  onToggle: () => void;
}) {
  const staticStore = storeById(order.storeId);
  const [dbStore, setDbStore] = useState<{ name: string; logo?: string; phone?: string } | null>(null);

  useEffect(() => {
    if (staticStore || !order.storeId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("name, logo_url, phone")
        .eq("id", order.storeId)
        .maybeSingle();
      if (alive && data) {
        setDbStore({ name: data.name, logo: data.logo_url ?? undefined, phone: data.phone ?? undefined });
      }
    })();
    return () => {
      alive = false;
    };
  }, [order.storeId, staticStore]);

  const store = staticStore ?? dbStore;
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("ar-IQ") + " " + date.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-right"
      >
        {store?.logo ? (
          <img src={store.logo} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-black text-foreground">
            {store?.name ?? "متجر"}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">رقم الطلب {order.id}</p>
          <p className="mt-1 text-xs font-bold text-primary">
            طلبك قيد الانتظار، سيتم الاتصال بك قريباً من أحد المندوبين.
          </p>
          <p className="text-[11px] text-muted-foreground">{dateStr}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {order.items.length} منتج
            </span>
            <span className="text-sm font-black text-primary">{formatIQD(order.total)}</span>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div>
            <h4 className="mb-2 text-xs font-black text-foreground">المنتجات</h4>
            <div className="space-y-2">
              {order.items.map((it) => {
                const p = it.product;
                if (!p) return null;
                return (
                  <div key={it.productId} className="flex items-center gap-3">
                    {p.image && (
                      <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {it.quantity} × {formatIQD(p.discountPrice ?? p.price)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {formatIQD((p.discountPrice ?? p.price) * it.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label="المجموع الفرعي" value={formatIQD(order.subtotal)} />
            <Row label="رسوم التوصيل" value={formatIQD(order.deliveryFee)} />
            {order.discount > 0 && (
              <Row label="الخصم" value={`- ${formatIQD(order.discount)}`} />
            )}
            <div className="flex items-center justify-between pt-2 text-base font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{formatIQD(order.total)}</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <InfoRow icon={<CreditCard className="h-4 w-4" />} label="طريقة الدفع" value={order.paymentMethod === "cod" ? "الدفع عند الاستلام" : "المحفظة"} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="عنوان التوصيل" value={order.address} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="رقم الهاتف" value={order.phone} />
            {order.notes && (
              <InfoRow icon={<StickyNote className="h-4 w-4" />} label="ملاحظات" value={order.notes} />
            )}
          </div>
        </div>
      )}
    </div>
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

