import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "../integrations/supabase/client";
import { deleteMyAccount } from "../lib/account.functions";

export function DeleteAccountButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const del = useServerFn(deleteMyAccount);

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await del();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setErr("تعذّر حذف الحساب، حاول مرة أخرى.");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-black text-destructive-foreground shadow-soft ${className}`}
      >
        <Trash2 className="h-4 w-4" /> حذف الحساب
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-elegant">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>
            <p className="text-center text-sm font-black text-foreground">هل أنت متأكد؟</p>
            <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
              سيؤدي هذا الإجراء إلى حذف جميع بياناتك وتفاصيل حسابك بشكل نهائي ولا يمكن التراجع عنه.
            </p>
            {err && (
              <p className="mt-3 text-center text-xs font-bold text-destructive">{err}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-2xl bg-muted py-3 text-sm font-black text-foreground disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-black text-destructive-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
