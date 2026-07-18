
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own device tokens"
  ON public.device_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_role ON public.device_tokens(role);

CREATE TRIGGER trg_device_tokens_updated
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
