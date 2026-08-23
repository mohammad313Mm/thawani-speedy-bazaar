import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Bike, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { normalizePhone, phoneToEmail } from "../lib/phone-auth";
import { submitApplication } from "../lib/apply.functions";
import { currentCoords } from "../lib/use-area";

export const Route = createFileRoute("/apply/driver")({
  component: DriverApplyPage,
});

function DriverApplyPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    if (!normalized || !password) {
      setError("يرجى إدخال رقم الهاتف وكلمة المرور");
      return;
    }

    setBusy(true);
    try {
      const email = phoneToEmail(normalized);
      const fullName = normalized;

      let userId: string | null = null;
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone: normalized } },
      });

      if (signUpErr) {
        const { data: signIn, error: signInErr } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInErr || !signIn.user) {
          setError(
            "هذا الرقم مسجّل مسبقاً بكلمة مرور مختلفة. استخدم رقماً آخر أو سجّل الدخول.",
          );
          return;
        }
        userId = signIn.user.id;
      } else {
        userId = signUp.user?.id ?? null;
      }

      if (!userId) {
        setError("تعذّر إنشاء الحساب، حاول مرة أخرى.");
        return;
      }

      try {
        await submitApplication({
          data: {
            kind: "driver",
            full_name: fullName,
            phone: normalized,
            ...(currentCoords() ?? {}),
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
        return;
      }

      await supabase.auth.signOut();
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="mt-5 text-xl font-black text-foreground">تم استلام طلبك</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          تم استلام طلب التسجيل الخاص بك وهو الآن قيد المراجعة من قبل الإدارة.
          سنقوم بإعلامك عند الموافقة.
        </p>
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="mt-8 h-12 w-full rounded-full bg-primary text-sm font-black text-primary-foreground shadow-elegant"
        >
          العودة إلى حسابي
        </button>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={() => history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-foreground">تسجيل مندوب جديد</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <section className="mb-5 rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <Bike className="h-8 w-8 opacity-90" />
          <p className="mt-2 text-lg font-black">انضم كمندوب توصيل</p>
          <p className="mt-1 text-xs opacity-90">
            أدخل رقم هاتفك وكلمة المرور فقط. سيتم إرسال طلبك للإدارة للموافقة.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <label className="block">
            <span className="text-xs font-black text-foreground">رقم الهاتف</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
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
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-elegant disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          لديك حساب مندوب معتمد؟{" "}
          <Link to="/driver-login" className="font-black text-primary">
            تسجيل الدخول
          </Link>
        </p>
      </main>
    </>
  );
}
