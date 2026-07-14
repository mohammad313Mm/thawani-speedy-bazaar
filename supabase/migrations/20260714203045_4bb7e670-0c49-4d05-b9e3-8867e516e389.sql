
ALTER TABLE public.driver_applications ADD COLUMN IF NOT EXISTS applicant_note text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "drivers update assigned orders" ON public.customer_orders;
CREATE POLICY "drivers update assigned orders" ON public.customer_orders
  FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() OR driver_id IS NULL);
