import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useOrders, STATUS_LABEL, type OrderStatus } from "../lib/orders";
import { storeById } from "../lib/data";
import { formatIQD } from "../lib/format";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

type Tab = "current" | "completed" | "cancelled";

function OrdersPage() {
  const { orders } = useOrders();
  const [tab, setTab] = useState<Tab>("current");

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
            {filtered.map((o) => {
              const store = storeById(o.storeId);
              return (
                <Link
                  key={o.id}
                  to="/order/$id"
                  params={{ id: o.id }}
                  className="block rounded-2xl bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={store?.logo}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-black text-foreground">
                          {store?.name}
                        </h3>
                        <StatusPill status={o.status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        رقم الطلب {o.id}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {o.items.length} منتج
                        </span>
                        <span className="text-sm font-black text-primary">
                          {formatIQD(o.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered"
      ? "bg-success/15 text-success"
      : status === "cancelled"
      ? "bg-destructive/10 text-destructive"
      : "bg-accent/20 text-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
