-- Add status field to posts for draft functionality
alter table public.posts add column if not exists status text default 'draft' not null check (status in ('draft', 'published'));

-- Allow users to see their own drafts (when status = 'draft' and user_id matches)
-- The existing select policy already handles this with "auth.uid() = user_id"
-- But we need to ensure drafts with status='draft' are only visible to their owners
-- unless they become published

-- Update the select policy to also check for published status for non-owners
drop policy if exists "posts_select_policy" on posts;
create policy "posts_select_policy" ON posts
    FOR SELECT
    USING (
        is_deleted = false
        AND (
            status = 'published'
            OR auth.uid() = user_id
            OR (auth.uid() IS NOT NULL AND EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
            ))
        )
    );

-- Create index for better query performance on status field
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_user_id_status on posts(user_id, status);
