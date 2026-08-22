// Global listener for taxi drivers: rings like an incoming call (60s) on any
// screen when a new taxi request arrives, and offers accept / reject inline.

import { useEffect, useRef, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Car, MapPin, Phone, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { useIsTaxiDriver } from "../lib/use-taxi-driver";
import { startRingtone, stopRingtone } from "../lib/alert-sound";
import { taxiRespondToRequest } from "../lib/taxi.functions";

export type TaxiRequestRow = {
  id: string;
  local_ref: string | null;
  customer_name: string | null;
  customer_phone: string;
  address: string;
  notes: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  status: string;
  driver_id: string | null;
  created_at: string;
};

export function TaxiRequestListener() {
  const { isTaxiDriver } = useIsTaxiDriver();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onTaxiOrders = pathname.startsWith("/taxi-orders");

  const [incoming, setIncoming] = useState<TaxiRequestRow | null>(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isTaxiDriver) return;
    const ch = supabase
      .channel("taxi-requests-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "taxi_requests" },
        (payload) => {
          const row = payload.new as TaxiRequestRow;
          if (row.status !== "pending" || row.driver_id) return;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);
          if (onTaxiOrders) {
            startRingtone(60000);
            return;
          }
          setIncoming(row);
          startRingtone(60000);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [isTaxiDriver, onTaxiOrders]);

  useEffect(() => () => stopRingtone(), []);

  if (!incoming) return null;

  const close = () => {
    stopRingtone();
    setIncoming(null);
  };

  const respond = async (action: "accept" | "reject") => {
    setBusy(true);
    try {
      await taxiRespondToRequest({ data: { request_id: incoming.id, action } });
      stopRingtone();
      setIncoming(null);
      if (action === "accept") {
        toast.success("تم قبول الطلب");
        router.navigate({ to: "/taxi-orders" });
      } else {
        toast.success("تم رفض الطلب");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-elegant">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-foreground">طلب تكسي جديد</p>
            <p className="truncate text-xs text-muted-foreground">
              {incoming.local_ref ?? incoming.id.slice(0, 8)}
            </p>
          </div>
          <button onClick={close} className="rounded-full bg-muted p-2" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 rounded-2xl bg-muted/60 p-3 text-sm">
          <p className="font-bold text-foreground">{incoming.customer_name || "زبون"}</p>
          <p className="flex items-center gap-2 text-muted-foreground" dir="ltr">
            <Phone className="h-4 w-4 shrink-0" /> {incoming.customer_phone}
          </p>
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {incoming.address}
          </p>
          {incoming.notes && (
            <p className="text-xs text-muted-foreground">ملاحظات: {incoming.notes}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => void respond("reject")}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-black text-destructive disabled:opacity-60"
          >
            <X className="h-4 w-4" /> رفض الطلب
          </button>
          <button
            onClick={() => void respond("accept")}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> قبول الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
