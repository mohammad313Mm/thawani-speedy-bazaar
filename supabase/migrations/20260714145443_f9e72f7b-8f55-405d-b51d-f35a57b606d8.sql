
-- Grant read access to anon so the admin dashboard (password-gated, no Supabase session) can list and receive realtime updates.
GRANT SELECT ON public.merchant_applications TO anon;
GRANT SELECT ON public.driver_applications TO anon;

-- Add anon SELECT policies (admin panel reads rows through the browser client).
DROP POLICY IF EXISTS "admin_panel_read_merchant_apps" ON public.merchant_applications;
CREATE POLICY "admin_panel_read_merchant_apps"
  ON public.merchant_applications FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "admin_panel_read_driver_apps" ON public.driver_applications;
CREATE POLICY "admin_panel_read_driver_apps"
  ON public.driver_applications FOR SELECT
  TO anon
  USING (true);

-- Ensure realtime is enabled for both tables (idempotent guard).
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
