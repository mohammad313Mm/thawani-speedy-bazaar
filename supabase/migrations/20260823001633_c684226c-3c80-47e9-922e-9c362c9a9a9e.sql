
-- 1. Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.taxi_requests ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.delivery_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stores_area ON public.stores(area_id);
CREATE INDEX IF NOT EXISTS idx_orders_area ON public.customer_orders(area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON public.profiles(area_id);

-- 2. Point-in-polygon resolution (server side, ray casting over boundary_points)
CREATE OR REPLACE FUNCTION public.area_for_point(_lat double precision, _lng double precision)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  pts jsonb;
  n int;
  i int;
  j int;
  xi double precision; yi double precision; xj double precision; yj double precision;
  inside boolean;
BEGIN
  IF _lat IS NULL OR _lng IS NULL THEN RETURN NULL; END IF;
  FOR a IN SELECT id, boundary_points FROM public.delivery_areas WHERE is_active LOOP
    pts := a.boundary_points;
    IF pts IS NULL OR jsonb_typeof(pts) <> 'array' THEN CONTINUE; END IF;
    n := jsonb_array_length(pts);
    IF n < 3 THEN CONTINUE; END IF;
    inside := false;
    j := n - 1;
    FOR i IN 0..n-1 LOOP
      xi := (pts->i->>'lng')::double precision;
      yi := (pts->i->>'lat')::double precision;
      xj := (pts->j->>'lng')::double precision;
      yj := (pts->j->>'lat')::double precision;
      IF xi IS NOT NULL AND yi IS NOT NULL AND xj IS NOT NULL AND yj IS NOT NULL THEN
        IF ((yi > _lat) <> (yj > _lat))
           AND (_lng < (xj - xi) * (_lat - yi) / NULLIF(yj - yi, 0) + xi) THEN
          inside := NOT inside;
        END IF;
      END IF;
      j := i;
    END LOOP;
    IF inside THEN RETURN a.id; END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.area_for_point(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.area_for_point(double precision, double precision) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_area_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_area_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_area_id() TO authenticated, service_role;

-- 3. Prevent manual area tampering by users / store owners
CREATE OR REPLACE FUNCTION public.guard_area_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() IS NULL => trusted server (service role) call; admins may override.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.area_id := OLD.area_id;
    ELSE
      NEW.area_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_area ON public.profiles;
CREATE TRIGGER profiles_guard_area BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_area_id();

DROP TRIGGER IF EXISTS stores_guard_area ON public.stores;
CREATE TRIGGER stores_guard_area BEFORE INSERT OR UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.guard_area_id();

-- 4. Area-scoped read policies (guests read through trusted server functions)
DROP POLICY IF EXISTS stores_select_active_public ON public.stores;
CREATE POLICY stores_select_same_area ON public.stores
FOR SELECT TO authenticated
USING (
  status = 'active'
  AND area_id IS NOT NULL
  AND area_id = public.current_area_id()
);

DROP POLICY IF EXISTS products_select_available_public ON public.products;
CREATE POLICY products_select_same_area ON public.products
FOR SELECT TO authenticated
USING (
  is_available = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = products.store_id
      AND s.status = 'active'
      AND s.area_id IS NOT NULL
      AND s.area_id = public.current_area_id()
  )
);

DROP POLICY IF EXISTS ads_select_public ON public.advertisements;
CREATE POLICY ads_select_same_area ON public.advertisements
FOR SELECT TO authenticated
USING (
  is_active = true
  AND (area_id IS NULL OR area_id = public.current_area_id())
);

REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT ON public.advertisements FROM anon;

-- 5. Drivers only see / claim orders in their own area
DROP POLICY IF EXISTS "drivers view available pool" ON public.customer_orders;
CREATE POLICY "drivers view available pool" ON public.customer_orders
FOR SELECT TO authenticated
USING (
  driver_id IS NULL
  AND status = ANY (ARRAY['searching_driver','accepted','preparing','ready'])
  AND public.has_role(auth.uid(), 'driver')
  AND area_id IS NOT NULL
  AND area_id = public.current_area_id()
);

DROP POLICY IF EXISTS "drivers claim available order" ON public.customer_orders;
CREATE POLICY "drivers claim available order" ON public.customer_orders
FOR UPDATE TO authenticated
USING (
  driver_id IS NULL
  AND status = ANY (ARRAY['searching_driver','accepted','preparing','ready'])
  AND public.has_role(auth.uid(), 'driver')
  AND area_id IS NOT NULL
  AND area_id = public.current_area_id()
)
WITH CHECK (driver_id = auth.uid());

-- 6. Backfill existing rows from stored coordinates
UPDATE public.stores SET area_id = public.area_for_point(latitude, longitude)
WHERE area_id IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

UPDATE public.customer_orders o SET area_id = s.area_id
FROM public.stores s WHERE s.id = o.store_id AND o.area_id IS NULL;
