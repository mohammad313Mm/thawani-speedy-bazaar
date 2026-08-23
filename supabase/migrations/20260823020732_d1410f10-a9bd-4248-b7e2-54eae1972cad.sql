CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - interval '10 days';
  n_orders int := 0;
  n_taxi int := 0;
  n_merch int := 0;
  n_driver int := 0;
BEGIN
  DELETE FROM public.admin_notifications an
  WHERE an.ref_table = 'customer_orders'
    AND an.ref_id IN (
      SELECT id FROM public.customer_orders
      WHERE created_at <= cutoff AND status IN ('delivered','rejected')
    );

  WITH d AS (
    DELETE FROM public.customer_orders
    WHERE created_at <= cutoff AND status IN ('delivered','rejected')
    RETURNING 1
  ) SELECT count(*) INTO n_orders FROM d;

  WITH d AS (
    DELETE FROM public.taxi_requests
    WHERE created_at <= cutoff AND status IN ('delivered','rejected')
    RETURNING 1
  ) SELECT count(*) INTO n_taxi FROM d;

  DELETE FROM public.admin_notifications an
  WHERE an.ref_table IN ('merchant_applications','driver_applications')
    AND (
      an.ref_id IN (SELECT id FROM public.merchant_applications WHERE created_at <= cutoff AND status IN ('approved','rejected'))
      OR an.ref_id IN (SELECT id FROM public.driver_applications WHERE created_at <= cutoff AND status IN ('approved','rejected'))
    );

  WITH d AS (
    DELETE FROM public.merchant_applications
    WHERE created_at <= cutoff AND status IN ('approved','rejected')
    RETURNING 1
  ) SELECT count(*) INTO n_merch FROM d;

  WITH d AS (
    DELETE FROM public.driver_applications
    WHERE created_at <= cutoff AND status IN ('approved','rejected')
    RETURNING 1
  ) SELECT count(*) INTO n_driver FROM d;

  RETURN jsonb_build_object(
    'customer_orders', n_orders,
    'taxi_requests', n_taxi,
    'merchant_applications', n_merch,
    'driver_applications', n_driver,
    'cutoff', cutoff
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_records() TO service_role;