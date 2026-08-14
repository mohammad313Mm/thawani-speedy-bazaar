import { useCallback, useEffect, useState } from "react";
import {
  isNativeApp,
  isDeviceLocationEnabled,
  loadSavedLocation,
  openLocationSettings,
  promptEnableDeviceLocation,
  requestCurrentPosition,
  reverseGeocode,
  saveLocation,
} from "./geo";

export type LocationUiStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

const GPS_OFF_HINT =
  "يرجى سحب شريط الإشعارات (البردة) وتفعيل مفتاح (الموقع / GPS) أولاً، ثم الضغط على تفعيل.";

export function useLocationPicker(onResolved?: (label: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationUiStatus>("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);

  // Restore the last known location so the UI never starts empty.
  useEffect(() => {
    setNative(isNativeApp());
    const saved = loadSavedLocation();
    if (saved) {
      setLabel(saved.label);
      setStatus("granted");
      onResolved?.(saved.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDialog = useCallback(() => {
    setHint(null);
    setDialogOpen(true);
  }, []);

  const cancel = useCallback(() => {
    if (busy) return;
    setDialogOpen(false);
    setHint(null);
  }, [busy]);

  const openSettings = useCallback(() => {
    void openLocationSettings();
  }, []);

  const confirm = useCallback(async () => {
    setBusy(true);
    setHint(null);
    setStatus("requesting");

    // Native: try the one-tap Google Play Services "turn on location" prompt first.
    if (isNativeApp()) {
      const enabled = await isDeviceLocationEnabled();
      if (enabled === false) {
        const turnedOn = await promptEnableDeviceLocation();
        if (!turnedOn) {
          setBusy(false);
          setStatus("error");
          setHint(GPS_OFF_HINT);
          return;
        }
      }
    }

    const res = await requestCurrentPosition();
    setBusy(false);

    if (res.ok) {
      const text = await reverseGeocode(res.lat, res.lng);
      saveLocation({ label: text, lat: res.lat, lng: res.lng, savedAt: new Date().toISOString() });
      setLabel(text);
      setStatus("granted");
      setDialogOpen(false);
      setHint(null);
      onResolved?.(text);
      return;
    }

    setStatus(res.reason === "denied" ? "denied" : res.reason === "unsupported" ? "unsupported" : "error");
    // Keep the modal open and guide the user instead of showing a permanent error in the page.
    setHint(res.reason === "unsupported" ? res.message : GPS_OFF_HINT);
  }, [onResolved]);

  return {
    label,
    status,
    dialogOpen,
    hint,
    busy,
    isNative: native,
    openDialog,
    confirm,
    cancel,
    openSettings,
  };
}
