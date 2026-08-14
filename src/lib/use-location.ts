import { useCallback, useEffect, useState } from "react";
import {
  isNativeApp,
  loadSavedLocation,
  openLocationSettings,
  readPermissionState,
  requestCurrentPosition,
  reverseGeocode,
  saveLocation,
} from "./geo";

export type LocationUiStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

export function useLocationPicker(onResolved?: (label: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationUiStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const request = useCallback(async () => {
    setStatus("requesting");
    setMessage(null);

    const permission = await readPermissionState();
    if (permission === "denied") {
      setStatus("denied");
      setDialogOpen(true);
      return;
    }

    const res = await requestCurrentPosition();

    if (res.ok) {
      const text = await reverseGeocode(res.lat, res.lng);
      saveLocation({ label: text, lat: res.lat, lng: res.lng, savedAt: new Date().toISOString() });
      setLabel(text);
      setStatus("granted");
      setMessage(null);
      setDialogOpen(false);
      onResolved?.(text);
      return;
    }

    if (res.reason === "denied") {
      setStatus("denied");
      setDialogOpen(true);
      return;
    }
    if (res.reason === "unsupported") {
      setStatus("unsupported");
      setMessage(res.message);
      return;
    }
    setStatus("error");
    setMessage(res.message);
  }, [onResolved]);

  const openSettings = useCallback(async () => {
    const opened = await openLocationSettings();
    if (!opened) {
      setMessage(
        isNativeApp()
          ? "افتح إعدادات الهاتف ← التطبيقات ← ثواني ← الأذونات ← الموقع، ثم فعّل الإذن وأعد المحاولة."
          : "اضغط على أيقونة القفل بجانب عنوان الموقع في المتصفح ← إعدادات الموقع (Location) ← السماح، ثم أعد تحميل الصفحة.",
      );
    }
    setDialogOpen(false);
  }, []);

  return {
    label,
    status,
    message: status === "denied" ? null : message,
    dialogOpen,
    setDialogOpen,
    request,
    openSettings,
    settingsHint: message,
  };
}
