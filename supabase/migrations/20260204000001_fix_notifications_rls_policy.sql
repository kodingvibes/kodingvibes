-- Fix RLS policy for notifications table
-- The current policy allows unrestricted INSERT access

-- Option A: Restrict to authenticated users only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Option B: If system/triggers need to insert, use service_role instead
-- CREATE POLICY "System can insert notifications" 
-- ON public.notifications 
-- FOR INSERT 
-- TO service_role
-- WITH CHECK (true);
