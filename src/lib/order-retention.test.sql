-- Run against PostgreSQL through the database query tool.
-- All fixtures AND cleanup effects are rolled back in the exception subtransaction.
DO $test$
DECLARE
  fixture record;
  store uuid;
  order_id uuid;
  taxi_id uuid;
  kept_orders uuid[] := '{}';
  deleted_orders uuid[] := '{}';
  kept_taxis uuid[] := '{}';
  deleted_taxis uuid[] := '{}';
BEGIN
  SELECT id INTO store FROM public.stores LIMIT 1;
  IF store IS NULL THEN RAISE EXCEPTION 'Retention test requires an existing store'; END IF;
  BEGIN
    FOR fixture IN SELECT * FROM (VALUES
      (interval '10 days', 'delivered', true),
      (interval '29 days 23 hours 59 minutes 59 seconds', 'delivered', true),
      (interval '29 days 23 hours 59 minutes 59 seconds', 'rejected', true),
      (interval '30 days', 'delivered', false),
      (interval '30 days', 'rejected', false),
      (interval '31 days', 'delivered', false),
      (interval '31 days', 'pending', true),
      (interval '31 days', 'accepted', true)
    ) AS cases(age, status, keep) LOOP
      INSERT INTO public.customer_orders (store_id, customer_phone, address, status, created_at, updated_at)
      VALUES (store, 'retention-test', 'isolated retention test', fixture.status, now() - fixture.age, now())
      RETURNING id INTO order_id;
      INSERT INTO public.taxi_requests (customer_phone, address, status, created_at, updated_at)
      VALUES ('retention-test', 'isolated retention test', fixture.status, now() - fixture.age, now())
      RETURNING id INTO taxi_id;
      INSERT INTO public.admin_notifications (kind, title, ref_table, ref_id)
      VALUES ('retention_test', 'isolated retention test', 'customer_orders', order_id);
      IF fixture.keep THEN
        kept_orders := array_append(kept_orders, order_id);
        kept_taxis := array_append(kept_taxis, taxi_id);
      ELSE
        deleted_orders := array_append(deleted_orders, order_id);
        deleted_taxis := array_append(deleted_taxis, taxi_id);
      END IF;
    END LOOP;

    PERFORM public.cleanup_old_records();
    IF (SELECT count(*) FROM public.customer_orders WHERE id = ANY(kept_orders)) <> 5
       OR (SELECT count(*) FROM public.taxi_requests WHERE id = ANY(kept_taxis)) <> 5 THEN
      RAISE EXCEPTION 'Orders younger than 30 full days or active orders were deleted';
    END IF;
    IF EXISTS (SELECT 1 FROM public.customer_orders WHERE id = ANY(deleted_orders))
       OR EXISTS (SELECT 1 FROM public.taxi_requests WHERE id = ANY(deleted_taxis)) THEN
      RAISE EXCEPTION 'Finished orders at/after 30 days survived despite recent updated_at';
    END IF;
    IF (SELECT count(*) FROM public.admin_notifications WHERE ref_id = ANY(kept_orders)) <> 5
       OR EXISTS (SELECT 1 FROM public.admin_notifications WHERE ref_id = ANY(deleted_orders)) THEN
      RAISE EXCEPTION 'Linked notice cleanup no longer matches order retention';
    END IF;
    -- Deliberate rollback of fixtures and ALL effects of calling the real cleanup.
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'retention assertions passed; rollback';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.customer_orders WHERE id = ANY(kept_orders || deleted_orders))
     OR EXISTS (SELECT 1 FROM public.taxi_requests WHERE id = ANY(kept_taxis || deleted_taxis)) THEN
    RAISE EXCEPTION 'Test fixtures were not rolled back';
  END IF;
END;
$test$;