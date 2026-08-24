import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { loadSavedLocation, requestCurrentPosition, reverseGeocode, saveLocation } from "./geo";

export type LocationUiStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

const GPS_OFF_HINT =
  "يرجى الموافقة على تفعيل خدمات الموقع (GPS) من النافذة التي ستظهر لك.";

export function useLocationPicker(onResolved?: (label: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationUiStatus>("idle");

  // Restore the last known location so the UI never starts empty.
  useEffect(() => {
    const saved = loadSavedLocation();
    if (saved) {
      setLabel(saved.label);
      setStatus("granted");
      onResolved?.(saved.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Direct, no-modal request: fires the OS/Google location dialog immediately. */
  const request = useCallback(async () => {
    setStatus("requesting");

    // Native: trigger the official Google "Location accuracy" system dialog first.
    if (isNativeApp()) {
      const enabled = await isDeviceLocationEnabled();
      if (enabled === false) await promptEnableDeviceLocation();
    }

    const res = await requestCurrentPosition();

    if (res.ok) {
      const text = await reverseGeocode(res.lat, res.lng);
      saveLocation({ label: text, lat: res.lat, lng: res.lng, savedAt: new Date().toISOString() });
      setLabel(text);
      setStatus("granted");
      onResolved?.(text);
      return;
    }

    setStatus(res.reason === "denied" ? "denied" : res.reason === "unsupported" ? "unsupported" : "error");
    toast.error(res.reason === "unsupported" ? res.message : GPS_OFF_HINT);
  }, [onResolved]);

  return { label, status, request };
}
