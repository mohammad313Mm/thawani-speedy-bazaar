
DROP POLICY IF EXISTS products_select_public ON public.products;

CREATE POLICY products_select_available_anon
  ON public.products FOR SELECT
  TO anon
  USING (is_available = true);

CREATE POLICY products_select_authenticated
  ON public.products FOR SELECT
  TO authenticated
  USING (
    is_available = true
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='stores'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.stores';
  END IF;
END $$;
