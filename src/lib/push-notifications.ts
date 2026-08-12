// Client-side push notification setup for merchants and drivers.
// - Registers the device with FCM via the Capacitor plugin
// - Sends the token to our backend
// - Handles taps to deep-link to the correct dashboard
//
// Safe to import on the web: if the plugin can't register (browser / no
// native runtime), everything becomes a no-op.

import type { AppRole } from "./auth";

let initialized = false;
let currentUserRole: "merchant" | "driver" | null = null;

async function loadPlugin() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null; // web: plugin unavailable
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

function pickRole(roles: AppRole[]): "merchant" | "driver" | null {
  if (roles.includes("driver")) return "driver";
  if (roles.includes("merchant")) return "merchant";
  return null;
}

async function sendTokenToServer(token: string, role: "merchant" | "driver") {
  try {
    const { registerDeviceToken } = await import("./device-tokens.functions");
    await registerDeviceToken({ data: { token, platform: "android", role } });
  } catch (err) {
    console.error("[push] registerDeviceToken failed", err);
  }
}

export async function initPushNotifications(
  roles: AppRole[],
  navigate: (path: string) => void,
) {
  const role = pickRole(roles);
  if (!role) return;
  currentUserRole = role;
  if (initialized) return;

  const PushNotifications = await loadPlugin();
  if (!PushNotifications) return; // web / no native runtime

  try {
    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status !== "granted") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    initialized = true;

    await PushNotifications.addListener("registration", (t) => {
      if (currentUserRole) void sendTokenToServer(t.value, currentUserRole);
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration error", err);
    });

    // Tap on notification from background/terminated
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = (action.notification.data ?? {}) as Record<string, string>;
      const route = data.route || (currentUserRole === "driver" ? "/driver.dashboard" : "/merchant.dashboard");
      try {
        navigate(route);
      } catch (e) {
        console.error("[push] navigate failed", e);
      }
    });

    // Foreground receive — the in-app IncomingOrderModal already handles ringing
    // via realtime, so we don't duplicate UI here.
    await PushNotifications.addListener("pushNotificationReceived", (n) => {
      console.log("[push] foreground notification", n.title);
    });

    await PushNotifications.register();
  } catch (err) {
    console.error("[push] init failed", err);
  }
}

export function updatePushRole(roles: AppRole[]) {
  currentUserRole = pickRole(roles);
}

export type PushPermState = "unsupported" | "granted" | "denied" | "prompt";

export async function getPushPermissionStatus(): Promise<PushPermState> {
  const PushNotifications = await loadPlugin();
  if (!PushNotifications) return "unsupported";
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") return "granted";
    if (perm.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

export async function requestPushPermission(
  roles: AppRole[],
  navigate: (path: string) => void,
): Promise<PushPermState> {
  const PushNotifications = await loadPlugin();
  if (!PushNotifications) return "unsupported";
  try {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") {
      return req.receive === "denied" ? "denied" : "prompt";
    }
    await initPushNotifications(roles, navigate);
    return "granted";
  } catch {
    return "unsupported";
  }
}
