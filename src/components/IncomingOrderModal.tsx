import { useEffect, useRef, useState } from "react";
import { Check, X, MapPin, Phone, Clock, StickyNote, Package, Store, Bike } from "lucide-react";
import { formatIQD } from "../lib/format";

export type IncomingItem = { name: string; qty: number; price: number };

export type IncomingOrderData = {
  id: string;
  local_order_id?: string | null;
  store_name?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  items?: IncomingItem[];
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  created_at: string;
  customer_lat?: number | null;
  customer_lng?: number | null;
};

const RING_SECONDS = 15;

/** Loop a simple two-tone beep via WebAudio. Requires a prior user gesture,
 *  which drivers/merchants have (they're logged into the dashboard). */
function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let ctx: AudioContext | null = null;
    let timer: number | null = null;

    const beep = () => {
      if (cancelled) return;
      try {
        if (!ctx) {
          const AC =
            (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
              .AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
        }
        const now = ctx.currentTime;
        [880, 660].forEach((freq, i) => {
          const osc = ctx!.createOscillator();
          const gain = ctx!.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.35);
          gain.gain.linearRampToValueAtTime(0.35, now + i * 0.35 + 0.02);
          gain.gain.linearRampToValueAtTime(0, now + i * 0.35 + 0.3);
          osc.connect(gain).connect(ctx!.destination);
          osc.start(now + i * 0.35);
          osc.stop(now + i * 0.35 + 0.32);
        });
      } catch {}
      timer = window.setTimeout(beep, 1000);
    };

    beep();
    // Vibration loop
    let vibTimer: number | null = null;
    const vibrate = () => {
      try {
        navigator.vibrate?.([400, 200, 400, 200, 400]);
      } catch {}
      vibTimer = window.setTimeout(vibrate, 1600);
    };
    vibrate();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (vibTimer) clearTimeout(vibTimer);
      try {
        navigator.vibrate?.(0);
      } catch {}
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [active]);
}

export function IncomingOrderModal({
  variant,
  order,
  onAccept,
  onReject,
  onTimeout,
  busy = false,
  extra,
}: {
  variant: "store" | "driver";
  order: IncomingOrderData;
  onAccept: () => void;
  onReject: () => void;
  onTimeout: () => void;
  busy?: boolean;
  extra?: React.ReactNode;
}) {
  const [remaining, setRemaining] = useState(RING_SECONDS);
  const timedOut = useRef(false);
  useRingtone(true);

  useEffect(() => {
    timedOut.current = false;
    setRemaining(RING_SECONDS);
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          if (!timedOut.current) {
            timedOut.current = true;
            onTimeout();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const orderNum = (order.local_order_id ?? order.id).slice(-6).toUpperCase();
  const title = variant === "store" ? "طلب جديد!" : "طلب توصيل جديد!";
  const Icon = variant === "store" ? Store : Bike;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-primary/95 via-primary to-primary/90 text-white animate-in fade-in duration-200"
    >
      {/* Ringing header */}
      <div className="flex flex-col items-center pt-10 pb-4">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
          <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/25 backdrop-blur">
            <Icon className="h-11 w-11 text-white" />
          </div>
        </div>
        <p className="mt-5 text-lg opacity-90">{title}</p>
        <p className="text-3xl font-black tracking-wide">#{orderNum}</p>
        <p className="mt-1 text-xs opacity-80">
          يُغلق تلقائياً بعد {remaining} ثانية
        </p>
      </div>

      {/* Details card */}
      <div className="mx-4 flex-1 overflow-y-auto rounded-3xl bg-white p-4 text-foreground shadow-elegant">
        {order.store_name && (
          <Row icon={<Store className="h-4 w-4" />} label="المتجر" value={order.store_name} />
        )}
        {order.customer_name && (
          <Row icon={<Package className="h-4 w-4" />} label="العميل" value={order.customer_name} />
        )}
        {order.customer_phone && variant === "store" && (
          <Row
            icon={<Phone className="h-4 w-4" />}
            label="الهاتف"
            value={<span dir="ltr">{order.customer_phone}</span>}
          />
        )}
        {order.address && (
          <Row icon={<MapPin className="h-4 w-4" />} label="العنوان" value={order.address} />
        )}
        {order.notes && (
          <Row icon={<StickyNote className="h-4 w-4" />} label="ملاحظات" value={order.notes} />
        )}
        <Row
          icon={<Clock className="h-4 w-4" />}
          label="الوقت"
          value={new Date(order.created_at).toLocaleString("ar-IQ")}
        />

        {extra}

        {variant === "store" && order.items && order.items.length > 0 && (
          <div className="mt-3 rounded-2xl bg-muted/50 p-3">
            <p className="mb-2 text-xs font-black text-muted-foreground">المنتجات</p>
            <div className="space-y-1">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-bold">
                    {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                  </span>
                  <span className="text-muted-foreground">{formatIQD(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-primary/10 p-3 text-center text-xs">
          {typeof order.subtotal === "number" && (
            <div>
              <p className="text-muted-foreground">المنتجات</p>
              <p className="font-black">{formatIQD(order.subtotal)}</p>
            </div>
          )}
          {typeof order.delivery_fee === "number" && (
            <div>
              <p className="text-muted-foreground">التوصيل</p>
              <p className="font-black">{formatIQD(order.delivery_fee)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">الإجمالي</p>
            <p className="font-black text-primary">{formatIQD(order.total)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 p-4 pb-6">
        <button
          disabled={busy}
          onClick={onReject}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-white/15 text-lg font-black backdrop-blur transition active:scale-95 disabled:opacity-60"
        >
          <X className="h-6 w-6" />
          رفض الطلب
        </button>
        <button
          disabled={busy}
          onClick={onAccept}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-black text-success-foreground shadow-elegant transition active:scale-95 disabled:opacity-60"
        >
          <Check className="h-6 w-6" />
          قبول الطلب
        </button>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-border/40 py-2 last:border-b-0">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
