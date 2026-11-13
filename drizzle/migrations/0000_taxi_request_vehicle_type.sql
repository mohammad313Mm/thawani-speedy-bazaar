ALTER TABLE public.taxi_requests
  ADD COLUMN vehicle_type text;
ALTER TABLE public.taxi_requests
  ADD CONSTRAINT taxi_requests_vehicle_type_valid
  CHECK (vehicle_type IS NULL OR vehicle_type IN ('taxi', 'tuktuk'));
COMMENT ON COLUMN public.taxi_requests.vehicle_type IS 'Requested vehicle type: taxi or tuktuk. NULL preserves legacy requests.';