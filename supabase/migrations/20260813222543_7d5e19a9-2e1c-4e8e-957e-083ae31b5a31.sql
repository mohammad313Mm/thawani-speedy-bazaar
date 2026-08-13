CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.support_messages TO anon;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_msgs_insert_any ON public.support_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY support_msgs_select_own_or_admin ON public.support_messages
  FOR SELECT TO authenticated
  USING ((user_id IS NOT NULL AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY support_msgs_update_admin ON public.support_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY support_msgs_delete_admin ON public.support_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_admin_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.admin_notifications (kind, title, body, ref_table, ref_id)
  values (
    'support_message',
    'رسالة دعم جديدة',
    coalesce(nullif(new.full_name,''), 'مستخدم') ||
      case when new.phone is not null and new.phone <> '' then ' — ' || new.phone else '' end ||
      ': ' || left(new.message, 300),
    'support_messages',
    new.id
  );
  return new;
end $$;

CREATE TRIGGER trg_notify_admin_support_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_support_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;