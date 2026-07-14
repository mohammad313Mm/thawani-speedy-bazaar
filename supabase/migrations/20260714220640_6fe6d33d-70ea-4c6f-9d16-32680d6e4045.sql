
-- Admin: full view & update on customer_orders
CREATE POLICY "admins view all orders"
ON public.customer_orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update all orders"
ON public.customer_orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drivers: view unassigned approved orders (available pool)
CREATE POLICY "drivers view available pool"
ON public.customer_orders
FOR SELECT
TO authenticated
USING (
  driver_id IS NULL
  AND status IN ('accepted','preparing','ready')
  AND public.has_role(auth.uid(), 'driver')
);

-- Drivers: claim an unassigned approved order
CREATE POLICY "drivers claim available order"
ON public.customer_orders
FOR UPDATE
TO authenticated
USING (
  driver_id IS NULL
  AND status IN ('accepted','preparing','ready')
  AND public.has_role(auth.uid(), 'driver')
)
WITH CHECK (driver_id = auth.uid());

-- Prevent reassigning an order once claimed (defence in depth)
CREATE OR REPLACE FUNCTION public.customer_orders_guard_driver_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.driver_id IS NOT NULL
     AND NEW.driver_id IS NOT NULL
     AND OLD.driver_id <> NEW.driver_id THEN
    RAISE EXCEPTION 'order already assigned to another driver';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_orders_guard_driver ON public.customer_orders;
CREATE TRIGGER customer_orders_guard_driver
BEFORE UPDATE ON public.customer_orders
FOR EACH ROW
EXECUTE FUNCTION public.customer_orders_guard_driver_assignment();
