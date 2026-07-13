import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

const MOCK = [
  {
    id: "n1",
    icon: "🎉",
    title: "خصم ٣٠٪ على المطاعم",
    body: "استخدم كود THAWANI30 قبل انتهاء العرض.",
    time: "قبل دقيقتين",
    unread: true,
  },
  {
    id: "n2",
    icon: "🛵",
    title: "طلبك في الطريق إليك",
    body: "السائق أحمد يوصلك طلبك خلال ١٠ دقائق.",
    time: "قبل ١٥ دقيقة",
    unread: true,
  },
  {
    id: "n3",
    icon: "🛒",
    title: "توصيل مجاني للبقالة",
    body: "على أول طلبين هذا الأسبوع.",
    time: "أمس",
    unread: false,
  },
  {
    id: "n4",
    icon: "⭐",
    title: "قيّم طلبك الأخير",
    body: "شاركنا رأيك في مطعم بغداد الأصيل.",
    time: "قبل يومين",
    unread: false,
  },
];

function NotificationsPage() {
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
        {MOCK.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted">
              <Bell className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-lg font-black">لا توجد إشعارات</h2>
          </div>
        ) : (
          MOCK.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-2xl p-4 shadow-soft ${
                n.unread ? "bg-primary/5" : "bg-card"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-2xl">
                {n.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-foreground">{n.title}</p>
                  {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">{n.time}</p>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
