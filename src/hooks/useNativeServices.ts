// Requests only the native LOCAL NOTIFICATIONS permission, and only on a real
// native (Capacitor) device, deferred until the app is idle.
// Geolocation is NEVER requested automatically — it is requested only when the
// user taps "تحديد موقعي".

import { useEffect } from "react";

const ASKED_KEY = "thawani-native-perms-asked";

function isNative(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

export async function requestNativePermissions() {
  if (typeof window === "undefined" || !isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "prompt" || current.display === "prompt-with-rationale") {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // plugin unavailable — no-op
  }
}

export function useNativeServices() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNative()) return;
    if (localStorage.getItem(ASKED_KEY)) return;

    const run = () => {
      localStorage.setItem(ASKED_KEY, "1");
      void requestNativePermissions();
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(run) : window.setTimeout(run, 2000);
    return () => {
      if (!w.requestIdleCallback) clearTimeout(id);
    };
  }, []);
}
