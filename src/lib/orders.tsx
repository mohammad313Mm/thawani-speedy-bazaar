import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "./cart";
import { supabase } from "../integrations/supabase/client";

/** Customer orders stay visible in «طلباتي» for 10 days — same window as the admin cleanup. */
export const ORDER_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;
const withinRetention = (o: Order) => Date.now() - o.createdAt < ORDER_RETENTION_MS;

function mapRemoteStatus(s: string): OrderStatus {
  if (s === "rejected") return "cancelled";
  if (s in STATUS_LABEL) return s as OrderStatus;
  return "accepted";
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "driver_assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "تم القبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  driver_assigned: "تم تعيين السائق",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق إليك",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "driver_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
];

export interface Order {
  id: string;
  storeId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  etaMin: number;
  address: string;
  phone: string;
  notes?: string;
  paymentMethod: "cod" | "wallet";
  driver?: { name: string; phone: string; rating: number };
  /** True when the status comes from the server copy of the order. */
  remote?: boolean;
}

interface OrdersContextValue {
  orders: Order[];
  addOrder: (o: Omit<Order, "id" | "createdAt" | "status"> & { status?: OrderStatus }) => Order;
  getOrder: (id: string) => Order | undefined;
  advanceStatus: (id: string) => void;
  cancelOrder: (id: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);
const KEY = "thawani-orders";

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOrders((JSON.parse(raw) as Order[]).filter(withinRetention));
    } catch {}
    setHydrated(true);
  }, []);

  // Restore the signed-in customer's orders (last 10 days) from the server, so
  // they survive app restarts, sign-out/in and reinstall.
  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const since = new Date(Date.now() - ORDER_RETENTION_MS).toISOString();
      const { data } = await supabase
        .from("customer_orders")
        .select("id, local_order_id, store_id, items, subtotal, delivery_fee, total, status, created_at, address, customer_phone, notes, payment_method")
        .eq("customer_id", uid)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (!alive || !data) return;
      setOrders((prev) => {
        const byId = new Map(prev.map((o) => [o.id, o]));
        for (const r of data) {
          const id = r.local_order_id ?? r.id;
          const local = byId.get(id);
          const raw = Array.isArray(r.items) ? (r.items as Array<{ name?: string; qty?: number; price?: number }>) : [];
          const items = local?.items ?? (raw.map((it, i) => ({
            productId: `${r.id}-${i}`,
            quantity: it.qty ?? 1,
            product: { name: it.name ?? "", price: it.price ?? 0 },
          })) as unknown as CartItem[]);
          byId.set(id, {
            ...(local ?? {}),
            id,
            storeId: r.store_id,
            items,
            subtotal: r.subtotal,
            deliveryFee: r.delivery_fee,
            discount: local?.discount ?? 0,
            total: r.total,
            status: mapRemoteStatus(r.status),
            createdAt: new Date(r.created_at).getTime(),
            etaMin: local?.etaMin ?? 30,
            address: r.address,
            phone: r.customer_phone,
            notes: r.notes ?? undefined,
            paymentMethod: r.payment_method === "wallet" ? "wallet" : "cod",
            remote: true,
          });
        }
        return [...byId.values()].filter(withinRetention).sort((a, b) => b.createdAt - a.createdAt);
      });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN") load();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders, hydrated]);

  // Simulated realtime progression
  useEffect(() => {
    if (!hydrated) return;
    const t = setInterval(() => {
      setOrders((prev) =>
        prev.filter(withinRetention).map((o) => {
          if (o.remote) return o;
          if (o.status === "delivered" || o.status === "cancelled") return o;
          const elapsed = (Date.now() - o.createdAt) / 1000;
          // advance one step every ~20s of wall time
          const targetIdx = Math.min(
            STATUS_ORDER.length - 1,
            Math.floor(elapsed / 20) + 1,
          );
          const nextStatus = STATUS_ORDER[targetIdx];
          if (STATUS_ORDER.indexOf(o.status) < targetIdx) {
            const driver =
              o.driver ||
              (nextStatus === "driver_assigned" || STATUS_ORDER.indexOf(nextStatus) >= 3
                ? { name: "أحمد الكاظمي", phone: "07901234567", rating: 4.9 }
                : undefined);
            return { ...o, status: nextStatus, driver };
          }
          return o;
        }),
      );
    }, 5000);
    return () => clearInterval(t);
  }, [hydrated]);

  const addOrder: OrdersContextValue["addOrder"] = (o) => {
    const order: Order = {
      ...o,
      id: `ORD-${Math.floor(Math.random() * 900000 + 100000)}`,
      createdAt: Date.now(),
      status: o.status ?? "pending",
    };
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const advanceStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const idx = STATUS_ORDER.indexOf(o.status);
        const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
        return { ...o, status: next };
      }),
    );
  };

  const cancelOrder = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, getOrder, advanceStatus, cancelOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be inside OrdersProvider");
  return ctx;
}
