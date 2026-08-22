import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import {
  User,
  Moon,
  Sun,
  Monitor,
  FileText,
  Shield,
  LogOut,
  ChevronLeft,
  Store,
  Bike,
  Bell,
  BellOff,
  LifeBuoy,
  Car,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import {
  getPushPermissionStatus,
  requestPushPermission,
  type PushPermState,
} from "../lib/push-notifications";
import { DeleteAccountButton } from "../components/DeleteAccountButton";
import { useIsTaxiDriver } from "../lib/use-taxi-driver";


export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { user, roles, signOut } = useAuth();
  const router = useRouter();
  const isMerchant = roles.includes("merchant");
  const isDriver = roles.includes("driver");
  const { isTaxiDriver } = useIsTaxiDriver();
  const needsPush = !!user && (isMerchant || isDriver);

  const [pushState, setPushState] = useState<PushPermState | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!needsPush) return;
    let cancelled = false;
    (async () => {
      const s = await getPushPermissionStatus();
      if (cancelled) return;
      setPushState(s);
      // Auto-prompt native dialog once if we can still ask.
      if (s === "prompt") {
        setRequesting(true);
        const next = await requestPushPermission(roles, (path) =>
          router.navigate({ to: path }),
        );
        if (!cancelled) {
          setPushState(next);
          setRequesting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsPush, roles, router]);

  const onEnablePush = async () => {
    setRequesting(true);
    const next = await requestPushPermission(roles, (path) =>
      router.navigate({ to: path }),
    );
    setPushState(next);
    setRequesting(false);
  };

  const customerName = (user?.user_metadata?.full_name as string | undefined) || null;
  const phoneDisplay =
    (user?.user_metadata?.phone as string | undefined) ??
    (user?.email ? user.email.replace(/@thawani\.app$/, "") : null);





  return (
    <>
      <header className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="text-2xl font-black text-foreground">حسابي</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <section className="flex items-center gap-4 rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
            <User className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">
              {user ? customerName ?? "زبون ثواني" : "حساب الزبون"}
            </p>
            {user ? (
              <p className="mt-0.5 text-xs opacity-90" dir="ltr">
                {phoneDisplay ?? ""}
              </p>
            ) : (
              <p className="mt-0.5 text-xs opacity-90">
                أنشئ حساب زبون بالاسم ورقم الهاتف لمتابعة طلباتك بسهولة
              </p>
            )}
          </div>
          {!user && (
            <Link
              to="/auth"
              className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-primary shadow-soft"
            >
              دخول الزبائن
            </Link>
          )}
        </section>


        {needsPush && pushState && pushState !== "granted" && (
          <section
            className={`flex items-start gap-3 rounded-2xl p-4 shadow-soft ${
              pushState === "denied"
                ? "bg-destructive/5 border border-destructive/30"
                : "bg-warning/10 border border-warning/30"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                pushState === "denied"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/20 text-warning-foreground"
              }`}
            >
              {pushState === "denied" ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-foreground">
                {pushState === "denied" ? "الإشعارات معطّلة" : "فعّل الإشعارات"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {pushState === "denied"
                  ? "الإشعارات مطلوبة لاستلام الطلبات الجديدة فوراً. يرجى تفعيلها لاحقاً من إعدادات الجهاز → التطبيقات → ثواني → الإشعارات."
                  : pushState === "unsupported"
                  ? "الإشعارات الفورية متاحة عند تثبيت التطبيق على الهاتف."
                  : "اسمح باستلام إشعارات الطلبات الجديدة حتى وأنت خارج التطبيق."}
              </p>
              {pushState === "prompt" && (
                <button
                  onClick={onEnablePush}
                  disabled={requesting}
                  className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-black text-primary-foreground shadow-soft disabled:opacity-60"
                >
                  {requesting ? "جارٍ..." : "تفعيل الإشعارات"}
                </button>
              )}
            </div>
          </section>
        )}


        {/* Store Owners & Drivers sections */}
        <Section title="أصحاب المتاجر">
          <ItemLink
            to={isMerchant ? "/merchant/dashboard" : "/merchant-auth"}
            icon={<Store />}
            label={isMerchant ? "لوحة تحكم المتجر" : "دخول / تسجيل صاحب متجر"}
            trailing={isMerchant ? "مفعّل" : undefined}
          />
        </Section>


        <Section title="المندوبين">
          <ItemLink
            to={isDriver ? "/driver/dashboard" : "/driver-auth"}
            icon={<Bike />}
            label={isDriver ? "لوحة تحكم المندوب" : "دخول / تسجيل مندوب توصيل"}
            trailing={isDriver ? "مفعّل" : undefined}
          />
        </Section>






        <Section title="التكسي">
          <ItemLink
            to={isTaxiDriver ? "/taxi-orders" : "/taxi-login"}
            icon={<Car />}
            label={isTaxiDriver ? "طلباتي" : "دخول سائق تكسي"}
            trailing={isTaxiDriver ? "مفعّل" : undefined}
          />
        </Section>

        <Section title="التطبيق">
          <div className="p-4">
            <p className="mb-3 text-xs font-black text-muted-foreground">المظهر</p>
            <div className="grid grid-cols-3 gap-2">
              <ThemeChip current={theme} value="light" icon={<Sun className="h-4 w-4" />} label="فاتح" onClick={() => setTheme("light")} />
              <ThemeChip current={theme} value="dark" icon={<Moon className="h-4 w-4" />} label="داكن" onClick={() => setTheme("dark")} />
              <ThemeChip current={theme} value="system" icon={<Monitor className="h-4 w-4" />} label="النظام" onClick={() => setTheme("system")} />
            </div>
          </div>
        </Section>



        <Section title="الدعم">
          <ItemLink to="/support" icon={<LifeBuoy />} label="التواصل مع الدعم" />
          <ItemLink to="/terms" icon={<FileText />} label="الشروط والأحكام" />
          <ItemLink to="/privacy" icon={<Shield />} label="سياسة الخصوصية" />
        </Section>

        {user && (
          <>
            <button
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 text-sm font-black text-destructive"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
            <DeleteAccountButton />
          </>
        )}


        <p className="text-center text-[11px] text-muted-foreground">
          ثواني — الإصدار ١٫٠٫٠
        </p>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-soft">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-black text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Item({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-muted/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-primary">
        {icon}
      </div>
      <span className="flex-1 text-sm font-bold text-foreground">{label}</span>
      {trailing && (
        <span className="text-xs font-semibold text-muted-foreground">{trailing}</span>
      )}
      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function ItemLink({
  to,
  icon,
  label,
  trailing,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  trailing?: string;
}) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-muted/50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-primary">
        {icon}
      </div>
      <span className="flex-1 text-sm font-bold text-foreground">{label}</span>
      {trailing && (
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-black text-success">
          {trailing}
        </span>
      )}
      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function ThemeChip({
  current,
  value,
  icon,
  label,
  onClick,
}: {
  current: string;
  value: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border bg-background"
      }`}
    >
      <span className={active ? "text-primary" : "text-foreground"}>{icon}</span>
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}
