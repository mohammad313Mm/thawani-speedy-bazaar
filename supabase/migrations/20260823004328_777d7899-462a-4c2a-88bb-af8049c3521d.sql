REVOKE ALL ON FUNCTION public.notify_admin_driver_app() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_merchant_app() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_support_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_chat_after_user_message() FROM PUBLIC, anon, authenticated;