import { AlertTriangle, Loader2, MapPin, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** رسالة توجيهية تظهر داخل المودال عند فشل تحديد الموقع */
  hint?: string | null;
  /** جارٍ تحديد الموقع */
  busy?: boolean;
  /** إظهار زر فتح إعدادات الجهاز (تطبيق أصلي فقط) */
  showSettings?: boolean;
  onOpenSettings?: () => void;
}

export function LocationPermissionDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  hint,
  busy,
  showSettings,
  onOpenSettings,
}: LocationPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">تفعيل خدمة الموقع</DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            يتطلب التطبيق تشغيل الـ GPS لتحديد موقعك تلقائياً وعرض المتاجر القريبة منك.
          </DialogDescription>
        </DialogHeader>

        {hint ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-right text-xs font-semibold leading-relaxed text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{hint}</span>
          </div>
        ) : null}

        {hint && showSettings ? (
          <button
            onClick={onOpenSettings}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            فتح إعدادات الموقع
          </button>
        ) : null}

        <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-elegant transition-all active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {busy ? "جارٍ التحديد..." : hint ? "إعادة المحاولة" : "تفعيل الـ GPS"}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-muted px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/80 disabled:opacity-60"
          >
            إلغاء
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
