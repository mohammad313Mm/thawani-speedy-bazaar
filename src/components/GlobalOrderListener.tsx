// Global background listener for merchant/driver order notifications.
// Mounted once at the app root. Uses the same Supabase Realtime channel the
// dashboards use so the order flow, permissions, and dispatch logic stay
// identical — this component only surfaces the IncomingOrderModal on ANY
// screen (home, profile, cart, etc.) so users don't need to open the
// merchant/driver panel to be notified.
//
// When the user is already on their dashboard route, this listener stays
// silent so the dashboard's own modal handles the order (no duplicates).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { IncomingOrderModal, type IncomingOrderData } from "./IncomingOrderModal";
import { notifyDriversForOrder } from "../lib/notify.functions";
import { playAlertTone } from "../lib/alert-sound";
import { toast } from "sonner";

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار موافقة المتجر",
  accepted: "تم قبول الطلب من المتجر",
  searching_driver: "جاري البحث عن مندوب",
  preparing: "قيد التحضير",
  ready: "الطلب جاهز",
  driver_assigned: "تم تعيين مندوب",
  picked_up: "المندوب استلم الطلب",
  on_the_way: "الطلب في الطريق",
  delivered: "تم التسليم",
  rejected: "تم رفض الطلب",
  missed: "لم يتم الرد على الطلب",
  cancelled: "تم إلغاء الطلب",
};

type OrderRow = {
  id: string;
  local_order_id: string | null;
  store_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  notes: string | null;
  items: Array<{ name: string; qty: number; price: number }> | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  driver_id: string | null;
  created_at: string;
  customer_lat: number | null;
  customer_lng: number | null;
};

const DRIVER_POOL_STATUSES = ["searching_driver", "accepted", "preparing", "ready"];

export function GlobalOrderListener() {
  const { user, roles, loading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isMerchant = roles.includes("merchant");
  const isDriver = roles.includes("driver");

  // Suppress on the dashboards themselves — those already show their own modal.
  const onMerchantDash = pathname.startsWith("/merchant/dashboard");
  const onDriverDash = pathname.startsWith("/driver/dashboard");

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [incoming, setIncoming] = useState<
    | { variant: "store" | "driver"; row: OrderRow; storeName?: string }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  // Reset seen set + incoming on identity change (login/logout).
  useEffect(() => {
    seen.current = new Set();
    setIncoming(null);
    setStoreId(null);
    setStoreName("");
  }, [user?.id]);

  // Load merchant's store id (single store per owner).
  useEffect(() => {
    if (!user || !isMerchant) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setStoreId((data as { id: string }).id);
      setStoreName((data as { name: string }).name ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isMerchant]);

  const handleMerchantRow = useCallback(
    (row: OrderRow) => {
      if (row.status !== "pending") return;
      if (seen.current.has(row.id)) return;
      seen.current.add(row.id);
      setIncoming((cur) =>
        cur ?? { variant: "store", row, storeName },
      );
    },
    [storeName],
  );

  const handleDriverRow = useCallback(
    async (row: OrderRow) => {
      if (row.driver_id !== null) return;
      if (!DRIVER_POOL_STATUSES.includes(row.status)) return;
      if (seen.current.has(row.id)) return;

      // Only notify if the driver is currently marked available.
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_available")
        .eq("id", user.id)
        .maybeSingle();
      const p = prof as { is_available?: boolean } | null;
      if (!p?.is_available) return;


      let sName = "";
      const { data: s } = await supabase
        .from("stores")
        .select("name")
        .eq("id", row.store_id)
        .maybeSingle();
      sName = (s as { name?: string } | null)?.name ?? "";

      seen.current.add(row.id);
      setIncoming((cur) =>
        cur ?? { variant: "driver", row, storeName: sName },
      );
    },
    [user],
  );

  // Merchant channel — scoped to this store's orders only.
  useEffect(() => {
    if (!user || !isMerchant || !storeId || onMerchantDash) return;
    const ch = supabase
      .channel(`global_merchant_orders_${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => handleMerchantRow(payload.new as OrderRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isMerchant, storeId, onMerchantDash, handleMerchantRow]);

  // Driver channel — RLS scopes what the driver can see. We look at INSERT
  // (new orders directly in searching_driver) and UPDATE (merchant accepted
  // an order which flips its status into the pool).
  useEffect(() => {
    if (!user || !isDriver || onDriverDash) return;
    const ch = supabase
      .channel(`global_driver_orders_${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_orders" },
        (payload) => {
          void handleDriverRow(payload.new as OrderRow);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_orders" },
        (payload) => {
          void handleDriverRow(payload.new as OrderRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isDriver, onDriverDash, handleDriverRow]);

  // Status-update alerts — merchant's own store orders and the driver's
  // assigned orders. Plays a chime + toast on ANY screen so the user notices
  // updates without opening the dashboard.
  useEffect(() => {
    if (!user || (!isMerchant && !isDriver)) return;
    const chans: ReturnType<typeof supabase.channel>[] = [];

    const alert = (row: OrderRow, prev?: OrderRow) => {
      if (prev && prev.status === row.status) return;
      const label = STATUS_AR[row.status] ?? row.status;
      const num = (row.local_order_id ?? row.id).slice(-6).toUpperCase();
      playAlertTone(1);
      toast(`تحديث الطلب #${num}`, { description: label, duration: 8000 });
    };

    if (isMerchant && storeId) {
      chans.push(
        supabase
          .channel(`global_merchant_status_${storeId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "customer_orders",
              filter: `store_id=eq.${storeId}`,
            },
            (payload) => alert(payload.new as OrderRow, payload.old as OrderRow),
          )
          .subscribe(),
      );
    }

    if (isDriver) {
      chans.push(
        supabase
          .channel(`global_driver_status_${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "customer_orders",
              filter: `driver_id=eq.${user.id}`,
            },
            (payload) => alert(payload.new as OrderRow, payload.old as OrderRow),
          )
          .subscribe(),
      );
    }

    return () => {
      chans.forEach((c) => supabase.removeChannel(c));
    };
  }, [user, isMerchant, isDriver, storeId]);


  if (loading || !user || !incoming) return null;
  if (incoming.variant === "store" && onMerchantDash) return null;
  if (incoming.variant === "driver" && onDriverDash) return null;

  const { variant, row } = incoming;

  const close = () => setIncoming(null);

  const data: IncomingOrderData = {
    id: row.id,
    local_order_id: row.local_order_id,
    store_name: incoming.storeName,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    address: row.address,
    notes: row.notes,
    items: row.items ?? undefined,
    subtotal: row.subtotal,
    delivery_fee: row.delivery_fee,
    total: row.total,
    created_at: row.created_at,
    customer_lat: row.customer_lat,
    customer_lng: row.customer_lng,
  };

  const onAccept = async () => {
    setBusy(true);
    try {
      if (variant === "store") {
        await supabase
          .from("customer_orders")
          .update({ status: "searching_driver" })
          .eq("id", row.id);
        try {
          await notifyDriversForOrder({ data: { order_id: row.id } });
        } catch (e) {
          console.error("[global] notify drivers failed", e);
        }
        router.navigate({ to: "/merchant/dashboard" });
      } else {
        const acceptedAt = new Date();
        const { data: claim, error } = await supabase
          .from("customer_orders")
          .update({
            driver_id: user.id,
            status: "driver_assigned",
            accepted_at: acceptedAt.toISOString(),
          })
          .eq("id", row.id)
          .is("driver_id", null)
          .select("id")
          .maybeSingle();
        if (error || !claim) {
          alert(error?.message ? `تعذر قبول الطلب: ${error.message}` : "تم استلام هذا الطلب من قِبل مندوب آخر");
        } else {
          router.navigate({ to: "/driver/dashboard" });
        }

      }
    } finally {
      setBusy(false);
      close();
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      if (variant === "store") {
        await supabase
          .from("customer_orders")
          .update({ status: "rejected" })
          .eq("id", row.id);
      }
      // For drivers, "reject" simply dismisses — the order stays in the pool.
    } finally {
      setBusy(false);
      close();
    }
  };

  const onTimeout = async () => {
    try {
      if (variant === "store") {
        await supabase
          .from("customer_orders")
          .update({ status: "missed" })
          .eq("id", row.id);
      }
    } finally {
      close();
    }
  };

  return (
    <IncomingOrderModal
      variant={variant}
      order={data}
      onAccept={onAccept}
      onReject={onReject}
      onTimeout={onTimeout}
      busy={busy}
    />
  );
}
