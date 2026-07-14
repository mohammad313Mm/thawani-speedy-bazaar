import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

const ADMIN_PHONE = "07873409638";
const ADMIN_PASSWORD = "09244443Mm";
export const ADMIN_PASS_KEY = "thawani_admin_pass_ok";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const normalizedPhone = phone.trim();
    if (normalizedPhone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
      try {
        // Persistent login: keep signed in until manual logout
        localStorage.setItem(ADMIN_PASS_KEY, "1");
        localStorage.setItem("thawani_admin_pass", password);
        sessionStorage.setItem(ADMIN_PASS_KEY, "1");
        sessionStorage.setItem("thawani_admin_pass", password);
      } catch {
        // ignore
      }
      navigate({ to: "/admin" });
    } else {
      setError("Invalid phone number or password.");
      setLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">دخول الإدارة</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-black">لوحة الإدارة</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              هذه الصفحة خاصة بالإداريين فقط
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-card p-5 shadow-soft">
          <div>
            <label className="mb-1.5 block text-xs font-black text-muted-foreground">
              رقم هاتف المدير
            </label>
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xxxxxxxxx"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black text-muted-foreground">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none focus:border-primary"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs font-black text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </main>
    </>
  );
}
