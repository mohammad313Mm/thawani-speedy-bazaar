ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_price_iqd integer,
  ADD COLUMN IF NOT EXISTS discount_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.products
  ADD CONSTRAINT products_discount_valid
  CHECK (discount_price_iqd IS NULL OR (discount_price_iqd >= 0 AND discount_price_iqd < price_iqd));
ALTER TABLE public.products
  ADD CONSTRAINT products_discount_active_needs_price
  CHECK (NOT discount_active OR discount_price_iqd IS NOT NULL);
CREATE INDEX IF NOT EXISTS products_discount_active_idx ON public.products (store_id) WHERE discount_active;