-- =====================================================
-- WEBHOOK: notify-email on notifications INSERT
-- =====================================================
-- Calls the notify-email Supabase Edge Function via pg_net
-- every time a new row is inserted into public.notifications.
--
-- This replaces the missing "Database Webhooks" UI in the
-- Supabase Dashboard for projects where it's not exposed.
--
-- Required (set in Supabase Edge Function secrets, not here):
--   The edge function reads its own env, so no service role
--   key needs to live in this trigger. We just call the public
--   function URL. Authorization is handled inside the function
--   via the SUPABASE_SERVICE_ROLE_KEY injected automatically.
-- =====================================================

-- Enable pg_net (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop previous trigger/function if reinstalling
DROP TRIGGER IF EXISTS trg_notify_email_on_notification ON public.notifications;
DROP FUNCTION IF EXISTS public.handle_notification_email();

CREATE OR REPLACE FUNCTION public.handle_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fn_url text;
  request_id bigint;
BEGIN
  -- Build the edge function URL for this project.
  -- Setting the project URL as a GUC at deploy time is preferred,
  -- but for portability we read it from current_setting.
  fn_url := current_setting('app.settings.supabase_url', true)
            || '/functions/v1/notify-email';

  -- Fallback: if not set, use the well-known project ref.
  -- Override via: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://dwxuzltrgjgwpcxkviuy.supabase.co';
  IF fn_url IS NULL OR fn_url = '/functions/v1/notify-email' THEN
    fn_url := 'https://dwxuzltrgjgwpcxkviuy.supabase.co/functions/v1/notify-email';
  END IF;

  -- Fire-and-forget HTTP POST. pg_net returns immediately.
  SELECT net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type',    TG_OP,
      'table',   TG_TABLE_NAME,
      'record',  to_jsonb(NEW)
    )
  ) INTO request_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_email_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_email();

-- Optional: configure the project URL globally so we don't hardcode it
-- in the function body. Run this once after the migration.
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://dwxuzltrgjgwpcxkviuy.supabase.co';
