import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Car, Loader2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { normalizePhone, phoneToEmail } from "../lib/phone-auth";

export const Route = createFileRoute("/taxi-login")({
  head: () => ({
    meta: [
      { title: "دخول سائق التكسي — ثواني" },
      { name: "description", content: "تسجيل دخول سائق التكسي المخوّل برقم الهاتف وكلمة المرور." },
      { property: "og:title", content: "دخول سائق التكسي — ثواني" },
      { property: "og:description", content: "ادخل إلى لوحة طلبات التكسي الخاصة بك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TaxiLoginPage,
});

function TaxiLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: row } = await supabase
        .from("taxi_drivers")
        .select("user_id, is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (row && (row as { is_active: boolean }).is_active) {
        navigate({ to: "/taxi-orders" });
      }
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized || !password) {
      setError("رقم الهاتف وكلمة المرور مطلوبان");
      return;
    }
    setBusy(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(normalized),
        password,
      });
      if (signErr || !signIn.user) {
        setError("رقم الهاتف أو كلمة المرور غير صحيحة.");
        return;
      }
      const { data: row } = await supabase
        .from("taxi_drivers")
        .select("user_id, is_active")
        .eq("user_id", signIn.user.id)
        .maybeSingle();
      if (!row || !(row as { is_active: boolean }).is_active) {
        await supabase.auth.signOut();
        setError("هذا الحساب غير مخوّل كسائق تكسي. يرجى مراجعة الإدارة.");
        return;
      }
      navigate({ to: "/taxi-orders" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={() => history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-foreground">دخول سائق التكسي</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-warm text-white shadow-elegant">
            <Car className="h-8 w-8" />
          </div>
          <p className="text-xs text-muted-foreground">
            سجّل الدخول بالبيانات التي منحتها لك الإدارة
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <label className="block">
            <span className="text-xs font-black text-foreground">رقم الهاتف</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="numeric"
              placeholder="07XXXXXXXXX"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-foreground">كلمة المرور</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدخول"}
          </button>
        </form>
      </main>
    </>
  );
}
