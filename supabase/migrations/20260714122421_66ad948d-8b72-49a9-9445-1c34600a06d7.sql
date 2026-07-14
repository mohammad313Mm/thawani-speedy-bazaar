
-- Add logo_url to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text;

-- Advertisements
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  position text NOT NULL DEFAULT 'home_top',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_select_public" ON public.advertisements FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "ads_admin_all" ON public.advertisements FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER ads_set_updated_at BEFORE UPDATE ON public.advertisements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Delivery Areas
CREATE TABLE public.delivery_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  city text,
  fee_iqd int NOT NULL DEFAULT 3000,
  min_order_iqd int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_areas TO anon, authenticated;
GRANT ALL ON public.delivery_areas TO service_role;
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas_select_public" ON public.delivery_areas FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "areas_admin_all" ON public.delivery_areas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER areas_set_updated_at BEFORE UPDATE ON public.delivery_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  description text,
  price_iqd int NOT NULL DEFAULT 0,
  image_url text,
  category text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_public" ON public.products FOR SELECT TO anon, authenticated USING (is_available = true OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "products_owner_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "products_owner_update" ON public.products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE POLICY "products_owner_delete" ON public.products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Driver delivery areas mapping
CREATE TABLE public.driver_delivery_areas (
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.delivery_areas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, area_id)
);
GRANT SELECT ON public.driver_delivery_areas TO authenticated;
GRANT ALL ON public.driver_delivery_areas TO service_role;
ALTER TABLE public.driver_delivery_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dda_select_self_or_admin" ON public.driver_delivery_areas FOR SELECT TO authenticated USING (driver_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "dda_admin_all" ON public.driver_delivery_areas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
