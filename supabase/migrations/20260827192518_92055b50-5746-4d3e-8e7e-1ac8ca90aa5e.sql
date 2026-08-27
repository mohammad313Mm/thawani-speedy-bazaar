ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_escalation_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_escalation_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS customer_orders_escalation_idx
  ON public.customer_orders (escalation_due_at)
  WHERE owner_escalation_sent = false AND status = 'pending';

CREATE TABLE IF NOT EXISTS public.internal_job_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_job_secrets TO service_role;
ALTER TABLE public.internal_job_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_job_secrets (name)
VALUES ('order_escalation')
ON CONFLICT (name) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.ping_order_escalation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.customer_orders
    WHERE owner_escalation_sent = false
      AND status = 'pending'
      AND escalation_due_at IS NOT NULL
      AND escalation_due_at <= now()
  ) THEN
    RETURN;
  END IF;

  SELECT secret INTO s FROM public.internal_job_secrets WHERE name = 'order_escalation';

  PERFORM net.http_post(
    url := 'https://project--dc837d29-2bf5-4cb7-b71d-f3b3f79c280d.lovable.app/api/public/order-escalation',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ping_order_escalation() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('order-escalation-check', '* * * * *', $$select public.ping_order_escalation();$$);