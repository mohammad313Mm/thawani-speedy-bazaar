import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, User as UserIcon, Phone } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { customerSignIn, customerSignUp } from "../lib/customer-auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "دخول الزبائن | ثواني" },
      { name: "description", content: "سجّل دخولك كزبون في تطبيق ثواني بالاسم ورقم الهاتف لمتابعة طلباتك." },
      { property: "og:title", content: "دخول الزبائن | ثواني" },
      { property: "og:description", content: "تسجيل دخول وإنشاء حساب زبون في ثواني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? { next: s.next }
      : {},
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  useEffect(() => {
    if (!loading && user) {
      if (next) window.location.href = next;
      else navigate({ to: "/profile" });
    }
  }, [user, loading, navigate, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await customerSignUp({ data: { fullName, phone } })
          : await customerSignIn({ data: { phone } });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      const { error: sessErr } = await supabase.auth.setSession(res.session);
      if (sessErr) throw sessErr;
      navigate({ to: "/profile" });
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">{mode === "signin" ? "تسجيل الدخول" : "حساب جديد"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-full py-2 text-xs font-black transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "تسجيل دخول" : "حساب جديد"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
          {mode === "signup" && (
            <Field icon={<UserIcon className="h-4 w-4" />} label="الاسم">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="اسمك"
              />
            </Field>
          )}
          <Field icon={<Phone className="h-4 w-4" />} label="رقم الهاتف">
            <input
              required
              inputMode="tel"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="07XX XXX XXXX"
              dir="ltr"
            />
          </Field>

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
            {busy ? "..." : mode === "signin" ? "تسجيل دخول" : "إنشاء الحساب"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}
