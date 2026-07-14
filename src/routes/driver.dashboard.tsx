import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Bike, LogOut, Check, X, MapPin, Store, Clock, Phone, PackageCheck } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { formatIQD } from "../lib/format";

export const Route = createFileRoute("/driver/dashboard")({
  component: DriverDashboardPage,
});

type Order = {
  id: string;
  local_order_id: string | null;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  driver_id: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

type StoreInfo = { id: string; name: string };

function DriverDashboardPage() {
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(false);
  const [unavailableUntil, setUnavailableUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Record<string, StoreInfo>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/driver-login" });
      return;
    }
    if (!roles.includes("driver")) {
      navigate({ to: "/driver-auth" });
    }
  }, [user, roles, loading, navigate]);

  // Tick every second while a lockout is pending
  useEffect(() => {
    if (!unavailableUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [unavailableUntil]);

  // Load availability + lockout
  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_available, unavailable_until")
      .eq("id", user.id)
      .maybeSingle();
    const row = data as { is_available?: boolean; unavailable_until?: string | null } | null;
    setIsAvailable(Boolean(row?.is_available));
    setUnavailableUntil(row?.unavailable_until ? new Date(row.unavailable_until).getTime() : null);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    // Own assigned/finished orders
    const { data: mine } = await supabase
      .from("customer_orders")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    // Available pool: approved by store or admin, not yet claimed
    const { data: pool } = await supabase
      .from("customer_orders")
      .select("*")
      .is("driver_id", null)
      .in("status", ["accepted", "preparing", "ready"])
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = [...((pool ?? []) as Order[]), ...((mine ?? []) as Order[])];
    const seen = new Set<string>();
    const deduped = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    setOrders(deduped);

    const storeIds = Array.from(new Set(deduped.map((r) => r.store_id)));
    if (storeIds.length) {
      const { data: s } = await supabase
        .from("stores")
        .select("id, name")
        .in("id", storeIds);
      const map: Record<string, StoreInfo> = {};
      (s ?? []).forEach((row) => {
        map[row.id] = row as StoreInfo;
      });
      setStores(map);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadOrders();
    // Any change on customer_orders — RLS scopes what this driver can see.
    const ch = supabase
      .channel(`driver_orders_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_orders" },
        loadOrders,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadOrders]);

  const lockoutRemainingMs = unavailableUntil ? Math.max(0, unavailableUntil - now) : 0;
  const inLockout = lockoutRemainingMs > 0;

  // Auto re-enable availability once the 20-minute lockout ends
  useEffect(() => {
    if (!user || !unavailableUntil) return;
    const remaining = unavailableUntil - Date.now();
    if (remaining <= 0) {
      (async () => {
        await supabase
          .from("profiles")
          .update({ is_available: true, unavailable_until: null })
          .eq("id", user.id);
        setUnavailableUntil(null);
        setIsAvailable(true);
      })();
      return;
    }
    const t = setTimeout(async () => {
      await supabase
        .from("profiles")
        .update({ is_available: true, unavailable_until: null })
        .eq("id", user.id);
      setUnavailableUntil(null);
      setIsAvailable(true);
    }, remaining + 250);
    return () => clearTimeout(t);
  }, [user, unavailableUntil]);

  const toggleAvailability = async (next: boolean) => {
    if (!user) return;
    if (next && inLockout) {
      alert("لا يمكن تفعيل الحالة قبل انتهاء مهلة الـ20 دقيقة");
      return;
    }
    setIsAvailable(next);
    await supabase.from("profiles").update({ is_available: next }).eq("id", user.id);
  };

  // Claim: RLS + trigger ensure only one driver wins.
  const acceptOrder = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const acceptedAt = new Date();
    const until = new Date(acceptedAt.getTime() + 20 * 60 * 1000);
    const { data, error } = await supabase
      .from("customer_orders")
      .update({
        driver_id: user.id,
        status: "driver_assigned",
        accepted_at: acceptedAt.toISOString(),
      })
      .eq("id", id)
      .is("driver_id", null)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      alert("تم استلام هذا الطلب من قِبل مندوب آخر");
    } else {
      // Lock the driver for 20 minutes; hide new orders
      await supabase
        .from("profiles")
        .update({ is_available: false, unavailable_until: until.toISOString() })
        .eq("id", user.id);
      setUnavailableUntil(until.getTime());
      setIsAvailable(false);
    }
    await loadOrders();
    setBusy(null);
  };

  const deliverOrder = async (id: string) => {
    if (!user) return;
    setBusy(id);
    await supabase
      .from("customer_orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id)
      .eq("driver_id", user.id);
    await loadOrders();
    setBusy(null);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const active = orders.filter((o) => o.driver_id === user.id && !["delivered", "cancelled"].includes(o.status));
  const hasActive = active.length > 0;
  // Hide the pool while the driver has an active order or is in lockout
  const pending = isAvailable && !hasActive && !inLockout
    ? orders.filter((o) => o.driver_id === null && ["accepted", "preparing", "ready"].includes(o.status))
    : [];
  const history = orders.filter((o) => o.driver_id === user.id && ["delivered", "cancelled"].includes(o.status));


  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black">لوحة المندوب</h1>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/driver-auth" });
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-destructive"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {/* Availability switch */}
        <section
          className={`rounded-3xl p-5 text-white shadow-elegant transition-colors ${
            isAvailable ? "bg-gradient-warm" : "bg-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 backdrop-blur">
              <Bike className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black">
                {inLockout
                  ? "غير متوفر — بانتظار انتهاء المهلة"
                  : isAvailable
                    ? "متوفر لاستلام الطلبات"
                    : "غير متوفر"}
              </p>
              <p className="mt-0.5 text-xs opacity-90">
                {inLockout
                  ? `سيتم تفعيل الحالة تلقائياً بعد ${formatMs(lockoutRemainingMs)}`
                  : isAvailable
                    ? "سيتم إشعارك بالطلبات الجديدة فوراً"
                    : "لن تصلك طلبات جديدة حتى تفعّل الحالة"}
              </p>
            </div>
            <button
              onClick={() => toggleAvailability(!isAvailable)}
              disabled={inLockout}
              className={`relative h-8 w-14 rounded-full transition-colors disabled:opacity-60 ${
                isAvailable ? "bg-white/30" : "bg-black/30"
              }`}
              aria-label="تبديل الحالة"
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                  isAvailable ? "right-1" : "right-7"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Pending (incoming) — hidden while an active order exists or lockout is running */}
        {isAvailable && !hasActive && !inLockout && (
          <Section title="طلبات جديدة">
            {pending.length === 0 ? (
              <EmptyState text="لا توجد طلبات حالياً — سنُعلمك فور وصول طلب جديد." />
            ) : (
              pending.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  storeName={stores[o.store_id]?.name}
                  onAccept={() => acceptOrder(o.id)}
                  busy={busy === o.id}
                  mode="incoming"
                />
              ))
            )}
          </Section>
        )}

        {/* Active */}
        <Section title="طلباتي النشطة">
          {active.length === 0 ? (
            <EmptyState text="لا توجد طلبات نشطة." />
          ) : (
            active.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                storeName={stores[o.store_id]?.name}
                onDeliver={() => deliverOrder(o.id)}
                busy={busy === o.id}
                mode="active"
              />
            ))
          )}
        </Section>


        {/* History */}
        <Section title="السجل">
          {history.length === 0 ? (
            <EmptyState text="لا يوجد سجل بعد." />
          ) : (
            history.slice(0, 20).map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                storeName={stores[o.store_id]?.name}
                showActions={false}
                muted
              />
            ))
          )}
        </Section>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-black text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-card p-5 text-center text-xs text-muted-foreground shadow-soft">
      {text}
    </p>
  );
}

function OrderCard({
  order,
  storeName,
  onAccept,
  onReject,
  showActions = true,
  busy = false,
  muted = false,
}: {
  order: Order;
  storeName?: string;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  busy?: boolean;
  muted?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl p-4 shadow-soft ${muted ? "bg-muted/50" : "bg-card"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black text-muted-foreground" dir="ltr">
          #{order.local_order_id ?? order.id.slice(0, 8)}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <Row icon={<Store className="h-3.5 w-3.5" />} label={storeName ?? "متجر"} />
        <Row icon={<Bike className="h-3.5 w-3.5" />} label={order.customer_name} />
        {order.customer_phone && (
          <Row icon={<Phone className="h-3.5 w-3.5" />} label={order.customer_phone} dir="ltr" />
        )}
        {order.address && <Row icon={<MapPin className="h-3.5 w-3.5" />} label={order.address} />}
        <Row
          icon={<Clock className="h-3.5 w-3.5" />}
          label={new Date(order.created_at).toLocaleString("ar-IQ")}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2 text-center text-[11px]">
        <div>
          <p className="text-muted-foreground">التوصيل</p>
          <p className="font-black">{formatIQD(order.delivery_fee)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">المجموع</p>
          <p className="font-black">{formatIQD(order.subtotal)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">الإجمالي</p>
          <p className="font-black text-primary">{formatIQD(order.total)}</p>
        </div>
      </div>

      {showActions && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={onAccept}
            className="flex h-10 items-center justify-center gap-1 rounded-xl bg-success text-xs font-black text-success-foreground disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> قبول
          </button>
          <button
            disabled={busy}
            onClick={onReject}
            className="flex h-10 items-center justify-center gap-1 rounded-xl bg-destructive text-xs font-black text-destructive-foreground disabled:opacity-60"
          >
            <X className="h-4 w-4" /> رفض
          </button>
        </div>
      )}
    </article>
  );
}

function Row({
  icon,
  label,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span dir={dir} className="truncate">
        {label}
      </span>
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "pending":
      return "قيد الاستلام";
    case "confirmed":
      return "مؤكد";
    case "preparing":
      return "قيد التحضير";
    case "ready":
      return "جاهز للتوصيل";
    case "driver_assigned":
      return "بعهدتي";
    case "delivered":
      return "مُسلَّم";
    case "cancelled":
      return "ملغي";
    default:
      return s;
  }
}
