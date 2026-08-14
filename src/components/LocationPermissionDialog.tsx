import { MapPin } from "lucide-react";
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
}

export function LocationPermissionDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
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
        <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
          <button
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-elegant transition-all active:scale-95"
          >
            <MapPin className="h-4 w-4" />
            تفعيل الـ GPS
          </button>
          <button
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-muted px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted/80"
          >
            إلغاء
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
