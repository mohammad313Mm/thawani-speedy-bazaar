// Requests only the native permissions we need on first app launch:
// - Local Notifications (show allow/deny dialog)
// - Geolocation (show allow/deny dialog)
// No notification scheduling/sending logic lives here.

import { useEffect } from "react";

const ASKED_KEY = "thawani-native-perms-asked";

async function requestLocalNotificationsPermission() {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "prompt" || current.display === "prompt-with-rationale") {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // web / plugin unavailable — no-op
  }
}

async function requestGeolocationPermission() {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const current = await Geolocation.checkPermissions();
    if (current.location === "prompt" || current.location === "prompt-with-rationale") {
      await Geolocation.requestPermissions();
    }
  } catch {
    // Web fallback: triggers the browser's allow/deny dialog
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }
}

export async function requestNativePermissions() {
  await requestLocalNotificationsPermission();
  await requestGeolocationPermission();
}

export function useNativeServices() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, "1");
    void requestNativePermissions();
  }, []);
}
