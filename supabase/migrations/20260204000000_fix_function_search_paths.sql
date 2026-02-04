-- Migration: Fix function search_path mutable warnings
-- Generated on: 2026-02-04
-- First, let's check actual function signatures

-- Query to find the correct function definitions:
-- SELECT 
--   p.proname as function_name,
--   pg_get_function_arguments(p.oid) as arguments,
--   pg_get_function_result(p.oid) as return_type
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN (
--   'update_comment_vote_count',
--   'handle_vote_notification',
--   'handle_comment_notification',
--   'handle_reply_notification',
--   'update_push_subscription_last_used',
--   'send_push_notification',
--   'deactivate_push_subscription',
--   'update_vote_count',
--   'handle_new_user',
--   'can_edit_post'
-- );

-- Fix functions - Replace () with actual parameters after running the query above
-- Example: If send_push_notification takes (title text, body text), use:
-- ALTER FUNCTION public.send_push_notification(title text, body text) SET search_path = '';

-- Common patterns to try:

-- Function 1: update_comment_vote_count
-- ALTER FUNCTION public.update_comment_vote_count() SET search_path = '';

-- Function 2: handle_vote_notification  
-- ALTER FUNCTION public.handle_vote_notification() SET search_path = '';

-- Function 3: handle_comment_notification
-- ALTER FUNCTION public.handle_comment_notification() SET search_path = '';

-- Function 4: handle_reply_notification
-- ALTER FUNCTION public.handle_reply_notification() SET search_path = '';

-- Function 5: update_push_subscription_last_used
-- ALTER FUNCTION public.update_push_subscription_last_used() SET search_path = '';

-- Function 6: send_push_notification
-- ALTER FUNCTION public.send_push_notification() SET search_path = '';

-- Function 7: deactivate_push_subscription
-- ALTER FUNCTION public.deactivate_push_subscription() SET search_path = '';

-- Function 8: update_vote_count
-- ALTER FUNCTION public.update_vote_count() SET search_path = '';

-- Function 9: handle_new_user
-- ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- Function 10: can_edit_post
-- ALTER FUNCTION public.can_edit_post() SET search_path = '';

-- Alternative approach: Use SECURITY DEFINER instead (if functions don't use search_path)
-- ALTER FUNCTION public.send_push_notification() SECURITY DEFINER;
