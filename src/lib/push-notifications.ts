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

// Registration failures used to go only to console.error, which is invisible on
// a phone — so a device that never registers looks identical to one that has no
// orders. Record the last stage reached so the profile page can show it.
let lastStep = "لم تبدأ";
let lastError: string | null = null;

type PushPlugin = (typeof import("@capacitor/push-notifications"))["PushNotifications"];

/** Resolve to `fallback` instead of hanging forever. */
function raceTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * The native bridge already exposes every registered plugin on
 * window.Capacitor.Plugins, so read it from there first and skip module
 * loading entirely. On a real device the dynamic import of the plugin chunk
 * never settled — registration froze before it could even check permissions,
 * with no error to show for it. The import stays as the web/dev fallback.
 */
async function loadPlugin(): Promise<PushPlugin | null> {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: Record<string, unknown>;
    };
  }).Capacitor;

  if (bridge?.isNativePlatform?.()) {
    const direct = bridge.Plugins?.PushNotifications;
    if (direct) return direct as PushPlugin;
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null; // web: plugin unavailable
    const mod = await raceTimeout(import("@capacitor/push-notifications"), 8000, null);
    if (!mod) {
      lastStep = "تعذّر تحميل إضافة الإشعارات";
      return null;
    }
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
    lastStep = "حُفظ التوكن في الخادم";
    lastError = null;
  } catch (err) {
    lastStep = "فشل حفظ التوكن في الخادم";
    lastError = err instanceof Error ? err.message : String(err);
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
    lastStep = "وصل التوكن من FCM";
    if (currentUserRole) void sendTokenToServer(t.value, currentUserRole);
  });

  await PushNotifications.addListener("registrationError", (err) => {
    lastStep = "رفض FCM إصدار توكن";
    lastError = JSON.stringify(err);
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
  if (!role) {
    lastStep = "لا يوجد دور عامل (تاجر/سائق/تكسي)";
    return;
  }
  // Keep role/navigate fresh even when registration already happened, so the
  // tap handler always routes with the current user's context.
  currentUserRole = role;
  navigateFn = navigate;
  if (registeredUserId === userId && registeredRole === role) return;

  const PushNotifications = await loadPlugin();
  if (!PushNotifications) {
    lastStep = "ليست بيئة أصلية (متصفح) — الإضافة غير متاحة";
    return;
  }

  try {
    lastStep = "فحص الإذن";
    const perm = await raceTimeout(PushNotifications.checkPermissions(), 8000, null);
    if (!perm) {
      lastStep = "لم يردّ الجسر على فحص الإذن";
      return;
    }
    let status = perm.receive;
    if (status !== "granted") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") {
      lastStep = `الإذن غير ممنوح (${status})`;
      return;
    }

    await ensureChannel(PushNotifications);
    await bindListeners(PushNotifications);

    registeredUserId = userId;
    registeredRole = role;
    lastStep = "طُلب التوكن من FCM — بانتظار الرد";
    await PushNotifications.register();

    // register() normally re-fires `registration`, but if the token is already
    // cached natively we may not get another event — claim it for this user.
    if (lastToken) void sendTokenToServer(lastToken, role);
  } catch (err) {
    registeredUserId = null;
    registeredRole = null;
    lastStep = "تعثّرت التهيئة";
    lastError = err instanceof Error ? err.message : String(err);
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

export type PushDiagnostics = {
  /** "android" | "ios" | "web" as reported by Capacitor. */
  platform: string;
  /** Whether the installed APK actually ships the PushNotifications plugin. */
  pluginAvailable: boolean;
  /** false in a plain browser — then nothing else can work. */
  native: boolean;
  permission: PushPermState;
  /** Device role picked from the app roles, or null when none applies. */
  deviceRole: DeviceRole | null;
  hasToken: boolean;
  /** Last 6 chars only — enough to tell two devices apart, useless to anyone else. */
  tokenTail: string | null;
  step: string;
  error: string | null;
};

/** Snapshot of how far registration got, for the profile screen. */
export async function getPushDiagnostics(): Promise<PushDiagnostics> {
  let platform = "web";
  let pluginAvailable = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    platform = Capacitor.getPlatform();
    pluginAvailable = Capacitor.isPluginAvailable("PushNotifications");
  } catch {
    /* leave the defaults */
  }

  // Without the timeout the panel hangs on "loading" forever — the same silent
  // failure we are trying to expose.
  const permission = await raceTimeout<PushPermState>(
    getPushPermissionStatus(),
    5000,
    "unsupported",
  );
  return {
    platform,
    pluginAvailable,
    native: platform !== "web",
    permission,
    deviceRole: currentUserRole,
    hasToken: !!lastToken,
    tokenTail: lastToken ? lastToken.slice(-6) : null,
    step: lastStep,
    error: lastError,
  };
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
