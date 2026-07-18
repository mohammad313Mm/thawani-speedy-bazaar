import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Store, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { normalizePhone, phoneToEmail } from "../lib/phone-auth";

export const Route = createFileRoute("/apply/merchant")({
  component: MerchantApplyPage,
});

function MerchantApplyPage() {
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

      const { error: appErr } = await supabase
        .from("merchant_applications")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            phone: normalized,
            status: "pending",
            email: null,
          },
          { onConflict: "user_id" },
        );

      if (appErr) {
        setError(appErr.message);
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
        <h1 className="mt-5 text-xl font-black text-foreground">
          تم استلام طلبك
        </h1>
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
          <h1 className="text-lg font-black text-foreground">تسجيل صاحب متجر</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <section className="mb-5 rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <Store className="h-8 w-8 opacity-90" />
          <p className="mt-2 text-lg font-black">انضم كصاحب متجر</p>
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
          لديك حساب متجر معتمد؟{" "}
          <Link to="/merchant-login" className="font-black text-primary">
            تسجيل الدخول
          </Link>
        </p>
      </main>
    </>
  );
}


function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "tel" | "text" | "numeric";
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        dir={dir}
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

// Re-exports kept for apply.driver.tsx which shares these UI helpers.
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
      <div className="rounded-2xl bg-accent/20 p-4">
        <p className="text-sm font-black">في انتظار موافقة الإدارة</p>
        <p className="mt-1 text-xs text-muted-foreground">
          سنقوم بمراجعة طلبك قريباً وسنعلمك بالنتيجة.
        </p>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="rounded-2xl bg-success/15 p-4">
        <p className="text-sm font-black text-success">تمت الموافقة على حسابك</p>
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
      <p className="text-sm font-black text-destructive">
        تم رفض طلبك. يرجى التواصل مع الإدارة.
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
