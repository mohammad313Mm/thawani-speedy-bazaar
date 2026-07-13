import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bike } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth";
import { StatusBanner, TextField } from "./apply.merchant";

export const Route = createFileRoute("/apply/driver")({
  component: DriverApplyPage,
});

type App = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  vehicle_type: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
};

function DriverApplyPage() {
  const { user, loading, roles, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [app, setApp] = useState<App | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("driver_applications")
      .select("id, full_name, phone, email, vehicle_type, status, admin_note")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApp(data as App);
          setFullName(data.full_name);
          setPhone(data.phone);
          setEmail(data.email ?? user.email ?? "");
          setVehicle(data.vehicle_type ?? "");
        }
        setFetching(false);
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("driver_applications")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          phone,
          email: email || null,
          vehicle_type: vehicle || null,
          status: "pending",
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) setError(error.message);
    else {
      setApp(data as App);
      setJustSubmitted(true);
    }
    setBusy(false);
  };

  if (loading || fetching)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  const approved = roles.includes("driver") || app?.status === "approved";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-black">الانضمام كمندوب توصيل</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="rounded-3xl bg-gradient-warm p-5 text-white shadow-elegant">
          <Bike className="h-8 w-8 opacity-90" />
          <p className="mt-2 text-lg font-black">انضم كمندوب توصيل</p>
          <p className="mt-1 text-xs opacity-90">
            استلم طلبات توصيل بالقرب منك واكسب دخلاً إضافياً بعد موافقة الإدارة.
          </p>
        </section>

        {app && (
          <StatusBanner
            status={approved ? "approved" : app.status}
            note={app.admin_note}
            onRefresh={refreshRoles}
          />
        )}

        {!approved && (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
            <TextField label="الاسم الكامل" value={fullName} onChange={setFullName} required />
            <TextField label="رقم الهاتف" value={phone} onChange={setPhone} required inputMode="tel" />
            <TextField label="نوع المركبة (اختياري)" value={vehicle} onChange={setVehicle} />
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
              {busy ? "..." : app ? "تحديث الطلب" : "إرسال الطلب"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
