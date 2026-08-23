import { useEffect, useState } from "react";
import { loadSavedLocation } from "./geo";
import { resolveArea, syncMyArea } from "./area.functions";
import { supabase } from "@/integrations/supabase/client";

export type AreaInfo = { id: string; name: string; city: string | null };

export type AreaState = {
  /** null = still unknown, false = outside every area */
  area: AreaInfo | null;
  loading: boolean;
  /** true when we have coordinates but they fall outside every admin area */
  outside: boolean;
  /** true when the user has not shared their location yet */
  needsLocation: boolean;
};

/** Coordinates saved by the location picker; the only input the server trusts. */
export function currentCoords(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  const saved = loadSavedLocation();
  if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return null;
  return { lat: saved.lat, lng: saved.lng };
}

const AREA_CACHE_KEY = "thawani-area-v1";

function readCached(): AreaInfo | null {
  try {
    const raw = localStorage.getItem(AREA_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AreaInfo) : null;
  } catch {
    return null;
  }
}

function writeCached(area: AreaInfo | null) {
  try {
    if (area) localStorage.setItem(AREA_CACHE_KEY, JSON.stringify(area));
    else localStorage.removeItem(AREA_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolves the caller's area on the server from their saved coordinates and,
 * when signed in, persists it on their profile. The area can never be picked
 * manually — only geography decides it.
 */
export function useMyArea(): AreaState {
  const [area, setArea] = useState<AreaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [outside, setOutside] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = readCached();
    if (cached) setArea(cached);

    const run = async () => {
      const coords = currentCoords();
      if (!coords) {
        if (!alive) return;
        setNeedsLocation(true);
        setLoading(false);
        return;
      }
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = session.session
          ? await syncMyArea({ data: coords })
          : await resolveArea({ data: coords });
        if (!alive) return;
        setArea(res.area);
        writeCached(res.area);
        setOutside(res.area === null);
        setNeedsLocation(false);
      } catch {
        /* keep cached value */
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "thawani-location") void run();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("thawani-location-changed", run as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("thawani-location-changed", run as EventListener);
    };
  }, []);

  return { area, loading, outside, needsLocation };
}
