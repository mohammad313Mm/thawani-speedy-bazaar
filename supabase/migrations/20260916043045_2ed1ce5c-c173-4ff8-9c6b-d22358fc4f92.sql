ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_general boolean NOT NULL DEFAULT false;

CREATE TABLE public.general_store_areas (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.delivery_areas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, area_id)
);

GRANT SELECT ON public.general_store_areas TO anon;
GRANT SELECT ON public.general_store_areas TO authenticated;
GRANT ALL ON public.general_store_areas TO service_role;

ALTER TABLE public.general_store_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "general_store_areas_public_read"
  ON public.general_store_areas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "general_store_areas_admin_manage"
  ON public.general_store_areas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.merchant_applications
  ADD COLUMN IF NOT EXISTS general_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;