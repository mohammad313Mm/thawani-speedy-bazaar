
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unavailable_until timestamptz;
