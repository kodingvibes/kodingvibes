-- =====================================================
-- USER EMAIL NOTIFICATION PREFERENCE
-- =====================================================
-- Opt-in flag for transactional emails (comment / reply
-- notifications). Default TRUE so existing users receive
-- notifications until they explicitly opt out in their profile.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
