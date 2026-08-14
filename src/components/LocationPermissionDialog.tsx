import { MapPin, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LocationPermissionDialog({
  open,
  onOpenChange,
  onOpenSettings,
  hint,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenSettings: () => void;
  hint?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-2xl text-right">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-black">تفعيل خدمة الموقع (GPS)</DialogTitle>
          <DialogDescription className="text-xs leading-6">
            يتطلب التطبيق الوصول إلى موقعك لتحديد أقرب المتاجر وحساب تكلفة التوصيل.
          </DialogDescription>
        </DialogHeader>
        {hint && (
          <p className="rounded-xl bg-muted/60 p-2.5 text-[11px] font-medium leading-5 text-foreground">
            {hint}
          </p>
        )}
        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button className="flex-1 gap-1.5 rounded-full font-bold" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
            تفعيل من الإعدادات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
