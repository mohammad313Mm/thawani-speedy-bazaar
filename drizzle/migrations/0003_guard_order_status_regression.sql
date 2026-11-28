CREATE OR REPLACE FUNCTION public.customer_orders_guard_status_regression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('pending', 'missed', 'rejected')
     AND OLD.status NOT IN ('pending', 'missed')
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    -- Order was already approved / in delivery / finished: keep its status.
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.customer_orders_guard_status_regression() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS customer_orders_guard_status_regression ON public.customer_orders;
CREATE TRIGGER customer_orders_guard_status_regression
BEFORE UPDATE ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION public.customer_orders_guard_status_regression();