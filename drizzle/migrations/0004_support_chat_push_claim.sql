ALTER TABLE public.support_chat_messages ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;
UPDATE public.support_chat_messages SET push_sent_at = created_at WHERE push_sent_at IS NULL;