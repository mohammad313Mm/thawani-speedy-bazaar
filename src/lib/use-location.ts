import { useCallback, useEffect, useState } from "react";
import { loadSavedLocation, requestCurrentPosition, reverseGeocode, saveLocation } from "./geo";

export type LocationUiStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

export function useLocationPicker(onResolved?: (label: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationUiStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

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

    // Trigger the native browser/device permission prompt directly.
    const res = await requestCurrentPosition();

    if (res.ok) {
      const text = await reverseGeocode(res.lat, res.lng);
      saveLocation({ label: text, lat: res.lat, lng: res.lng, savedAt: new Date().toISOString() });
      setLabel(text);
      setStatus("granted");
      setMessage(null);
      onResolved?.(text);
      return;
    }

    setStatus(res.reason === "denied" ? "denied" : res.reason === "unsupported" ? "unsupported" : "error");
    setMessage(res.message);
  }, [onResolved]);

  return { label, status, message, request };
}
