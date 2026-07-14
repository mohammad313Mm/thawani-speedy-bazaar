import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Check,
  X,
  Store,
  Bike,
  ShieldCheck,
  Bell,
  FileText,
  Trash2,
  Power,
  Percent,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { adminActOnApplication } from "../lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Section = "apps" | "stores" | "drivers" | "ads" | "areas" | "notifs";
type AppKind = "merchant" | "driver";

type Application = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  store_name?: string | null;
  vehicle_type?: string | null;
};

type StoreRow = {
  id: string;
  owner_id: string;
  name: string;
  category: string | null;
  phone: string | null;
  is_open: boolean;
  working_hours: string | null;
  commission_rate: number;
  status: "active" | "suspended";
  created_at: string;
};

type DriverProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "suspended";
  created_at: string;
};

type AdminNotif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  ref_table: string | null;
  ref_id: string | null;
  read_at: string | null;
  created_at: string;
};

function AdminPage() {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const [passOk, setPassOk] = useState(false);
  const [section, setSection] = useState<Section>("apps");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    try {
      const ok =
        localStorage.getItem("thawani_admin_pass_ok") === "1" ||
        sessionStorage.getItem("thawani_admin_pass_ok") === "1";
      if (!ok) navigate({ to: "/admin-login" });
      else {
        // mirror to sessionStorage so downstream reads (admin actions) work
        try {
          const pass = localStorage.getItem("thawani_admin_pass");
          if (pass) sessionStorage.setItem("thawani_admin_pass", pass);
          sessionStorage.setItem("thawani_admin_pass_ok", "1");
        } catch {
          // ignore
        }
        setPassOk(true);
      }
    } catch {
      navigate({ to: "/admin-login" });
    }
  }, [navigate]);

  const isAdmin = passOk;


  // realtime unread count for the bell
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { count } = await supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("admin_notifs_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

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
        <p className="text-sm text-muted-foreground">هذه الصفحة مخصصة للمشرفين فقط.</p>
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
        <nav className="grid grid-cols-4 gap-2 rounded-2xl bg-muted p-1">
          <SectionBtn active={section === "apps"} onClick={() => setSection("apps")} icon={<FileText className="h-4 w-4" />}>
            الطلبات
          </SectionBtn>
          <SectionBtn active={section === "stores"} onClick={() => setSection("stores")} icon={<Store className="h-4 w-4" />}>
            المتاجر
          </SectionBtn>
          <SectionBtn active={section === "drivers"} onClick={() => setSection("drivers")} icon={<Bike className="h-4 w-4" />}>
            المندوبين
          </SectionBtn>
          <SectionBtn
            active={section === "notifs"}
            onClick={() => setSection("notifs")}
            icon={
              <span className="relative">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
            }
          >
            الإشعارات
          </SectionBtn>
        </nav>

        {section === "apps" && <ApplicationsPanel />}
        {section === "stores" && <StoresPanel />}
        {section === "drivers" && <DriversPanel />}
        {section === "notifs" && <NotificationsPanel />}
      </main>
    </>
  );
}

/* ---------------- Applications ---------------- */

function ApplicationsPanel() {
  const [tab, setTab] = useState<AppKind>("merchant");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(false);

  const table = tab === "merchant" ? "merchant_applications" : "driver_applications";

  const load = useCallback(async () => {
    setFetching(true);
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Application[]);
    setFetching(false);
  }, [table, status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, next: "approved" | "rejected") => {
    const note = next === "rejected" ? window.prompt("سبب الرفض (اختياري)") : null;
    let password = "";
    try {
      password = sessionStorage.getItem("thawani_admin_pass") ?? "";
    } catch {
      // ignore
    }
    if (!password) {
      password = window.prompt("أعد إدخال كلمة مرور الإدارة") ?? "";
      if (!password) return;
    }
    try {
      await adminActOnApplication({
        data: { password, kind: tab, id, decision: next, note: note || null },
      });
      load();
    } catch (e) {
      window.alert((e as Error).message || "تعذّر تنفيذ الإجراء");
    }
  };

  return (
    <section className="space-y-3">
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
                  {r.email && (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {r.email}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    تاريخ التسجيل: {new Date(r.created_at).toLocaleDateString("ar-IQ")}
                  </p>
                  {tab === "merchant" && r.store_name && (
                    <p className="mt-1 text-xs text-foreground">المتجر: {r.store_name}</p>
                  )}
                  {tab === "driver" && r.vehicle_type && (
                    <p className="mt-1 text-xs text-foreground">المركبة: {r.vehicle_type}</p>
                  )}
                  {r.admin_note && <p className="mt-1 text-xs text-muted-foreground">ملاحظة: {r.admin_note}</p>}
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
    </section>
  );
}

/* ---------------- Stores ---------------- */

function StoresPanel() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as StoreRow[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOpen = async (r: StoreRow) => {
    await supabase.from("stores").update({ is_open: !r.is_open }).eq("id", r.id);
    load();
  };
  const toggleStatus = async (r: StoreRow) => {
    await supabase
      .from("stores")
      .update({ status: r.status === "active" ? "suspended" : "active" })
      .eq("id", r.id);
    load();
  };
  const setCommission = async (r: StoreRow) => {
    const v = window.prompt("نسبة العمولة % لهذا المتجر", String(r.commission_rate));
    if (v == null) return;
    const num = Number(v);
    if (Number.isNaN(num) || num < 0 || num > 100) return;
    await supabase.from("stores").update({ commission_rate: num }).eq("id", r.id);
    load();
  };
  const remove = async (r: StoreRow) => {
    if (!window.confirm(`حذف المتجر "${r.name}"؟`)) return;
    await supabase.from("stores").delete().eq("id", r.id);
    load();
  };

  if (fetching) return <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>;
  if (rows.length === 0)
    return (
      <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
        لا توجد متاجر مسجّلة بعد.
      </p>
    );

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article key={r.id} className="space-y-2 rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">{r.name}</p>
              {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
              {r.phone && (
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {r.phone}
                </p>
              )}
              {r.working_hours && <p className="text-xs text-foreground">الدوام: {r.working_hours}</p>}
              <p className="mt-1 text-xs font-bold text-primary">العمولة: {r.commission_rate}%</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-[10px] font-black">
              <Badge tone={r.is_open ? "success" : "muted"}>{r.is_open ? "مفتوح" : "مغلق"}</Badge>
              <Badge tone={r.status === "active" ? "success" : "danger"}>
                {r.status === "active" ? "نشط" : "موقوف"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <IconBtn onClick={() => toggleOpen(r)} label={r.is_open ? "إغلاق" : "فتح"}>
              <Power className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={() => toggleStatus(r)} label={r.status === "active" ? "إيقاف" : "تفعيل"}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={() => setCommission(r)} label="تعديل العمولة">
              <Percent className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn onClick={() => remove(r)} label="حذف" tone="danger">
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------------- Drivers ---------------- */

function DriversPanel() {
  const [rows, setRows] = useState<DriverProfile[]>([]);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    // fetch user_ids that have driver role, then join profile
    const { data: rolesRows } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const ids = (rolesRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setRows([]);
      setFetching(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, status, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as DriverProfile[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (r: DriverProfile) => {
    await supabase
      .from("profiles")
      .update({ status: r.status === "active" ? "suspended" : "active" })
      .eq("id", r.id);
    load();
  };

  const removeDriverRole = async (r: DriverProfile) => {
    if (!window.confirm(`إزالة صلاحية مندوب عن "${r.full_name ?? ""}"؟`)) return;
    await supabase.from("user_roles").delete().eq("user_id", r.id).eq("role", "driver");
    load();
  };

  if (fetching) return <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>;
  if (rows.length === 0)
    return (
      <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
        لا يوجد مندوبون بعد.
      </p>
    );

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">{r.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {r.phone ?? "—"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                مسجّل منذ {new Date(r.created_at).toLocaleDateString("ar-IQ")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                إحصائيات الطلبات والأرباح تظهر عند تفعيل نظام الطلبات.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={r.status === "active" ? "success" : "danger"}>
                {r.status === "active" ? "نشط" : "موقوف"}
              </Badge>
              <div className="flex gap-2">
                <IconBtn onClick={() => toggleStatus(r)} label={r.status === "active" ? "إيقاف" : "تفعيل"}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => removeDriverRole(r)} label="إزالة" tone="danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------------- Notifications ---------------- */

function NotificationsPanel() {
  const [rows, setRows] = useState<AdminNotif[]>([]);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as AdminNotif[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_notifs_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const markAllRead = async () => {
    await supabase.from("admin_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    load();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">إشعارات إدارية فورية</p>
        <button onClick={markAllRead} className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black">
          تعليم الكل كمقروء
        </button>
      </div>
      {fetching ? (
        <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          لا توجد إشعارات.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl p-3 shadow-soft ${n.read_at ? "bg-card" : "bg-primary/5 ring-1 ring-primary/20"}`}
            >
              <p className="text-sm font-black">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("ar-IQ")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Small UI helpers ---------------- */

function SectionBtn({
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
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-black transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
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

function Badge({ tone, children }: { tone: "success" | "danger" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "danger"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}

function IconBtn({
  onClick,
  label,
  children,
  tone,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black ${
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
