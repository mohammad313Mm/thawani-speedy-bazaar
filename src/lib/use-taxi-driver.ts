import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./auth";

/**
 * True when the signed-in user's phone number is in the admin-authorized
 * taxi list (or their account is directly linked to it).
 */
export function useIsTaxiDriver() {
  const { user, loading } = useAuth();
  const [isTaxi, setIsTaxi] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setIsTaxi(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    (async () => {
      // Always settle `checking`, even when the RPC rejects — callers gate on
      // it, so a stuck `true` silently disables whatever depends on this.
      try {
        const { data } = await supabase.rpc("is_taxi_driver", { _user_id: user.id });
        if (cancelled) return;
        setIsTaxi(data === true);
      } catch {
        if (cancelled) return;
        setIsTaxi(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { isTaxiDriver: isTaxi, checking: checking || loading };
}
