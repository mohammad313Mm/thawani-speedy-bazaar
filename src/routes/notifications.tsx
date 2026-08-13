import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell } from "lucide-react";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "الإشعارات | ثواني" },
      { name: "description", content: "تابع آخر الإشعارات والعروض من تطبيق ثواني." },
      { property: "og:title", content: "الإشعارات | ثواني" },
      { property: "og:description", content: "تابع آخر الإشعارات والعروض من تطبيق ثواني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Notif = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

function NotificationsPage() {
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("broadcast_notifications")
      .select("id, title, body, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as Notif[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("broadcast_notifs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_notifications" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black">الإشعارات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted">
              <Bell className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-lg font-black">لا توجد إشعارات</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              ستظهر هنا الإشعارات الجديدة فور وصولها.
            </p>
          </div>
        ) : (
          rows.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-foreground">{n.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
