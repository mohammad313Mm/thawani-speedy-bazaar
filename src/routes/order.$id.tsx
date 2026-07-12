import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Phone, MessageCircle, MapPin, Check, X, Bike, ChefHat, Clock, Package } from "lucide-react";
import { useOrders, STATUS_LABEL, STATUS_ORDER, type OrderStatus } from "../lib/orders";
import { storeById, productById } from "../lib/data";
import { formatIQD, formatMinutes } from "../lib/format";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

const STEP_ICONS: Record<OrderStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  accepted: <Check className="h-4 w-4" />,
  preparing: <ChefHat className="h-4 w-4" />,
  ready: <Package className="h-4 w-4" />,
  driver_assigned: <Bike className="h-4 w-4" />,
  picked_up: <Package className="h-4 w-4" />,
  on_the_way: <Bike className="h-4 w-4" />,
  delivered: <Check className="h-4 w-4" />,
  cancelled: <X className="h-4 w-4" />,
};

function OrderPage() {
  const { id } = Route.useParams();
  const { getOrder, cancelOrder } = useOrders();
  const order = getOrder(id);
  if (!order) throw notFound();
  const store = storeById(order.storeId);

  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/orders"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black">تتبع الطلب</h1>
            <p className="truncate text-[11px] text-muted-foreground">{order.id}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
        {/* Status hero */}
        <section className="overflow-hidden rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <p className="text-xs font-bold opacity-90">الحالة الحالية</p>
          <h2 className="mt-1 text-2xl font-black">{STATUS_LABEL[order.status]}</h2>
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <p className="mt-1 text-sm opacity-90">
              الوصول المتوقع خلال {formatMinutes(order.etaMin)}
            </p>
          )}
        </section>

        {/* Live map mock */}
        <section className="relative h-56 overflow-hidden rounded-3xl bg-muted">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,oklch(0.85_0.05_240)_0%,oklch(0.92_0.02_240)_50%,oklch(0.95_0.01_240)_100%)]" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 220" preserveAspectRatio="none">
            <path
              d="M 40 180 Q 140 40 220 100 T 360 60"
              fill="none"
              stroke="oklch(0.55 0.22 27)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-success text-success-foreground shadow-elegant">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="absolute top-6 right-8 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant animate-pulse-ring">
            <Bike className="h-5 w-5" />
          </div>
          <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-foreground shadow-soft">
            الوقت المتبقي: {formatMinutes(order.etaMin)}
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <h3 className="mb-3 text-sm font-black text-foreground">مراحل الطلب</h3>
          <ol className="space-y-3">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx && order.status !== "cancelled";
              const current = i === currentIdx && order.status !== "cancelled";
              return (
                <li key={s} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } ${current ? "animate-pulse-ring" : ""}`}
                  >
                    {STEP_ICONS[s]}
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Driver */}
        {order.driver && (
          <section className="rounded-2xl bg-card p-4 shadow-soft">
            <h3 className="mb-3 text-sm font-black text-foreground">سائق التوصيل</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-lg font-black text-primary-foreground">
                {order.driver.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{order.driver.name}</p>
                <p className="text-xs text-muted-foreground">تقييم {order.driver.rating} ⭐</p>
              </div>
              <a
                href={`tel:${order.driver.phone}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${order.driver.phone}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </section>
        )}

        {/* Store & items */}
        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <img src={store?.logo} className="h-12 w-12 rounded-xl object-cover" alt="" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{store?.name}</p>
              <p className="text-xs text-muted-foreground">{order.address}</p>
            </div>
            {store && (
              <a
                href={`tel:${store.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {order.items.map((it) => {
              const p = productById(it.productId);
              if (!p) return null;
              return (
                <div key={it.productId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    <span className="font-bold">{it.quantity}×</span> {p.name}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatIQD((p.discountPrice ?? p.price) * it.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label="المجموع الفرعي" value={formatIQD(order.subtotal)} />
            <Row label="التوصيل" value={formatIQD(order.deliveryFee)} />
            <div className="flex items-center justify-between pt-2 text-base font-black">
              <span>الإجمالي</span>
              <span className="text-primary">{formatIQD(order.total)}</span>
            </div>
          </div>
        </section>

        {order.status !== "delivered" &&
          order.status !== "cancelled" &&
          currentIdx < 2 && (
            <button
              onClick={() => cancelOrder(order.id)}
              className="w-full rounded-full border border-destructive py-3 text-sm font-bold text-destructive"
            >
              إلغاء الطلب
            </button>
          )}
      </main>
    </>
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
