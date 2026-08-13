import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, LifeBuoy, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "التواصل مع الدعم — ثواني" },
      { name: "description", content: "أرسل مشكلتك أو استفسارك لفريق دعم تطبيق ثواني وسيتم الرد عليك في أقرب وقت." },
      { property: "og:title", content: "التواصل مع الدعم — ثواني" },
      { property: "og:description", content: "أرسل مشكلتك أو استفسارك لفريق دعم تطبيق ثواني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

const MAX_LEN = 1000;

function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone =
    (user?.user_metadata?.phone as string | undefined) ??
    (user?.email ? user.email.replace(/@thawani\.app$/, "") : null);
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;

  const submit = async () => {
    const text = message.trim();
    if (!text) {
      setError("يرجى كتابة المشكلة أو الاستفسار.");
      return;
    }
    if (text.length > MAX_LEN) {
      setError(`الحد الأقصى ${MAX_LEN} حرف.`);
      return;
    }
    setError(null);
    setSending(true);
    const { error: err } = await supabase.from("support_messages").insert({
      user_id: user?.id ?? null,
      full_name: fullName,
      phone,
      message: text,
    });
    setSending(false);
    if (err) {
      setError("تعذّر إرسال الرسالة، حاول مرة أخرى.");
      return;
    }
    setMessage("");
    setSent(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">التواصل مع الدعم</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <section className="flex items-center gap-4 rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/25 backdrop-blur">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black">كيف نقدر نساعدك؟</p>
            <p className="mt-0.5 text-xs opacity-90">
              اكتب مشكلتك أو استفسارك وسيصل فريق الدعم فوراً.
            </p>
          </div>
        </section>

        {sent ? (
          <section className="space-y-4 rounded-2xl border border-primary/25 bg-card p-6 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="text-base font-black text-foreground">تم إرسال مشكلتك بنجاح</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              وصلت رسالتك إلى فريق الدعم، وسيتم مراجعتها والرد عليك في أقرب وقت.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => setSent(false)}
                className="rounded-full border border-border bg-muted px-5 py-2.5 text-sm font-black text-foreground"
              >
                إرسال مشكلة أخرى
              </button>
              <button
                onClick={() => navigate({ to: "/profile" })}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-soft"
              >
                العودة لحسابي
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
            <label htmlFor="support-message" className="block text-sm font-black text-foreground">
              اكتب مشكلتك أو استفسارك
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              rows={8}
              placeholder="اشرح لنا المشكلة بالتفصيل..."
              className="w-full resize-y rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{message.length} / {MAX_LEN}</span>
              {phone && <span dir="ltr">{phone}</span>}
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sending ? "جارٍ الإرسال..." : "إرسال المشكلة"}
            </button>
          </section>
        )}
      </main>
    </>
  );
}
