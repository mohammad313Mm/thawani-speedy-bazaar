// Client-side push notification setup for merchants and drivers.
// - Creates the high-priority Android channel the server sends on
// - Registers the device with FCM via the Capacitor plugin
// - Sends the token to our backend, scoped to the signed-in user
// - Handles taps to deep-link to the correct dashboard
//
// Safe to import on the web: if the plugin can't register (browser / no
// native runtime), everything becomes a no-op.

import type { AppRole } from "./auth";

// Must stay in sync with `channel_id` in src/lib/fcm.server.ts.
const CHANNEL_ID = "orders_high_priority";

const DRIVER_ROUTE = "/driver/dashboard";
const MERCHANT_ROUTE = "/merchant/dashboard";
const TAXI_ROUTE = "/taxi-orders";

/**
 * The role this *device* registers under. "taxi" is not an app_role — taxi
 * drivers sign in as normal customers and are authorized by the admin through
 * the taxi_drivers table (see is_taxi_driver).
 */
export type DeviceRole = "merchant" | "driver" | "taxi";

let listenersBound = false;
let channelReady = false;
/** User id we last completed registration for; null when signed out. */
let registeredUserId: string | null = null;
/** Role we last registered with; a change forces a re-register. */
let registeredRole: DeviceRole | null = null;
/** Last FCM token seen, so we can re-send or unregister it. */
let lastToken: string | null = null;
let currentUserRole: DeviceRole | null = null;
let navigateFn: ((path: string) => void) | null = null;

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

// One device holds one token, and device_tokens is unique per token, so a user
// who is several things at once registers under the first match here.
function pickRole(roles: AppRole[], isTaxiDriver: boolean): DeviceRole | null {
  if (roles.includes("driver")) return "driver";
  if (roles.includes("merchant")) return "merchant";
  if (isTaxiDriver) return "taxi";
  return null;
}

function defaultRoute(): string {
  if (currentUserRole === "driver") return DRIVER_ROUTE;
  if (currentUserRole === "taxi") return TAXI_ROUTE;
  return MERCHANT_ROUTE;
}

async function sendTokenToServer(token: string, role: DeviceRole) {
  try {
    const { registerDeviceToken } = await import("./device-tokens.functions");
    await registerDeviceToken({ data: { token, platform: "android", role } });
  } catch (err) {
    console.error("[push] registerDeviceToken failed", err);
  }
}

// Android 8+ drops the message's priority/sound settings unless the channel it
// names actually exists, so create it before the first notification arrives.
async function ensureChannel(
  PushNotifications: NonNullable<Awaited<ReturnType<typeof loadPlugin>>>,
) {
  if (channelReady) return;
  try {
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: "الطلبات",
      description: "تنبيهات الطلبات الجديدة",
      importance: 5, // IMPORTANCE_HIGH — heads-up banner + sound
      visibility: 1, // VISIBILITY_PUBLIC — visible on the lock screen
      vibration: true,
      lights: true,
    });
    channelReady = true;
  } catch (err) {
    // Non-fatal: notifications still arrive on the fallback channel.
    console.error("[push] createChannel failed", err);
  }
}

async function bindListeners(
  PushNotifications: NonNullable<Awaited<ReturnType<typeof loadPlugin>>>,
) {
  if (listenersBound) return;
  listenersBound = true;

  await PushNotifications.addListener("registration", (t) => {
    lastToken = t.value;
    if (currentUserRole) void sendTokenToServer(t.value, currentUserRole);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    console.error("[push] registration error", err);
  });

  // Tap on notification from background/terminated
  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data = (action.notification.data ?? {}) as Record<string, string>;
    const route = data.route || defaultRoute();
    try {
      navigateFn?.(route);
    } catch (e) {
      console.error("[push] navigate failed", e);
    }
  });

  // Foreground receive — the in-app IncomingOrderModal already handles ringing
  // via realtime, so we don't duplicate UI here.
  await PushNotifications.addListener("pushNotificationReceived", (n) => {
    console.log("[push] foreground notification", n.title);
  });
}

export async function initPushNotifications(
  userId: string,
  roles: AppRole[],
  isTaxiDriver: boolean,
  navigate: (path: string) => void,
) {
  const role = pickRole(roles, isTaxiDriver);
  if (!role) return;
  // Keep role/navigate fresh even when registration already happened, so the
  // tap handler always routes with the current user's context.
  currentUserRole = role;
  navigateFn = navigate;
  if (registeredUserId === userId && registeredRole === role) return;

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

    await ensureChannel(PushNotifications);
    await bindListeners(PushNotifications);

    registeredUserId = userId;
    registeredRole = role;
    await PushNotifications.register();

    // register() normally re-fires `registration`, but if the token is already
    // cached natively we may not get another event — claim it for this user.
    if (lastToken) void sendTokenToServer(lastToken, role);
  } catch (err) {
    registeredUserId = null;
    registeredRole = null;
    console.error("[push] init failed", err);
  }
}

export function updatePushRole(roles: AppRole[], isTaxiDriver: boolean) {
  currentUserRole = pickRole(roles, isTaxiDriver);
}

/** Local-only reset, e.g. when the auth session disappears. */
export function resetPushState() {
  registeredUserId = null;
  registeredRole = null;
  currentUserRole = null;
}

/**
 * Detach this device from the signed-in user. Must run *before* the Supabase
 * sign-out, because removeDeviceToken requires an authenticated session.
 */
export async function disablePushNotifications() {
  const token = lastToken;
  resetPushState();
  if (!token) return;
  try {
    const { removeDeviceToken } = await import("./device-tokens.functions");
    await removeDeviceToken({ data: { token } });
  } catch (err) {
    console.error("[push] removeDeviceToken failed", err);
  }
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
  userId: string,
  roles: AppRole[],
  isTaxiDriver: boolean,
  navigate: (path: string) => void,
): Promise<PushPermState> {
  const PushNotifications = await loadPlugin();
  if (!PushNotifications) return "unsupported";
  try {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") {
      return req.receive === "denied" ? "denied" : "prompt";
    }
    await initPushNotifications(userId, roles, isTaxiDriver, navigate);
    return "granted";
  } catch {
    return "unsupported";
  }
}
