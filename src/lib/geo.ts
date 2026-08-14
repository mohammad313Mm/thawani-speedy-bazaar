export type SavedLocation = {
  label: string;
  lat: number;
  lng: number;
  savedAt: string;
};

export type GeoOutcome =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" | "unsupported" | "error"; message: string };

export const LOC_STORAGE_KEY = "thawani-location";

export function loadSavedLocation(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(LOC_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLocation;
  } catch {
    return null;
  }
}

export function saveLocation(loc: SavedLocation) {
  try {
    localStorage.setItem(LOC_STORAGE_KEY, JSON.stringify(loc));
  } catch {
    /* storage unavailable */
  }
}

export function isNativeApp(): boolean {
  try {
    // Capacitor injects this global on native builds.
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** Best-effort read of the current permission state without prompting. */
export async function readPermissionState(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const st = await Geolocation.checkPermissions();
      const v = st.location === "prompt-with-rationale" ? "prompt" : st.location;
      if (v === "granted" || v === "denied" || v === "prompt") return v;
      return "unknown";
    } catch {
      return "unknown";
    }
  }
  try {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      const st = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return st.state as "granted" | "denied" | "prompt";
    }
  } catch {
    /* Safari / unsupported */
  }
  return "unknown";
}

function mapWebError(error: GeolocationPositionError): GeoOutcome {
  if (error.code === error.PERMISSION_DENIED) {
    return { ok: false, reason: "denied", message: "تم رفض إذن الموقع." };
  }
  if (error.code === error.TIMEOUT) {
    return {
      ok: false,
      reason: "timeout",
      message: "انتهت مهلة تحديد الموقع. تأكد من تفعيل GPS وحاول مرة أخرى.",
    };
  }
  return {
    ok: false,
    reason: "unavailable",
    message: "خدمة الموقع غير متاحة حالياً. تأكد من تفعيل GPS في جهازك.",
  };
}

/**
 * Requests high-accuracy coordinates, prompting through the native system
 * dialog when the permission has not been decided yet.
 */
export async function requestCurrentPosition(): Promise<GeoOutcome> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      let state = await Geolocation.checkPermissions();
      if (state.location !== "granted") {
        state = await Geolocation.requestPermissions({ permissions: ["location"] });
      }
      if (state.location !== "granted") {
        return { ok: false, reason: "denied", message: "تم رفض إذن الموقع." };
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("denied") || msg.includes("permission")) {
        return { ok: false, reason: "denied", message: "تم رفض إذن الموقع." };
      }
      if (msg.includes("disabled") || msg.includes("unavailable") || msg.includes("location services")) {
        return {
          ok: false,
          reason: "unavailable",
          message: "خدمة الموقع (GPS) غير مفعّلة في جهازك.",
        };
      }
      return { ok: false, reason: "error", message: "تعذّر تحديد الموقع، حاول مرة أخرى." };
    }
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return { ok: false, reason: "unsupported", message: "جهازك لا يدعم تحديد الموقع." };
  }

  return new Promise<GeoOutcome>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve(mapWebError(err)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/** Opens the OS app-settings screen on native; returns false when not possible. */
export async function openLocationSettings(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const cap = (
      globalThis as {
        Capacitor?: { Plugins?: { NativeSettings?: { openAndroid?: (o: unknown) => Promise<void> } } };
      }
    ).Capacitor;
    const ns = cap?.Plugins?.NativeSettings;
    if (ns?.openAndroid) {
      await ns.openAndroid({ option: "application_details" });
      return true;
    }
  } catch {
    /* plugin unavailable */
  }
  return false;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ar`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.city || a.town || a.village || a.state,
      a.suburb || a.neighbourhood || a.city_district || a.county,
    ].filter(Boolean);
    return parts.join(" — ") || data.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}
