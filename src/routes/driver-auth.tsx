import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bike, LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/driver-auth")({
  component: DriverAuthPage,
});

function DriverAuthPage() {
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
          <h1 className="text-lg font-black text-foreground">مندوبو التوصيل</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-warm text-white shadow-elegant">
            <Bike className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">بوابة المندوبين</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              سجّل دخولك إذا كان حسابك مفعّلاً، أو قدّم طلب انضمام جديد
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/driver-login"
            className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft transition-transform active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-base font-black text-foreground">تسجيل الدخول</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                للمندوبين المعتمدين من الإدارة
              </p>
            </div>
          </Link>

          <Link
            to="/apply/driver"
            className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft transition-transform active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-base font-black text-foreground">حساب مندوب جديد</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                قدّم طلب انضمام كمندوب توصيل
              </p>
            </div>
          </Link>
        </div>

        <p className="mt-6 rounded-2xl bg-accent/10 p-4 text-center text-xs text-muted-foreground">
          سيتم مراجعة طلبك من قبل الإدارة. لن تتمكن من الدخول إلى لوحة المندوب
          إلا بعد الموافقة على طلبك.
        </p>
      </main>
    </>
  );
}
