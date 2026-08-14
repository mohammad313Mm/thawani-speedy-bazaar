import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, LifeBuoy, Send, LogIn } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "التواصل مع الدعم — ثواني" },
      { name: "description", content: "تحدّث مباشرة مع فريق دعم تطبيق ثواني عبر الدردشة وأرسل مشكلتك أو استفسارك." },
      { property: "og:title", content: "التواصل مع الدعم — ثواني" },
      { property: "og:description", content: "دردشة مباشرة مع فريق دعم تطبيق ثواني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

type ChatMsg = {
  id: string;
  sender: "user" | "admin" | "system";
  body: string;
  created_at: string;
};

function SupportPage() {
  const { user, loading } = useAuth();

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

      <main className="mx-auto w-full max-w-2xl px-4 py-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : user ? (
          <SupportChat userId={user.id} />
        ) : (
          <LoginRequired />
        )}
      </main>
    </>
  );
}

function LoginRequired() {
  const navigate = useNavigate();
  return (
    <section className="space-y-4 rounded-3xl bg-card p-6 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <LogIn className="h-7 w-7" />
      </div>
      <p className="text-base font-black">سجّل الدخول للتحدث مع الدعم</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        يجب تسجيل الدخول أو إنشاء حساب كزبون أولاً حتى تتمكن من مراسلة فريق الدعم.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-soft"
        >
          تسجيل الدخول
        </button>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="rounded-full border border-border bg-muted px-5 py-2.5 text-sm font-black text-foreground"
        >
          حساب جديد
        </button>
      </div>
    </section>
  );
}

function SupportChat({ userId }: { userId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("support_chat_messages")
      .select("id,sender,body,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as ChatMsg[]);
    setReady(true);
  }, [userId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`support_chat_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `user_id=eq.${userId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setError(null);
    setSending(true);
    const { error: err } = await supabase
      .from("support_chat_messages")
      .insert({ user_id: userId, sender: "user", body });
    setSending(false);
    if (err) {
      setError("تعذّر إرسال الرسالة، حاول مرة أخرى.");
      return;
    }
    setText("");
    load();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3 rounded-3xl bg-gradient-warm p-4 text-white shadow-elegant">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/25 backdrop-blur">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-black">دعم ثواني</p>
          <p className="mt-0.5 text-[11px] opacity-90">اكتب مشكلتك وسيرد عليك الفريق هنا مباشرة.</p>
        </div>
      </div>

      <div className="min-h-[45vh] space-y-2 overflow-y-auto rounded-3xl bg-muted/40 p-3">
        {!ready ? (
          <p className="py-8 text-center text-xs text-muted-foreground">جارٍ تحميل المحادثة...</p>
        ) : msgs.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            ابدأ المحادثة واكتب مشكلتك أو استفسارك.
          </p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                  m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رسالتك..."
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={send}
          disabled={sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-60"
          aria-label="إرسال"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
