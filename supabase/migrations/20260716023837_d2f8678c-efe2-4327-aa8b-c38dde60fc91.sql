
-- Allow drivers to see and claim orders in 'searching_driver' status (set by store after accept)
DROP POLICY IF EXISTS "drivers view available pool" ON public.customer_orders;
DROP POLICY IF EXISTS "drivers claim available order" ON public.customer_orders;

CREATE POLICY "drivers view available pool"
ON public.customer_orders
FOR SELECT
TO authenticated
USING (
  driver_id IS NULL
  AND status = ANY (ARRAY['searching_driver'::text, 'accepted'::text, 'preparing'::text, 'ready'::text])
  AND has_role(auth.uid(), 'driver'::app_role)
);

CREATE POLICY "drivers claim available order"
ON public.customer_orders
FOR UPDATE
TO authenticated
USING (
  driver_id IS NULL
  AND status = ANY (ARRAY['searching_driver'::text, 'accepted'::text, 'preparing'::text, 'ready'::text])
  AND has_role(auth.uid(), 'driver'::app_role)
)
WITH CHECK (driver_id = auth.uid());
