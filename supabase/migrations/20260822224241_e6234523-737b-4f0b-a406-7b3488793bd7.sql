CREATE TABLE public.app_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  image_url text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_categories TO anon;
GRANT SELECT ON public.app_categories TO authenticated;
GRANT ALL ON public.app_categories TO service_role;

ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_categories_public_read_active" ON public.app_categories
  FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "app_categories_admin_read_all" ON public.app_categories
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_categories_set_updated_at
  BEFORE UPDATE ON public.app_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_categories;