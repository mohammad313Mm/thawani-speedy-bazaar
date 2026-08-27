// A merchant/driver who never opens the profile page has no way to notice that
// notifications are off, and Android only shows its own dialog once (and never
// at all below Android 13). So surface the state on every screen instead.

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import { useIsTaxiDriver } from "../lib/use-taxi-driver";
import {
  getPushPermissionStatus,
  requestPushPermission,
  type PushPermState,
} from "../lib/push-notifications";

export function PushPermissionNotice() {
  const router = useRouter();
  const { user, roles } = useAuth();
  const { isTaxiDriver } = useIsTaxiDriver();
  const [state, setState] = useState<PushPermState | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  const needsPush =
    !!user && (roles.includes("merchant") || roles.includes("driver") || isTaxiDriver);

  const refresh = useCallback(() => {
    if (!needsPush) return;
    void getPushPermissionStatus().then(setState);
  }, [needsPush]);

  useEffect(() => {
    refresh();
    // Re-check when the user comes back from the system settings screen.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!needsPush || hidden) return null;
  // "unsupported" means a plain browser — nothing to enable there.
  if (state === null || state === "granted" || state === "unsupported") return null;

  const denied = state === "denied";

  const onEnable = async () => {
    if (!user) return;
    setBusy(true);
    const next = await requestPushPermission(user.id, roles, isTaxiDriver, (path) =>
      router.navigate({ to: path }),
    );
    setState(next);
    setBusy(false);
  };

  return (
    <div dir="rtl" className="px-4 pt-3">
      <div
        className={`flex items-start gap-3 rounded-2xl p-3.5 shadow-soft ${
          denied
            ? "border border-destructive/30 bg-destructive/5"
            : "border border-warning/30 bg-warning/10"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            denied ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground"
          }`}
        >
          {denied ? <BellOff className="h-4.5 w-4.5" /> : <Bell className="h-4.5 w-4.5" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">
            {denied ? "الإشعارات معطّلة" : "فعّل الإشعارات"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {denied
              ? "لن تصلك الطلبات الجديدة. فعّلها من: الإعدادات ← التطبيقات ← ثواني ← الإشعارات."
              : "اسمح باستلام إشعارات الطلبات الجديدة حتى وأنت خارج التطبيق."}
          </p>

          {!denied && (
            <button
              onClick={onEnable}
              disabled={busy}
              className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-black text-primary-foreground shadow-soft disabled:opacity-60"
            >
              {busy ? "..." : "تفعيل الإشعارات"}
            </button>
          )}
        </div>

        <button
          onClick={() => setHidden(true)}
          aria-label="إخفاء"
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
