import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Check, X, Store, Bike, ShieldCheck } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Kind = "merchant" | "driver";
type Application = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  store_name?: string | null;
  vehicle_type?: string | null;
};

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const [tab, setTab] = useState<Kind>("merchant");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const table = tab === "merchant" ? "merchant_applications" : "driver_applications";

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Application[]);
    setFetching(false);
  }, [isAdmin, table, status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, next: "approved" | "rejected") => {
    const note = next === "rejected" ? window.prompt("سبب الرفض (اختياري)") : null;
    await supabase.from(table).update({ status: next, admin_note: note }).eq("id", id);
    load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-black">لوحة الإدارة</h1>
        <p className="text-sm text-muted-foreground">
          هذه الصفحة مخصصة للمشرفين فقط.
        </p>
        <Link
          to="/profile"
          className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground"
        >
          العودة
        </Link>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">لوحة الإدارة</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
          <TabBtn active={tab === "merchant"} onClick={() => setTab("merchant")} icon={<Store className="h-4 w-4" />}>
            أصحاب المتاجر
          </TabBtn>
          <TabBtn active={tab === "driver"} onClick={() => setTab("driver")} icon={<Bike className="h-4 w-4" />}>
            المندوبين
          </TabBtn>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                status === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {s === "pending" ? "قيد المراجعة" : s === "approved" ? "المقبولة" : "المرفوضة"}
            </button>
          ))}
        </div>

        {fetching ? (
          <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
            لا توجد طلبات في هذه القائمة.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <article key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {r.phone}
                    </p>
                    {tab === "merchant" && r.store_name && (
                      <p className="mt-1 text-xs text-foreground">المتجر: {r.store_name}</p>
                    )}
                    {tab === "driver" && r.vehicle_type && (
                      <p className="mt-1 text-xs text-foreground">المركبة: {r.vehicle_type}</p>
                    )}
                    {r.admin_note && (
                      <p className="mt-1 text-xs text-muted-foreground">ملاحظة: {r.admin_note}</p>
                    )}
                  </div>
                  {status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => act(r.id, "approved")}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-success-foreground"
                        title="قبول"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => act(r.id, "rejected")}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        title="رفض"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full py-2 text-xs font-black transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
