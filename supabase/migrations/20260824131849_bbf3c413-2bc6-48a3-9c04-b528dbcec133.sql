ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS advertisements_store_id_idx ON public.advertisements(store_id);