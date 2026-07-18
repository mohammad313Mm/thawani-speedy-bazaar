
-- Remove anon SELECT policies exposing applicant PII
DROP POLICY IF EXISTS admin_panel_read_driver_apps ON public.driver_applications;
DROP POLICY IF EXISTS admin_panel_read_merchant_apps ON public.merchant_applications;

-- Tighten driver update WITH CHECK to prevent clearing driver_id
DROP POLICY IF EXISTS "drivers update assigned orders" ON public.customer_orders;
CREATE POLICY "drivers update assigned orders"
  ON public.customer_orders FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Remove the always-true INSERT policy on customer_orders.
-- Order creation is now routed through a trusted server function
-- that recomputes prices/fees using the service-role client.
DROP POLICY IF EXISTS "anyone can create orders" ON public.customer_orders;

-- Column-level access: hide store owner phone from anonymous visitors
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT
  (id, owner_id, name, category, address, is_open, working_hours,
   commission_rate, status, created_at, updated_at, logo_url, cover_url,
   description, latitude, longitude, delivery_available, commission_type,
   commission_amount)
  ON public.stores TO anon;

-- Restrict SECURITY DEFINER function execution. Trigger functions do not
-- need EXECUTE grants to end-user roles; has_role is required by RLS
-- policies so keep authenticated access and remove anon/public.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_driver_app_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_merchant_app_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_merchant_app() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_driver_app() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.customer_orders_guard_driver_assignment() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- Seed admin role for the designated admin phone if that user has signed up.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE phone = '07800181794'
ON CONFLICT (user_id, role) DO NOTHING;
