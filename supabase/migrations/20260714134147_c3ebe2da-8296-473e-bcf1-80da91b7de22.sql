
-- Orders table for merchant order management
CREATE TABLE public.customer_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local_order_id TEXT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status TEXT NOT NULL DEFAULT 'pending',
  driver_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.customer_orders TO authenticated;
GRANT INSERT ON public.customer_orders TO anon;
GRANT ALL ON public.customer_orders TO service_role;

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Anyone (guests included) may place an order
CREATE POLICY "anyone can create orders"
  ON public.customer_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Customers can see their own orders
CREATE POLICY "customers view own orders"
  ON public.customer_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Store owners can see and manage orders for stores they own
CREATE POLICY "store owners view own store orders"
  ON public.customer_orders FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = customer_orders.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "store owners update own store orders"
  ON public.customer_orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = customer_orders.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = customer_orders.store_id AND s.owner_id = auth.uid()));

-- Drivers can see orders assigned to them
CREATE POLICY "drivers view assigned orders"
  ON public.customer_orders FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE TRIGGER customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;

-- Allow store owners to manage their own store's products
CREATE POLICY "owners manage own products"
  ON public.products FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.owner_id = auth.uid()));

-- Allow store owners to update their own store (status toggle)
CREATE POLICY "owners update own store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
