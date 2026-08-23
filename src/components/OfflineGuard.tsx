import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface OfflineGuardProps {
  children: React.ReactNode;
}

export function OfflineGuard({ children }: OfflineGuardProps) {
  const { isOnline, isChecking, check } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
        dir="rtl"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <WifiOff className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">
          أنت غير متصل بالإنترنت
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          يرجى التحقق من اتصالك وإعادة المحاولة.
        </p>
        <button
          onClick={() => check()}
          disabled={isChecking}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
          />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
