CREATE OR REPLACE FUNCTION public.delete_finished_customer_order(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE deleted_id uuid;
BEGIN
  DELETE FROM public.customer_orders
  WHERE id = _order_id AND status IN ('delivered', 'rejected', 'cancelled')
  RETURNING id INTO deleted_id;
  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن حذف الطلب: غير موجود أو ليس منتهياً';
  END IF;
  DELETE FROM public.admin_notifications
  WHERE ref_table = 'customer_orders' AND ref_id = deleted_id;
  RETURN deleted_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_finished_customer_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_finished_customer_order(uuid) TO service_role;