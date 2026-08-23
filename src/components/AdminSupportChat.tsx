import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageCircle, ArrowRight, MapPin } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

type ChatMsg = {
  id: string;
  user_id: string;
  sender: "user" | "admin" | "system";
  body: string;
  created_at: string;
};

type Thread = {
  user_id: string;
  name: string;
  last: string;
  last_at: string;
  areaName: string;
};

export function AdminSupportChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("support_chat_messages")
      .select("id,user_id,sender,body,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data ?? []) as ChatMsg[];
    const map = new Map<string, Thread>();
    for (const m of rows) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, {
          user_id: m.user_id,
          name: m.user_id.slice(0, 8),
          last: m.body,
          last_at: m.created_at,
          areaName: "المنطقة غير محددة",
        });
      }
    }
    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,phone,area_id")
        .in("id", ids);
      const areaIds = new Set<string>();
      for (const p of profs ?? []) {
        if (p.area_id) areaIds.add(p.area_id);
      }
      const areaMap = new Map<string, string>();
      if (areaIds.size) {
        const { data: areas } = await supabase
          .from("delivery_areas")
          .select("id,name_ar")
          .in("id", [...areaIds]);
        for (const a of areas ?? []) {
          areaMap.set(a.id, a.name_ar);
        }
      }
      for (const p of profs ?? []) {
        const t = map.get(p.id);
        if (!t) continue;
        t.name = p.full_name || p.phone || t.name;
        t.areaName = p.area_id ? areaMap.get(p.area_id) || "المنطقة غير محددة" : "المنطقة غير محددة";
      }
    }
    setThreads([...map.values()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_support_threads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_chat_messages" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  if (active) {
    return <AdminThreadView thread={active} onBack={() => setActive(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">محادثات الدعم مع الزبائن</p>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : threads.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          لا توجد محادثات دعم.
        </p>
      ) : (
        threads.map((t) => (
          <button
            key={t.user_id}
            onClick={() => setActive(t)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-right shadow-soft"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black">{t.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{t.last}</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {new Date(t.last_at).toLocaleString("ar-IQ")}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function AdminThreadView({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("support_chat_messages")
      .select("id,user_id,sender,body,created_at")
      .eq("user_id", thread.user_id)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as ChatMsg[]);
  }, [thread.user_id]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin_support_thread_${thread.user_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `user_id=eq.${thread.user_id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, thread.user_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase
      .from("support_chat_messages")
      .insert({ user_id: thread.user_id, sender: "admin", body });
    setSending(false);
    if (!error) {
      setText("");
      load();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-sm font-black">{thread.name}</p>
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3">
        {msgs.map((m) => (
          <Bubble key={m.id} msg={m} mine={m.sender !== "user"} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب رداً..."
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={send}
          disabled={sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Bubble({ msg, mine }: { msg: ChatMsg; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
          mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
        <p className="mt-1 text-[10px] opacity-70">
          {new Date(msg.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
