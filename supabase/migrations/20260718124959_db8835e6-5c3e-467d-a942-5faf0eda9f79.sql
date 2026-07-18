-- Customer catalog read access: active stores should be readable by visitors and customers.
GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.stores TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT ALL ON public.products TO service_role;

-- Replace the broad store read policy with explicit audience-based policies.
DROP POLICY IF EXISTS "stores_select_public" ON public.stores;
DROP POLICY IF EXISTS "stores_select_active_public" ON public.stores;
DROP POLICY IF EXISTS "stores_select_owner" ON public.stores;
DROP POLICY IF EXISTS "stores_select_admin" ON public.stores;

CREATE POLICY "stores_select_active_public"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (status = 'active');

CREATE POLICY "stores_select_owner"
ON public.stores
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "stores_select_admin"
ON public.stores
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Replace product customer-read policies so public customers see only available products
-- that belong to active stores, while owners/admins can still manage/read their products.
DROP POLICY IF EXISTS "products_select_available_anon" ON public.products;
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_select_available_public" ON public.products;
DROP POLICY IF EXISTS "products_select_customer_available" ON public.products;
DROP POLICY IF EXISTS "products_select_owner_admin" ON public.products;

CREATE POLICY "products_select_available_public"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  is_available = true
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = products.store_id
      AND s.status = 'active'
  )
);

CREATE POLICY "products_select_owner_admin"
ON public.products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = products.store_id
      AND s.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);