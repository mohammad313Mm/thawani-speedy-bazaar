import { createFileRoute, Link } from "@tanstack/react-router";

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
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { user, roles, signOut } = useAuth();
  const isMerchant = roles.includes("merchant");
  const isDriver = roles.includes("driver");



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
            <p className="text-lg font-black" dir="ltr">
              {user ? phoneDisplay ?? "مرحباً بك" : "مرحباً بك"}
            </p>

            <p className="mt-0.5 text-xs opacity-90">
              {user ? "حسابك مفعّل" : "سجل دخولك لتتبع طلباتك وحفظ عناوينك"}
            </p>
          </div>
          {!user && (
            <Link
              to="/auth"
              className="rounded-full bg-white px-4 py-2 text-xs font-black text-primary shadow-soft"
            >
              دخول
            </Link>
          )}
        </section>

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
            to="/apply/driver"
            icon={<Bike />}
            label={isDriver ? "لوحة تحكم المندوب" : "الانضمام كمندوب توصيل"}
            trailing={isDriver ? "مفعّل" : undefined}
          />
        </Section>

        <Section title="الإدارة">
          <ItemLink to="/admin-login" icon={<ShieldCheck />} label="لوحة الإدارة" />
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
          <Item icon={<FileText />} label="الشروط والأحكام" />
          <ItemLink to="/privacy" icon={<Shield />} label="سياسة الخصوصية" />
        </Section>

        {user && (
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 text-sm font-black text-destructive"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
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
