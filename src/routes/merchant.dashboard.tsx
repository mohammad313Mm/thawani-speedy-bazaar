import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Package,
  ClipboardList,
  Power,
  Plus,
  Pencil,
  Trash2,
  ImagePlus,
  LogOut,
  Loader2,
  Phone,
  MapPin,
  Clock,
  Check,
  X,
  Truck,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { compressImageToDataUrl } from "../lib/image-compress";
import { formatIQD } from "../lib/format";
import { IncomingOrderModal } from "../components/IncomingOrderModal";

export const Route = createFileRoute("/merchant/dashboard")({
  component: MerchantDashboard,
});

type Tab = "products" | "orders" | "status";

type StoreRow = {
  id: string;
  name: string;
  is_open: boolean;
  status: string;
  logo_url: string | null;
  owner_id: string | null;
  category: string | null;
  phone: string | null;
  description: string | null;
};

type ProductRow = {
  id: string;
  store_id: string;
  name_ar: string;
  description: string | null;
  price_iqd: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "rejected"
  | "cancelled"
  | "missed"
  | "searching_driver"
  | "driver_assigned";

type OrderRow = {
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
  status: OrderStatus;
  created_at: string;
  customer_lat: number | null;
  customer_lng: number | null;
};

const ORDER_LABEL: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "تم التسليم للمندوب",
  delivered: "تم التوصيل",
  rejected: "مرفوض",
  cancelled: "ملغي",
  missed: "فاتك الطلب",
  searching_driver: "البحث عن مندوب",
  driver_assigned: "تم تعيين المندوب",
};

function MerchantDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/merchant-login" });
        return;
      }
      setUserId(data.user.id);
      const { data: s } = await supabase
        .from("stores")
        .select("id, name, is_open, status, logo_url, owner_id, category, phone, description")
        .eq("owner_id", data.user.id)
        .maybeSingle();
      if (!s) {
        await supabase.auth.signOut();
        navigate({ to: "/merchant-login" });
        return;
      }
      setStore(s as StoreRow);
      setChecking(false);
    })();
  }, [navigate]);

  // Realtime subscribe to my store row so status toggles reflect instantly
  useEffect(() => {
    if (!store?.id) return;
    const ch = supabase
      .channel(`merchant_store_${store.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stores", filter: `id=eq.${store.id}` },
        (payload) => setStore(payload.new as StoreRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [store?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/merchant-login" });
  };

  if (checking || !store || !userId) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!store.category) {
    return <StoreSetup store={store} onSaved={(s) => setStore(s)} onSignOut={signOut} />;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground">لوحة تحكم المتجر</p>
            <h1 className="text-lg font-black text-foreground">{store.name}</h1>
          </div>
          <button
            onClick={signOut}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            title="خروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mx-auto flex max-w-2xl gap-2 px-4 pb-3">
          <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={<ClipboardList className="h-4 w-4" />} label="الطلبات" />
          <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-4 w-4" />} label="المنتجات" />
          <TabBtn active={tab === "status"} onClick={() => setTab("status")} icon={<Power className="h-4 w-4" />} label="حالة المتجر" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
        {tab === "orders" && <OrdersPanel storeId={store.id} />}
        {tab === "products" && <ProductsPanel storeId={store.id} />}
        {tab === "status" && <StatusPanel store={store} onUpdated={setStore} />}
      </main>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-colors ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ============ ORDERS ============ */

function OrdersPanel({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("customer_orders")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`orders_${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_orders", filter: `store_id=eq.${storeId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    await supabase.from("customer_orders").update({ status }).eq("id", id);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        لا توجد طلبات حتى الآن. ستصلك الطلبات هنا فورًا.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <article key={o.id} className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                طلب #{(o.local_order_id ?? o.id).slice(-6).toUpperCase()}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(o.created_at).toLocaleString("ar-IQ")}
              </p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusChip(o.status)}`}>
              {ORDER_LABEL[o.status]}
            </span>
          </div>

          <div className="space-y-1 border-t border-border/60 pt-2 text-sm">
            <p className="font-bold text-foreground">{o.customer_name ?? "زبون"}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
              <Phone className="h-3 w-3" /> {o.customer_phone}
            </p>
            <p className="flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3" /> {o.address}
            </p>
          </div>

          <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
            {(o.items ?? []).map((it, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-foreground">
                  {it.name} × {it.qty}
                </span>
                <span className="text-muted-foreground">{formatIQD(it.price * it.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-sm font-black">
            <span>الإجمالي</span>
            <span className="text-primary">{formatIQD(o.total)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {o.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus(o.id, "rejected")}
                  className="flex items-center justify-center gap-1 rounded-xl bg-destructive/10 py-2.5 text-xs font-black text-destructive"
                >
                  <X className="h-4 w-4" /> رفض الطلب
                </button>
                <button
                  onClick={() => updateStatus(o.id, "preparing")}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-xs font-black text-primary-foreground"
                >
                  <Check className="h-4 w-4" /> قبول الطلب
                </button>
              </>
            )}
            {o.status === "preparing" && (
              <button
                onClick={() => updateStatus(o.id, "ready")}
                className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-success py-2.5 text-xs font-black text-white"
              >
                <Truck className="h-4 w-4" /> تم تسليم الطلب للمندوب
              </button>
            )}
            {o.status === "ready" && (
              <p className="col-span-2 rounded-xl bg-success/10 py-2.5 text-center text-xs font-black text-success">
                جاهز للاستلام من قبل المندوب
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function statusChip(s: OrderStatus): string {
  switch (s) {
    case "pending": return "bg-warning/15 text-warning";
    case "preparing": return "bg-primary/15 text-primary";
    case "ready": return "bg-success/15 text-success";
    case "delivered": return "bg-success/20 text-success";
    case "rejected":
    case "cancelled": return "bg-destructive/15 text-destructive";
    default: return "bg-muted text-foreground";
  }
}

/* ============ PRODUCTS ============ */

function ProductsPanel({ storeId }: { storeId: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order");
    setProducts((data ?? []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`m_products_${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `store_id=eq.${storeId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-soft"
      >
        <Plus className="h-4 w-4" /> إضافة منتج
      </button>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد منتجات بعد.
        </div>
      ) : (
        products.map((p) => (
          <article key={p.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-foreground">{p.name_ar}</p>
              {p.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              )}
              <p className="mt-1 text-sm font-black text-primary">{formatIQD(p.price_iqd)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setEditing(p)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(p.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))
      )}

      {(editing || creating) && (
        <ProductEditor
          storeId={storeId}
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  storeId,
  initial,
  onClose,
}: {
  storeId: string;
  initial: ProductRow | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name_ar ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [price, setPrice] = useState<string>(String(initial?.price_iqd ?? ""));
  const [image, setImage] = useState<string | null>(initial?.image_url ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = async (f: File) => {
    try {
      const url = await compressImageToDataUrl(f, { maxWidth: 1000, quality: 0.75 });
      setImage(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const save = async () => {
    setErr(null);
    const priceNum = Number(price);
    if (!name.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      setErr("الاسم والسعر مطلوبان");
      return;
    }
    setBusy(true);
    try {
      const row = {
        store_id: storeId,
        name_ar: name.trim(),
        description: desc.trim() || null,
        price_iqd: Math.round(priceNum),
        image_url: image,
        is_available: true,
      };
      if (initial) {
        const { error } = await supabase.from("products").update(row).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(row);
        if (error) throw error;
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl">
        <h3 className="mb-3 text-lg font-black text-foreground">
          {initial ? "تعديل المنتج" : "منتج جديد"}
        </h3>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted"
          >
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-bold">إضافة صورة (تُضغط تلقائياً)</span>
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])}
          />

          <label className="block">
            <span className="text-xs font-black">اسم المنتج</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black">السعر (د.ع)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black">الوصف</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          {err && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-black text-foreground"
            >
              إلغاء
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ STATUS ============ */

function StatusPanel({
  store,
  onUpdated,
}: {
  store: StoreRow;
  onUpdated: (s: StoreRow) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isAvailable = useMemo(() => store.is_open && store.status === "active", [store]);

  const toggle = async () => {
    setBusy(true);
    const next = !isAvailable;
    const { data, error } = await supabase
      .from("stores")
      .update({ is_open: next })
      .eq("id", store.id)
      .select("id, name, is_open, status, logo_url, owner_id, category, phone, description")
      .single();
    setBusy(false);
    if (!error && data) onUpdated(data as StoreRow);
  };

  return (
    <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
      <div
        className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
          isAvailable ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        }`}
      >
        <Power className="h-10 w-10" />
      </div>
      <h3 className="mt-4 text-lg font-black text-foreground">
        {isAvailable ? "المتجر متاح للطلبات" : "المتجر غير متاح"}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {isAvailable
          ? "الزبائن يستطيعون رؤية متجرك وإرسال الطلبات الآن."
          : "متجرك يظهر كمُغلق ولا يمكن للزبائن إرسال طلبات."}
      </p>
      <button
        onClick={toggle}
        disabled={busy || store.status !== "active"}
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black shadow-soft disabled:opacity-60 ${
          isAvailable
            ? "bg-destructive text-destructive-foreground"
            : "bg-success text-white"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAvailable ? (
          "إيقاف استقبال الطلبات"
        ) : (
          "تفعيل المتجر"
        )}
      </button>
      {store.status !== "active" && (
        <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-xs font-bold text-warning">
          حسابك موقوف من الإدارة.
        </p>
      )}
    </div>
  );
}

/* ============ STORE SETUP (first-time) ============ */

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "restaurants", label: "مطعم" },
  { value: "cosmetics", label: "كوزمتك" },
  { value: "grocery", label: "بقالة" },
  { value: "sweets", label: "حلويات" },
  { value: "drinks", label: "مشروبات" },
];

function StoreSetup({
  store,
  onSaved,
  onSignOut,
}: {
  store: StoreRow;
  onSaved: (s: StoreRow) => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(store.name ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [description, setDescription] = useState(store.description ?? "");
  const [category, setCategory] = useState<string>("");
  const [logo, setLogo] = useState<string | null>(store.logo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickLogo = async (f: File) => {
    try {
      const url = await compressImageToDataUrl(f, { maxWidth: 600, quality: 0.8 });
      setLogo(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const save = async () => {
    setErr(null);
    if (!name.trim() || !phone.trim() || !description.trim() || !category || !logo) {
      setErr("يرجى تعبئة كافة الحقول ورفع صورة المتجر");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("stores")
      .update({
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
        category,
        logo_url: logo,
        is_open: true,
      })
      .eq("id", store.id)
      .select("id, name, is_open, status, logo_url, owner_id, category, phone, description")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(data as StoreRow);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">إعداد المتجر</p>
          <h1 className="text-xl font-black text-foreground">أكمل معلومات متجرك</h1>
        </div>
        <button
          onClick={onSignOut}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          title="خروج"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-5 rounded-2xl bg-primary/10 p-3 text-xs font-bold text-primary">
        بعد إكمال البيانات سيتم نشر متجرك مباشرة للزبائن.
      </p>

      <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-muted"
          >
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])}
          />
          <p className="text-[11px] text-muted-foreground">شعار / صورة المتجر</p>
        </div>

        <Field label="اسم المتجر">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </Field>

        <Field label="رقم الهاتف">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            inputMode="tel"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </Field>

        <Field label="وصف المتجر">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm"
          />
        </Field>

        <Field label="التصنيف">
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCategory(o.value)}
                className={`h-11 rounded-xl border text-sm font-black transition-colors ${
                  category === o.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        {err && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
            {err}
          </p>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-soft disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ معلومات المتجر"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}
