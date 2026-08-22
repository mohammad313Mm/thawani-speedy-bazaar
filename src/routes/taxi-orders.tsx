import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Car, Check, Loader2, MapPin, Phone, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { useIsTaxiDriver } from "../lib/use-taxi-driver";
import { useAuth } from "../lib/auth";
import { taxiRespondToRequest } from "../lib/taxi.functions";
import { stopRingtone } from "../lib/alert-sound";
import type { TaxiRequestRow } from "../components/TaxiRequestListener";

export const Route = createFileRoute("/taxi-orders")({
  head: () => ({
    meta: [
      { title: "طلباتي — تكسي ثواني" },
      { name: "description", content: "لوحة طلبات التكسي الخاصة بالسائق المخوّل في تطبيق ثواني." },
      { property: "og:title", content: "طلباتي — تكسي ثواني" },
      { property: "og:description", content: "استقبل طلبات التكسي وتحكم بقبولها وتسليمها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TaxiOrdersPage,
});

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "تم القبول",
  delivered: "تم التسليم",
  rejected: "مرفوض",
};

function TaxiOrdersPage() {
  const { user, loading } = useAuth();
  const { isTaxiDriver, checking } = useIsTaxiDriver();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TaxiRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || checking) return;
    if (!user || !isTaxiDriver) navigate({ to: "/auth" });
  }, [user, isTaxiDriver, loading, checking, navigate]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("taxi_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as unknown as TaxiRequestRow[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!isTaxiDriver) return;
    void load();
    const ch = supabase
      .channel("taxi-orders-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "taxi_requests" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [isTaxiDriver, load]);

  const act = async (id: string, action: "accept" | "reject" | "deliver") => {
    setBusyId(id);
    stopRingtone();
    try {
      await taxiRespondToRequest({ data: { request_id: id, action } });
      toast.success(
        action === "accept" ? "تم قبول الطلب" : action === "reject" ? "تم رفض الطلب" : "تم تسليم الطلب",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(
    (r) => r.status === "pending" || r.driver_id === user?.id,
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-foreground">طلباتي</h1>
            <p className="truncate text-[11px] text-muted-foreground">طلبات التكسي الواردة</p>
          </div>
          <Car className="h-5 w-5 text-primary" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {fetching && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!fetching && visible.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
            لا توجد طلبات حالياً
          </p>
        )}

        {visible.map((r) => (
          <article key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-black text-foreground">
                {r.customer_name || "زبون"}
              </p>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-black text-muted-foreground">
                {STATUS_AR[r.status] ?? r.status}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2" dir="ltr">
                <Phone className="h-4 w-4 shrink-0" /> {r.customer_phone}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {r.address}
              </p>
              {r.notes && <p className="text-xs">ملاحظات: {r.notes}</p>}
              {r.customer_lat != null && r.customer_lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${r.customer_lat},${r.customer_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary"
                >
                  <MapPin className="h-3.5 w-3.5" /> فتح موقع الزبون على الخريطة
                </a>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {r.status === "pending" && (
                <>
                  <button
                    onClick={() => void act(r.id, "reject")}
                    disabled={busyId === r.id}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-black text-destructive disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> رفض الطلب
                  </button>
                  <button
                    onClick={() => void act(r.id, "accept")}
                    disabled={busyId === r.id}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> قبول الطلب
                  </button>
                </>
              )}
              {r.status === "accepted" && r.driver_id === user?.id && (
                <button
                  onClick={() => void act(r.id, "deliver")}
                  disabled={busyId === r.id}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-success py-3 text-sm font-black text-success-foreground disabled:opacity-60"
                >
                  <CheckCheck className="h-4 w-4" /> تم تسليم الطلب
                </button>
              )}
            </div>
          </article>
        ))}
      </main>
    </>
  );
}
