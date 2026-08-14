CREATE TABLE public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','admin','system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_chat_messages_user_created_idx ON public.support_chat_messages (user_id, created_at);

GRANT SELECT, INSERT ON public.support_chat_messages TO authenticated;
GRANT ALL ON public.support_chat_messages TO service_role;

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own support chat"
ON public.support_chat_messages FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users send own support chat"
ON public.support_chat_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND sender = 'user');

CREATE POLICY "admins reply support chat"
ON public.support_chat_messages FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND sender = 'admin');

CREATE OR REPLACE FUNCTION public.support_chat_after_user_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_system boolean;
  uname text;
BEGIN
  IF new.sender <> 'user' THEN
    RETURN new;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.support_chat_messages
    WHERE user_id = new.user_id AND sender = 'system'
  ) INTO has_system;

  IF NOT has_system THEN
    INSERT INTO public.support_chat_messages (user_id, sender, body)
    VALUES (new.user_id, 'system', 'مرحباً بك في ثواني، سيتم الرد عليك قريباً.');
  END IF;

  SELECT coalesce(nullif(full_name,''), phone) INTO uname
  FROM public.profiles WHERE id = new.user_id;

  INSERT INTO public.admin_notifications (kind, title, body, ref_table, ref_id)
  VALUES (
    'support_chat',
    'رسالة دعم جديدة',
    coalesce(uname, 'زبون') || ': ' || left(new.body, 300),
    'support_chat_messages',
    new.id
  );

  RETURN new;
END;
$$;

CREATE TRIGGER trg_support_chat_after_user_message
AFTER INSERT ON public.support_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.support_chat_after_user_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;