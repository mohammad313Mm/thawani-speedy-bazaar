import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** DELETE events cannot use store/customer filters; always re-read through RLS. */
export function useOrderDeletionRefresh(refresh: () => void | Promise<void>, enabled = true) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    const reload = () => { void callback.current(); };
    const visibleReload = () => { if (document.visibilityState === "visible") reload(); };
    const channel = supabase.channel(`order-deletions-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "customer_orders" }, reload)
      .subscribe();
    // Recover missed DELETE events on reconnect, suspended WebViews and RLS streams.
    const timer = window.setInterval(visibleReload, 15000);
    window.addEventListener("focus", visibleReload);
    window.addEventListener("online", visibleReload);
    document.addEventListener("visibilitychange", visibleReload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleReload);
      window.removeEventListener("online", visibleReload);
      document.removeEventListener("visibilitychange", visibleReload);
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}