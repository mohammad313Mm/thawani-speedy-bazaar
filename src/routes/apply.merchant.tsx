import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Store, Clock } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/apply/merchant")({
  component: MerchantApplyPage,
});

type App = {
  id: string;
  full_name: string;
  phone: string;
  store_name: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
};

function MerchantApplyPage() {
  const { user, loading, roles, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [app, setApp] = useState<App | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("merchant_applications")
      .select("id, full_name, phone, store_name, status, admin_note")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApp(data as App);
          setFullName(data.full_name);
          setPhone(data.phone);
          setStoreName(data.store_name ?? "");
        }
        setFetching(false);
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("merchant_applications")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          phone,
          store_name: storeName || null,
          status: "pending",
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) setError(error.message);
    else setApp(data as App);
    setBusy(false);
  };

  if (loading || fetching) return <Loading />;
  const approved = roles.includes("merchant") || app?.status === "approved";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">الانضمام كصاحب متجر</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <Store className="h-8 w-8 opacity-90" />
          <p className="mt-2 text-lg font-black">انضم كصاحب متجر</p>
          <p className="mt-1 text-xs opacity-90">
            إدارة متجرك، منتجاتك، وطلباتك من مكان واحد بعد موافقة الإدارة.
          </p>
        </section>

        {app && (
          <StatusBanner
            status={approved ? "approved" : app.status}
            note={app.admin_note}
            onRefresh={refreshRoles}
          />
        )}

        {!approved && (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
            <TextField label="الاسم الكامل" value={fullName} onChange={setFullName} required />
            <TextField label="رقم الهاتف" value={phone} onChange={setPhone} required inputMode="tel" />
            <TextField label="اسم المتجر (اختياري)" value={storeName} onChange={setStoreName} />
            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground shadow-elegant disabled:opacity-60"
            >
              {busy ? "..." : app ? "تحديث الطلب" : "إرسال الطلب"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}

export function StatusBanner({
  status,
  note,
  onRefresh,
}: {
  status: "pending" | "approved" | "rejected";
  note?: string | null;
  onRefresh?: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-accent/20 p-4">
        <Clock className="mt-0.5 h-5 w-5 text-foreground" />
        <div>
          <p className="text-sm font-black">في انتظار موافقة الإدارة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            سنقوم بمراجعة طلبك قريباً وسنعلمك بالنتيجة.
          </p>
        </div>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="rounded-2xl bg-success/15 p-4">
        <p className="text-sm font-black text-success">تمت الموافقة على حسابك</p>
        <p className="mt-1 text-xs text-muted-foreground">
          يمكنك الآن الدخول إلى لوحة التحكم الخاصة بك.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-3 rounded-full bg-primary px-4 py-1.5 text-xs font-black text-primary-foreground"
          >
            تحديث
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-destructive/10 p-4">
      <p className="text-sm font-black text-destructive">تم رفض الطلب</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: "tel" | "text";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
