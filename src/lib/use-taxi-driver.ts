import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./auth";

/** True when the signed-in user is an active taxi driver account. */
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
      const { data } = await supabase
        .from("taxi_drivers")
        .select("user_id, is_active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setIsTaxi(!!data && (data as { is_active: boolean }).is_active);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { isTaxiDriver: isTaxi, checking: checking || loading };
}
