import { useCallback, useEffect, useState } from "react";
import { loadSavedLocation, requestCurrentPosition, reverseGeocode, saveLocation } from "./geo";

export type LocationUiStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

export function useLocationPicker(onResolved?: (label: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationUiStatus>("idle");
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

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const cancel = useCallback(() => {
    setDialogOpen(false);
    // Keep status as-is so a later tap can reopen the dialog.
  }, []);

  const confirm = useCallback(async () => {
    setDialogOpen(false);
    setStatus("requesting");

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
    // No persistent denial UI message; the user can tap again to reopen the explanatory dialog.
  }, [onResolved]);

  return { label, status, dialogOpen, openDialog, confirm, cancel };
}
