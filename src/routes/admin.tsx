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
  Image as ImageIcon,
  MapPin,
  Plus,
  Pencil,
  Package,
  Upload,
  ShoppingBag,
  LifeBuoy,
  Car,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import {
  adminActOnApplication,
  adminSaveAd,
  adminDeleteAd,
  adminSaveArea,
  adminDeleteArea,
  adminSaveStore,
  adminDeleteStore,
  adminSaveProduct,
  adminDeleteProduct,
  adminSetDriverAreas,
  adminListOrders,
  adminUpdateOrderStatus,
  adminSendBroadcast,
  adminDeleteBroadcast,

} from "../lib/admin.functions";
import { compressImageToDataUrl } from "../lib/image-compress";
import { AdminSupportChat } from "../components/AdminSupportChat";
import {
  adminListTaxi,
  adminCreateTaxiDriver,
  adminSetTaxiDriverActive,
  adminDeleteTaxiDriver,
} from "../lib/taxi.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Section = "apps" | "orders" | "stores" | "drivers" | "taxi" | "ads" | "areas" | "notifs" | "support";
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
        <nav className="no-scrollbar flex gap-2 overflow-x-auto rounded-2xl bg-muted p-1">
          <SectionBtn active={section === "apps"} onClick={() => setSection("apps")} icon={<FileText className="h-4 w-4" />}>
            الطلبات
          </SectionBtn>
          <SectionBtn active={section === "orders"} onClick={() => setSection("orders")} icon={<ShoppingBag className="h-4 w-4" />}>
            طلبات الزبائن
          </SectionBtn>
          <SectionBtn active={section === "stores"} onClick={() => setSection("stores")} icon={<Store className="h-4 w-4" />}>
            المتاجر
          </SectionBtn>
          <SectionBtn active={section === "drivers"} onClick={() => setSection("drivers")} icon={<Bike className="h-4 w-4" />}>
            المندوبين
          </SectionBtn>
          <SectionBtn active={section === "taxi"} onClick={() => setSection("taxi")} icon={<Car className="h-4 w-4" />}>
            تكسي
          </SectionBtn>
          <SectionBtn active={section === "ads"} onClick={() => setSection("ads")} icon={<ImageIcon className="h-4 w-4" />}>
            الإعلانات
          </SectionBtn>
          <SectionBtn active={section === "areas"} onClick={() => setSection("areas")} icon={<MapPin className="h-4 w-4" />}>
            المناطق
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
          <SectionBtn active={section === "support"} onClick={() => setSection("support")} icon={<LifeBuoy className="h-4 w-4" />}>
            دردشة الدعم
          </SectionBtn>
        </nav>

        {section === "apps" && <ApplicationsPanel />}
        {section === "orders" && <OrdersPanel />}
        {section === "stores" && <StoresPanel />}
        {section === "drivers" && <DriversPanel />}
        {section === "taxi" && <TaxiPanel />}
        {section === "ads" && <AdsPanel />}
        {section === "areas" && <AreasPanel />}
        {section === "notifs" && <NotificationsPanel />}
        {section === "support" && <AdminSupportChat />}
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
    const ch = supabase
      .channel(`admin_apps_${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, table]);

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

/* ---------------- Helpers ---------------- */

function getAdminPass(): string {
  try {
    return (
      sessionStorage.getItem("thawani_admin_pass") ||
      localStorage.getItem("thawani_admin_pass") ||
      ""
    );
  } catch {
    return "";
  }
}

/* ---------------- Stores ---------------- */

type StoreFull = StoreRow & {
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  delivery_available?: boolean;
  commission_type?: string;
  commission_amount?: number;
};

const STORE_CATEGORIES: { value: string; label: string }[] = [
  { value: "restaurants", label: "مطعم" },
  { value: "cosmetics", label: "كوزمتك" },
  { value: "grocery", label: "بقالة" },
  { value: "sweets", label: "حلويات" },
  { value: "drinks", label: "مشروبات" },
];

function StoresPanel() {
  const [rows, setRows] = useState<StoreFull[]>([]);
  const [fetching, setFetching] = useState(false);
  const [editing, setEditing] = useState<StoreFull | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingProducts, setManagingProducts] = useState<StoreRow | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as StoreFull[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_stores")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const password = getAdminPass();

  const toggleOpen = async (r: StoreFull) => {
    await adminSaveStore({
      data: {
        password, id: r.id, name: r.name, category: r.category, phone: r.phone,
        address: r.address ?? null, description: r.description ?? null,
        working_hours: r.working_hours, logo_url: r.logo_url ?? null, cover_url: r.cover_url ?? null,
        latitude: r.latitude ?? null, longitude: r.longitude ?? null,
        commission_rate: Number(r.commission_rate),
        commission_type: (r.commission_type as "percent" | "fixed") ?? "percent",
        commission_amount: Number(r.commission_amount ?? 0),
        delivery_available: r.delivery_available ?? true,
        is_open: !r.is_open,
      },
    });
  };
  const toggleStatus = async (r: StoreFull) => {
    await supabase
      .from("stores")
      .update({ status: r.status === "active" ? "suspended" : "active" })
      .eq("id", r.id);
  };
  const remove = async (r: StoreFull) => {
    if (!window.confirm(`حذف المتجر "${r.name}"؟`)) return;
    try {
      await adminDeleteStore({ data: { password, id: r.id } });
    } catch (e) { window.alert((e as Error).message); }
  };

  if (managingProducts) {
    return <ProductsPanel store={managingProducts} onBack={() => setManagingProducts(null)} />;
  }

  return (
    <section className="space-y-3">
      <button
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground shadow-soft"
      >
        <Plus className="h-4 w-4" /> إضافة متجر
      </button>

      {fetching && rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          لا توجد متاجر مسجّلة بعد. اضغط على "إضافة متجر" لبدء الإضافة.
        </p>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
            {r.cover_url && (
              <img src={r.cover_url} alt="" className="h-24 w-full object-cover" />
            )}
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-black">{r.name}</p>
                    {r.category && (
                      <p className="text-xs text-muted-foreground">
                        {STORE_CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}
                      </p>
                    )}
                    {r.phone && <p className="text-xs text-muted-foreground" dir="ltr">{r.phone}</p>}
                    <p className="mt-1 text-xs font-bold text-primary">
                      <Percent className="inline h-3 w-3" /> {r.commission_type === "fixed"
                        ? `${Number(r.commission_amount ?? 0).toLocaleString("ar-IQ")} د.ع`
                        : `${r.commission_rate}%`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] font-black">
                  <Badge tone={r.is_open ? "success" : "muted"}>{r.is_open ? "متاح" : "مغلق"}</Badge>
                  <Badge tone={r.status === "active" ? "success" : "danger"}>
                    {r.status === "active" ? "نشط" : "موقوف"}
                  </Badge>
                  {r.delivery_available === false && <Badge tone="muted">بدون توصيل</Badge>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <IconBtn onClick={() => setManagingProducts(r)} label="المنتجات">
                  <Package className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => setEditing(r)} label="تعديل">
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => toggleOpen(r)} label={r.is_open ? "إغلاق" : "فتح"}>
                  <Power className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => toggleStatus(r)} label={r.status === "active" ? "إيقاف" : "تفعيل"}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => remove(r)} label="حذف" tone="danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          </article>
        ))
      )}

      {(creating || editing) && (
        <StoreEditor
          store={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </section>
  );
}

function StoreEditor({
  store, onClose, onSaved,
}: { store: StoreFull | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(store?.name ?? "");
  const [category, setCategory] = useState(store?.category ?? "restaurants");
  const [phone, setPhone] = useState(store?.phone ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [description, setDescription] = useState(store?.description ?? "");
  const [hours, setHours] = useState(store?.working_hours ?? "");
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">(
    (store?.commission_type as "percent" | "fixed") ?? "percent",
  );
  const [commissionRate, setCommissionRate] = useState(String(store?.commission_rate ?? 15));
  const [commissionAmount, setCommissionAmount] = useState(String(store?.commission_amount ?? 0));
  const [logoUrl, setLogoUrl] = useState<string>(store?.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState<string>(store?.cover_url ?? "");
  const [latitude, setLatitude] = useState<string>(store?.latitude != null ? String(store.latitude) : "");
  const [longitude, setLongitude] = useState<string>(store?.longitude != null ? String(store.longitude) : "");
  const [isOpen, setIsOpen] = useState<boolean>(store?.is_open ?? true);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean>(store?.delivery_available ?? true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoUrl(await compressImageToDataUrl(f, { maxWidth: 400, quality: 0.75 }));
  };
  const pickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverUrl(await compressImageToDataUrl(f, { maxWidth: 1400, quality: 0.75 }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { window.alert("الموقع الجغرافي غير مدعوم"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { setLocating(false); window.alert("تعذّر تحديد الموقع"); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const save = async () => {
    if (!name.trim()) { window.alert("اسم المتجر مطلوب"); return; }
    setSaving(true);
    try {
      await adminSaveStore({
        data: {
          password: getAdminPass(),
          id: store?.id,
          name: name.trim(),
          category: category || null,
          phone: phone || null,
          address: address || null,
          description: description || null,
          working_hours: hours || null,
          logo_url: logoUrl || null,
          cover_url: coverUrl || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          commission_rate: Number(commissionRate) || 0,
          commission_type: commissionType,
          commission_amount: Number(commissionAmount) || 0,
          delivery_available: deliveryAvailable,
          is_open: isOpen,
        },
      });
      onSaved();
    } catch (e) { window.alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal title={store ? "تعديل المتجر" : "متجر جديد"} onClose={onClose}>
      <ImagePicker url={coverUrl} onPick={pickCover} label="صورة الغلاف" />
      <ImagePicker url={logoUrl} onPick={pickLogo} label="شعار المتجر" />
      <Field label="اسم المتجر" value={name} onChange={setName} />

      <div>
        <label className="mb-1 block text-xs font-bold text-muted-foreground">التصنيف</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
          {STORE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <Field label="الوصف" value={description} onChange={setDescription} multiline />
      <Field label="الهاتف" value={phone} onChange={setPhone} dir="ltr" />
      <Field label="العنوان" value={address} onChange={setAddress} />

      <div className="space-y-2">
        <label className="block text-xs font-bold text-muted-foreground">الموقع على الخريطة</label>
        <div className="grid grid-cols-2 gap-2">
          <input value={latitude} onChange={(e) => setLatitude(e.target.value)}
            placeholder="خط العرض" dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={longitude} onChange={(e) => setLongitude(e.target.value)}
            placeholder="خط الطول" dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={useMyLocation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-2 text-xs font-black">
          <MapPin className="h-3.5 w-3.5" />
          {locating ? "جارٍ التحديد..." : "استخدام موقعي الحالي"}
        </button>
        {latitude && longitude && (
          <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer"
            className="block text-center text-[11px] font-bold text-primary underline">
            عرض على خرائط جوجل
          </a>
        )}
      </div>

      <Field label="أوقات الدوام" value={hours} onChange={setHours} />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setIsOpen(true)}
          className={`rounded-xl py-2 text-xs font-black ${isOpen ? "bg-success text-success-foreground" : "bg-muted"}`}>
          متاح
        </button>
        <button type="button" onClick={() => setIsOpen(false)}
          className={`rounded-xl py-2 text-xs font-black ${!isOpen ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>
          غير متاح
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
        <span className="text-xs font-bold">التوصيل متاح</span>
        <button type="button" onClick={() => setDeliveryAvailable((v) => !v)}
          className={`h-6 w-11 rounded-full transition-colors ${deliveryAvailable ? "bg-primary" : "bg-border"}`}>
          <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            deliveryAvailable ? "translate-x-0.5" : "translate-x-[22px]"}`} />
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-muted-foreground">العمولة</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setCommissionType("percent")}
            className={`rounded-xl py-2 text-xs font-black ${commissionType === "percent" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            نسبة مئوية %
          </button>
          <button type="button" onClick={() => setCommissionType("fixed")}
            className={`rounded-xl py-2 text-xs font-black ${commissionType === "fixed" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            مبلغ ثابت
          </button>
        </div>
        {commissionType === "percent" ? (
          <Field label="نسبة العمولة %" value={commissionRate} onChange={setCommissionRate} type="number" />
        ) : (
          <Field label="مبلغ العمولة (د.ع)" value={commissionAmount} onChange={setCommissionAmount} type="number" />
        )}
      </div>

      <SaveBtn onClick={save} loading={saving} />
    </Modal>
  );
}

/* ---------------- Products ---------------- */

type ProductRow = {
  id: string;
  store_id: string;
  name_ar: string;
  description: string | null;
  price_iqd: number;
  image_url: string | null;
  category: string | null;
  is_available: boolean;
  sort_order: number;
};

function ProductsPanel({ store, onBack }: { store: StoreRow; onBack: () => void }) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const password = getAdminPass();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products").select("*").eq("store_id", store.id)
      .order("sort_order").order("created_at", { ascending: false });
    setRows((data ?? []) as ProductRow[]);
  }, [store.id]);

  useEffect(() => { load(); }, [load]);

  const del = async (p: ProductRow) => {
    if (!window.confirm(`حذف "${p.name_ar}"؟`)) return;
    try {
      await adminDeleteProduct({ data: { password, id: p.id } });
      load();
    } catch (e) { window.alert((e as Error).message); }
  };
  const toggle = async (p: ProductRow) => {
    try {
      await adminSaveProduct({
        data: {
          password, id: p.id, store_id: p.store_id, name_ar: p.name_ar,
          description: p.description, price_iqd: p.price_iqd, image_url: p.image_url,
          category: p.category, is_available: !p.is_available, sort_order: p.sort_order,
        },
      });
      load();
    } catch (e) { window.alert((e as Error).message); }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-black">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
        <div className="min-w-0 text-right">
          <p className="text-xs text-muted-foreground">منتجات</p>
          <p className="truncate text-sm font-black">{store.name}</p>
        </div>
      </div>
      <button onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground">
        <Plus className="h-4 w-4" /> إضافة منتج جديد
      </button>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          لا توجد منتجات بعد.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-black">{p.name_ar}</p>
                <p className="text-xs font-bold text-primary">{p.price_iqd.toLocaleString("ar-IQ")} د.ع</p>
                <Badge tone={p.is_available ? "success" : "muted"}>{p.is_available ? "متوفر" : "غير متوفر"}</Badge>
                <div className="flex gap-1 pt-1">
                  <IconBtn onClick={() => setEditing(p)} label="تعديل"><Pencil className="h-3 w-3" /></IconBtn>
                  <IconBtn onClick={() => toggle(p)} label={p.is_available ? "إخفاء" : "إظهار"}><Power className="h-3 w-3" /></IconBtn>
                  <IconBtn onClick={() => del(p)} label="حذف" tone="danger"><Trash2 className="h-3 w-3" /></IconBtn>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {(creating || editing) && (
        <ProductEditor
          storeId={store.id}
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </section>
  );
}

function ProductEditor({
  storeId, product, onClose, onSaved,
}: { storeId: string; product: ProductRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name_ar ?? "");
  const [desc, setDesc] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price_iqd ?? ""));
  const [category, setCategory] = useState(product?.category ?? "");
  const [image, setImage] = useState<string>(product?.image_url ?? "");
  const [saving, setSaving] = useState(false);

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await compressImageToDataUrl(f, { maxWidth: 900, quality: 0.75 });
    setImage(url);
  };

  const save = async () => {
    if (!name.trim() || !price) { window.alert("الاسم والسعر مطلوبان"); return; }
    setSaving(true);
    try {
      await adminSaveProduct({
        data: {
          password: getAdminPass(),
          id: product?.id,
          store_id: storeId,
          name_ar: name.trim(),
          description: desc || null,
          price_iqd: Math.round(Number(price) || 0),
          image_url: image || null,
          category: category || null,
          is_available: product?.is_available ?? true,
          sort_order: product?.sort_order ?? 0,
        },
      });
      onSaved();
    } catch (e) { window.alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal title={product ? "تعديل منتج" : "منتج جديد"} onClose={onClose}>
      <ImagePicker url={image} onPick={pickImage} label="صورة المنتج" />
      <Field label="اسم المنتج" value={name} onChange={setName} />
      <Field label="السعر (د.ع)" value={price} onChange={setPrice} type="number" />
      <Field label="التصنيف" value={category} onChange={setCategory} />
      <Field label="الوصف" value={desc} onChange={setDesc} multiline />
      <SaveBtn onClick={save} loading={saving} />
    </Modal>
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

function BroadcastComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState<
    { id: string; title: string; body: string; created_at: string }[]
  >([]);

  const loadSent = useCallback(async () => {
    const { data } = await supabase
      .from("broadcast_notifications")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setSent((data ?? []) as typeof sent);
  }, []);

  useEffect(() => {
    loadSent();
  }, [loadSent]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      await adminSendBroadcast({ data: { title: title.trim() || undefined, body: body.trim() } });
      setTitle("");
      setBody("");
      setMsg("تم إرسال الإشعار للمستخدمين");
      loadSent();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذر الإرسال");
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    try {
      await adminDeleteBroadcast({ data: { id } });
      loadSent();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
      <p className="text-sm font-black">إرسال إشعار جديد</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان الإشعار (اختياري)"
        className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="اكتب نص الإشعار هنا..."
        rows={4}
        className="w-full resize-none rounded-xl bg-muted px-3 py-2.5 text-sm outline-none"
      />
      <button
        onClick={send}
        disabled={sending || !body.trim()}
        className="w-full rounded-full bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
      >
        {sending ? "جارٍ الإرسال..." : "إرسال الإشعار"}
      </button>
      {msg && <p className="text-center text-xs font-bold text-muted-foreground">{msg}</p>}

      {sent.length > 0 && (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <p className="text-[11px] font-black text-muted-foreground">الإشعارات المرسلة</p>
          {sent.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-xl bg-muted/60 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("ar-IQ")}
                </p>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="rounded-lg p-1.5 text-destructive"
                aria-label="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



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
    <section className="space-y-4">
      <BroadcastComposer />

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

/* ---------------- Ads ---------------- */

type AdRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
  category: string | null;
  is_active: boolean;
  sort_order: number;
};

function AdsPanel() {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [editing, setEditing] = useState<AdRow | null>(null);
  const [creating, setCreating] = useState(false);
  const password = getAdminPass();

  const load = useCallback(async () => {
    const { data } = await supabase.from("advertisements").select("*").order("sort_order").order("created_at", { ascending: false });
    setRows((data ?? []) as AdRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: AdRow) => {
    try {
      await adminSaveAd({
        data: { password, id: r.id, title: r.title, image_url: r.image_url, link_url: r.link_url,
                position: r.position, category: r.category, is_active: !r.is_active, sort_order: r.sort_order },
      });
      load();
    } catch (e) { window.alert((e as Error).message); }
  };
  const del = async (r: AdRow) => {
    if (!window.confirm(`حذف الإعلان "${r.title}"؟`)) return;
    try { await adminDeleteAd({ data: { password, id: r.id } }); load(); }
    catch (e) { window.alert((e as Error).message); }
  };

  return (
    <section className="space-y-3">
      <button onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground">
        <Plus className="h-4 w-4" /> إعلان جديد
      </button>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">لا توجد إعلانات.</p>
      ) : rows.map((r) => (
        <article key={r.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
          <img src={r.image_url} alt="" className="h-32 w-full object-cover" />
          <div className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.position}{r.category ? ` · ${r.category}` : ""}</p>
              </div>
              <Badge tone={r.is_active ? "success" : "muted"}>{r.is_active ? "نشط" : "متوقف"}</Badge>
            </div>
            <div className="flex gap-2">
              <IconBtn onClick={() => setEditing(r)} label="تعديل"><Pencil className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => toggle(r)} label={r.is_active ? "إيقاف" : "تفعيل"}><Power className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => del(r)} label="حذف" tone="danger"><Trash2 className="h-3.5 w-3.5" /></IconBtn>
            </div>
          </div>
        </article>
      ))}
      {(creating || editing) && (
        <AdEditor
          ad={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </section>
  );
}

function AdEditor({ ad, onClose, onSaved }: { ad: AdRow | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(ad?.title ?? "");
  const [link, setLink] = useState(ad?.link_url ?? "");
  const [pos, setPos] = useState(ad?.position ?? "home_top");
  const [category, setCategory] = useState(ad?.category ?? "");
  const [image, setImage] = useState(ad?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(ad?.sort_order ?? 0));
  const [saving, setSaving] = useState(false);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImage(await compressImageToDataUrl(f, { maxWidth: 1200, quality: 0.8 }));
  };
  const save = async () => {
    if (!title.trim() || !image) { window.alert("العنوان والصورة مطلوبان"); return; }
    setSaving(true);
    try {
      await adminSaveAd({
        data: {
          password: getAdminPass(), id: ad?.id, title: title.trim(), image_url: image,
          link_url: link || null, position: pos, category: category || null,
          is_active: ad?.is_active ?? true, sort_order: Number(sortOrder) || 0,
        },
      });
      onSaved();
    } catch (e) { window.alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal title={ad ? "تعديل إعلان" : "إعلان جديد"} onClose={onClose}>
      <ImagePicker url={image} onPick={pick} label="صورة الإعلان" />
      <Field label="العنوان" value={title} onChange={setTitle} />
      <Field label="الرابط (اختياري)" value={link} onChange={setLink} dir="ltr" />
      <div>
        <label className="mb-1 block text-xs font-bold text-muted-foreground">الموقع</label>
        <select value={pos} onChange={(e) => setPos(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="home_top">الرئيسية - أعلى</option>
          <option value="home_middle">الرئيسية - وسط</option>
          <option value="category">داخل التصنيف</option>
        </select>
      </div>
      <Field label="التصنيف (لموقع category)" value={category} onChange={setCategory} />
      <Field label="ترتيب العرض" value={sortOrder} onChange={setSortOrder} type="number" />
      <SaveBtn onClick={save} loading={saving} />
    </Modal>
  );
}

/* ---------------- Areas ---------------- */

type AreaRow = {
  id: string;
  name_ar: string;
  name_en: string | null;
  city: string | null;
  fee_iqd: number;
  min_order_iqd: number;
  is_active: boolean;
};

function AreasPanel() {
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [editing, setEditing] = useState<AreaRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const password = getAdminPass();

  const load = useCallback(async () => {
    const { data } = await supabase.from("delivery_areas").select("*").order("name_ar");
    setRows((data ?? []) as AreaRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r: AreaRow) => {
    try {
      await adminSaveArea({
        data: { password, id: r.id, name_ar: r.name_ar, name_en: r.name_en, city: r.city,
                fee_iqd: r.fee_iqd, min_order_iqd: r.min_order_iqd, is_active: !r.is_active },
      });
      load();
    } catch (e) { window.alert((e as Error).message); }
  };
  const del = async (r: AreaRow) => {
    if (!window.confirm(`حذف "${r.name_ar}"؟`)) return;
    try { await adminDeleteArea({ data: { password, id: r.id } }); load(); }
    catch (e) { window.alert((e as Error).message); }
  };

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setCreating(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground">
          <Plus className="h-4 w-4" /> منطقة جديدة
        </button>
        <button onClick={() => setAssigning(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-muted py-3 text-sm font-black">
          <Bike className="h-4 w-4" /> إسناد المندوبين
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">لا توجد مناطق.</p>
      ) : rows.map((r) => (
        <article key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">{r.name_ar}</p>
              {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
              <p className="mt-1 text-xs font-bold text-primary">
                رسوم التوصيل: {r.fee_iqd.toLocaleString("ar-IQ")} د.ع
              </p>
              {r.min_order_iqd > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  الحد الأدنى: {r.min_order_iqd.toLocaleString("ar-IQ")} د.ع
                </p>
              )}
            </div>
            <Badge tone={r.is_active ? "success" : "muted"}>{r.is_active ? "نشطة" : "متوقفة"}</Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <IconBtn onClick={() => setEditing(r)} label="تعديل"><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={() => toggle(r)} label={r.is_active ? "إيقاف" : "تفعيل"}><Power className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={() => del(r)} label="حذف" tone="danger"><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
        </article>
      ))}
      {(creating || editing) && (
        <AreaEditor
          area={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
      {assigning && <DriverAreaAssigner areas={rows} onClose={() => setAssigning(false)} />}
    </section>
  );
}

function AreaEditor({ area, onClose, onSaved }: { area: AreaRow | null; onClose: () => void; onSaved: () => void }) {
  const [nameAr, setNameAr] = useState(area?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(area?.name_en ?? "");
  const [city, setCity] = useState(area?.city ?? "");
  const [fee, setFee] = useState(String(area?.fee_iqd ?? 3000));
  const [minOrder, setMinOrder] = useState(String(area?.min_order_iqd ?? 0));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nameAr.trim()) { window.alert("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      await adminSaveArea({
        data: {
          password: getAdminPass(), id: area?.id, name_ar: nameAr.trim(),
          name_en: nameEn || null, city: city || null,
          fee_iqd: Math.round(Number(fee) || 0), min_order_iqd: Math.round(Number(minOrder) || 0),
          is_active: area?.is_active ?? true,
        },
      });
      onSaved();
    } catch (e) { window.alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal title={area ? "تعديل منطقة" : "منطقة جديدة"} onClose={onClose}>
      <Field label="الاسم بالعربية" value={nameAr} onChange={setNameAr} />
      <Field label="الاسم بالإنجليزية" value={nameEn} onChange={setNameEn} dir="ltr" />
      <Field label="المدينة" value={city} onChange={setCity} />
      <Field label="رسوم التوصيل (د.ع)" value={fee} onChange={setFee} type="number" />
      <Field label="الحد الأدنى للطلب (د.ع)" value={minOrder} onChange={setMinOrder} type="number" />
      <SaveBtn onClick={save} loading={saving} />
    </Modal>
  );
}

function DriverAreaAssigner({ areas, onClose }: { areas: AreaRow[]; onClose: () => void }) {
  const [drivers, setDrivers] = useState<{ id: string; full_name: string | null; phone: string | null }[]>([]);
  const [driverId, setDriverId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return;
      const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      setDrivers(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!driverId) { setSelected(new Set()); return; }
    (async () => {
      const { data } = await supabase.from("driver_delivery_areas").select("area_id").eq("driver_id", driverId);
      setSelected(new Set((data ?? []).map((r) => r.area_id)));
    })();
  }, [driverId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const save = async () => {
    if (!driverId) return;
    setSaving(true);
    try {
      await adminSetDriverAreas({
        data: { password: getAdminPass(), driver_id: driverId, area_ids: Array.from(selected) },
      });
      onClose();
    } catch (e) { window.alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal title="إسناد مناطق للمندوب" onClose={onClose}>
      <div>
        <label className="mb-1 block text-xs font-bold text-muted-foreground">المندوب</label>
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="">اختر مندوباً</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.full_name ?? d.phone ?? d.id.slice(0, 8)}</option>
          ))}
        </select>
      </div>
      {driverId && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">المناطق</p>
          <div className="grid grid-cols-2 gap-2">
            {areas.map((a) => (
              <button key={a.id} onClick={() => toggle(a.id)}
                className={`rounded-xl border p-2 text-right text-xs font-bold ${
                  selected.has(a.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}>
                {a.name_ar}
              </button>
            ))}
          </div>
        </div>
      )}
      <SaveBtn onClick={save} loading={saving} disabled={!driverId} />
    </Modal>
  );
}

/* ---------------- Shared UI ---------------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-background p-4 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", dir, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; dir?: "ltr" | "rtl"; multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} dir={dir}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} dir={dir}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      )}
    </div>
  );
}

function ImagePicker({ url, onPick, label }: {
  url: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-muted-foreground">{label}</label>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-3 hover:border-primary">
        {url ? (
          <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <span className="text-xs text-muted-foreground">
          {url ? "تغيير الصورة" : "اختر صورة (يتم ضغطها تلقائياً)"}
        </span>
        <input type="file" accept="image/*" onChange={onPick} className="hidden" />
      </label>
    </div>
  );
}

function SaveBtn({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60">
      {loading ? "جارٍ الحفظ..." : "حفظ"}
    </button>
  );
}


/* ---------------- Customer Orders (Admin) ---------------- */

type AdminOrderRow = {
  id: string;
  local_order_id: string | null;
  store_id: string;
  customer_name: string | null;
  customer_phone: string;
  address: string;
  notes: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
  driver_id: string | null;
  created_at: string;
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "قيد مراجعة المتجر",
  accepted: "مقبول من الإدارة",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  driver_assigned: "تم تعيين المندوب",
  delivered: "تم التوصيل",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [stores, setStores] = useState<Record<string, { id: string; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "done">("pending");

  const load = useCallback(async () => {
    try {
      const res = await adminListOrders();

      setOrders(res.orders as unknown as AdminOrderRow[]);
      setStores(res.stores);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_customer_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_orders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const act = async (id: string, status: string) => {
    const password = sessionStorage.getItem("thawani_admin_pass") ?? "";
    await adminUpdateOrderStatus({ data: { password, id, status: status as "accepted" } });
    await load();
  };

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "pending") return o.status === "pending";
    if (filter === "active") return ["accepted", "preparing", "ready", "driver_assigned"].includes(o.status);
    return ["delivered", "rejected", "cancelled"].includes(o.status);
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-muted p-1">
        {(["pending", "active", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black ${
              filter === f ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            {f === "pending" ? "بانتظار الموافقة" : f === "active" ? "نشطة" : f === "done" ? "منتهية" : "الكل"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد طلبات في هذا القسم.
        </div>
      ) : (
        filtered.map((o) => (
          <article key={o.id} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-foreground" dir="ltr">
                  #{(o.local_order_id ?? o.id).slice(-6).toUpperCase()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("ar-IQ")}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </span>
            </div>

            <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              <p><span className="font-bold text-foreground">المتجر:</span> {stores[o.store_id]?.name ?? "—"}</p>
              <p><span className="font-bold text-foreground">الزبون:</span> {o.customer_name ?? "—"}</p>
              <p dir="ltr"><span className="font-bold text-foreground">الهاتف:</span> {o.customer_phone}</p>
              <p><span className="font-bold text-foreground">العنوان:</span> {o.address}</p>
              {o.notes && <p><span className="font-bold text-foreground">ملاحظات:</span> {o.notes}</p>}
              <p><span className="font-bold text-foreground">الدفع:</span> {o.payment_method === "cod" ? "عند الاستلام" : o.payment_method}</p>
            </div>

            <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs">
              {(o.items ?? []).map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.name} × {it.qty}</span>
                  <span className="text-muted-foreground">{(it.price * it.qty).toLocaleString("ar-IQ")} د.ع</span>
                </div>
              ))}
              <div className="flex justify-between pt-1"><span>التوصيل</span><span>{o.delivery_fee.toLocaleString("ar-IQ")} د.ع</span></div>
              <div className="flex justify-between border-t border-border/60 pt-1 font-black">
                <span>الإجمالي</span>
                <span className="text-primary">{o.total.toLocaleString("ar-IQ")} د.ع</span>
              </div>
            </div>

            {o.status === "pending" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => act(o.id, "rejected")}
                  className="flex items-center justify-center gap-1 rounded-xl bg-destructive/10 py-2.5 text-xs font-black text-destructive"
                >
                  <X className="h-4 w-4" /> رفض
                </button>
                <button
                  onClick={() => act(o.id, "accepted")}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-xs font-black text-primary-foreground"
                >
                  <Check className="h-4 w-4" /> موافقة
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}

/* ---------------- Taxi ---------------- */

type TaxiDriverRow = {
  user_id: string | null;
  phone: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

type TaxiRequestAdminRow = {
  id: string;
  local_ref: string | null;
  customer_name: string | null;
  customer_phone: string;
  address: string;
  notes: string | null;
  status: string;
  driver_phone: string | null;
  created_at: string;
  customer_lat: number | null;
  customer_lng: number | null;
};

const TAXI_STATUS_AR: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "تم القبول",
  delivered: "تم التسليم",
  rejected: "مرفوض",
};

function TaxiPanel() {
  const [drivers, setDrivers] = useState<TaxiDriverRow[]>([]);
  const [requests, setRequests] = useState<TaxiRequestAdminRow[]>([]);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminListTaxi();
      setDrivers(res.drivers as TaxiDriverRow[]);
      setRequests(res.requests as unknown as TaxiRequestAdminRow[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-taxi")
      .on("postgres_changes", { event: "*", schema: "public", table: "taxi_requests" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const create = async () => {
    setMsg(null);
    if (phone.trim().length < 6) {
      setMsg("أدخل رقم هاتف صحيح");
      return;
    }
    setBusy(true);
    try {
      await adminCreateTaxiDriver({ data: { phone: phone.trim() } });
      setMsg("تم تخويل الرقم كسائق تكسي");
      setPhone("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذر تخويل الرقم");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-1 text-sm font-black text-foreground">تخويل رقم سائق تكسي</p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          أدخل رقم الهاتف فقط. عند تسجيل دخول صاحب الرقم كزبون تُفعّل له لوحة «طلباتي» للتكسي تلقائياً.
        </p>
        <div className="grid gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            inputMode="numeric"
            placeholder="رقم الهاتف"
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {msg && <p className="mt-2 text-xs font-bold text-muted-foreground">{msg}</p>}
        <button
          onClick={() => void create()}
          disabled={busy}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> إنشاء الحساب
        </button>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-black text-foreground">سائقو التكسي ({drivers.length})</p>
        <div className="space-y-2">
          {drivers.length === 0 && (
            <p className="text-xs text-muted-foreground">لا يوجد سائقون بعد</p>
          )}
          {drivers.map((d) => (
            <div key={d.user_id} className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">
                  {d.full_name || "سائق تكسي"}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {d.phone}
                </p>
              </div>
              <button
                onClick={async () => {
                  await adminSetTaxiDriverActive({
                    data: { user_id: d.user_id, is_active: !d.is_active },
                  });
                  await load();
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                  d.is_active
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {d.is_active ? "مفعّل" : "موقوف"}
              </button>
              <button
                onClick={async () => {
                  await adminDeleteTaxiDriver({ data: { user_id: d.user_id } });
                  await load();
                }}
                className="rounded-full bg-destructive/10 p-2 text-destructive"
                aria-label="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-black text-foreground">طلبات التكسي ({requests.length})</p>
        <div className="space-y-2">
          {requests.length === 0 && <p className="text-xs text-muted-foreground">لا توجد طلبات</p>}
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-foreground">
                  {r.customer_name || "زبون"}{" "}
                  <span className="text-xs font-bold text-muted-foreground" dir="ltr">
                    {r.customer_phone}
                  </span>
                </p>
                <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-black text-muted-foreground">
                  {TAXI_STATUS_AR[r.status] ?? r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.address}</p>
              {r.notes && <p className="text-xs text-muted-foreground">ملاحظات: {r.notes}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">
                السائق: {r.driver_phone ?? "—"} · {new Date(r.created_at).toLocaleString("ar-IQ")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
