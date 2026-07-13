
-- Lock down execute privileges on SECURITY DEFINER functions.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.on_merchant_app_change() from public, anon, authenticated;
revoke execute on function public.on_driver_app_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- authenticated users need has_role for RLS policy evaluation; keep it.
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
