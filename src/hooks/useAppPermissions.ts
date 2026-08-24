// Requests push-notification + geolocation permissions on app start.
// Native (Capacitor) only — on the web every step is a safe no-op.

import { useEffect } from "react";

function isNative(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

const MAX_GPS_ATTEMPTS = 3;

async function setupPush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let status = await PushNotifications.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== "granted") return;

    await PushNotifications.addListener("registration", (token) => {
      console.log("[push] FCM token registered");
      void token;
    });
    await PushNotifications.register();
  } catch (err) {
    console.error("[permissions] push setup failed", err);
  }
}

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
  useEffect(() => {
    if (typeof window === "undefined" || !isNative()) return;
    let cancelled = false;
    void (async () => {
      await setupPush();
      if (!cancelled) await setupGeolocation();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export default useAppPermissions;
