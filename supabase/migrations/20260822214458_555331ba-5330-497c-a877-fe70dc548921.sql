
CREATE TABLE public.taxi_drivers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxi_drivers TO authenticated;
GRANT ALL ON public.taxi_drivers TO service_role;
ALTER TABLE public.taxi_drivers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_taxi_driver(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.taxi_drivers WHERE user_id = _user_id AND is_active);
$$;
REVOKE ALL ON FUNCTION public.is_taxi_driver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_taxi_driver(uuid) TO authenticated, service_role;

CREATE POLICY "taxi_drivers_read_self_or_admin" ON public.taxi_drivers
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.taxi_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_ref text,
  customer_id uuid,
  customer_name text,
  customer_phone text NOT NULL,
  address text NOT NULL,
  notes text,
  customer_lat double precision,
  customer_lng double precision,
  status text NOT NULL DEFAULT 'pending',
  driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  rejected_at timestamptz
);
GRANT SELECT, UPDATE ON public.taxi_requests TO authenticated;
GRANT ALL ON public.taxi_requests TO service_role;
ALTER TABLE public.taxi_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxi_requests_select" ON public.taxi_requests
FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR public.is_taxi_driver(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "taxi_requests_update" ON public.taxi_requests
FOR UPDATE TO authenticated
USING (public.is_taxi_driver(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_taxi_driver(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER taxi_requests_set_updated_at
BEFORE UPDATE ON public.taxi_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.taxi_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.taxi_requests;
