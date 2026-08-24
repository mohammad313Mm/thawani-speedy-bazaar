// Requests push-notification + geolocation permissions on app start.
// Native (Capacitor) only — on the web every step is a safe no-op.

import { useEffect } from "react";
import { usePushNotificationPermission } from "./usePushNotificationPermission";

function isNative(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

const MAX_GPS_ATTEMPTS = 3;

async function setupGeolocation(attempt = 1): Promise<void> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    let status = await Geolocation.checkPermissions();
    if (status.location !== "granted") {
      status = await Geolocation.requestPermissions({
        permissions: ["location", "coarseLocation"],
      });
    }

    if (status.location !== "granted") {
      if (attempt < MAX_GPS_ATTEMPTS) {
        alert("عذراً، تطبيق ثواني يتطلب تفعيل الموقع الجغرافي (GPS) لعمل الخدمات بشكل صحيح.");
        return setupGeolocation(attempt + 1);
      }
      return;
    }

    await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
  } catch (err) {
    console.error("[permissions] geolocation setup failed", err);
  }
}

export function useAppPermissions() {
  usePushNotificationPermission();

  useEffect(() => {
    if (typeof window === "undefined" || !isNative()) return;
    let cancelled = false;
    void (async () => {
      if (!cancelled) await setupGeolocation();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export default useAppPermissions;
