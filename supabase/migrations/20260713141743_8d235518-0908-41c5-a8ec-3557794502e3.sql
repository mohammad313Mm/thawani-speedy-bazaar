ALTER TABLE public.merchant_applications ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.driver_applications ADD COLUMN IF NOT EXISTS email text;