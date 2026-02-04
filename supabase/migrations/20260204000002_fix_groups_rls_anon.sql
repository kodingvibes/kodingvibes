-- =====================================================
-- RECREATE ALL RLS POLICIES FOR GROUPS SYSTEM
-- SIMPLIFIED VERSION TO AVOID RECURSION
-- Run this in Supabase SQL Editor to fix access issues
-- =====================================================

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES ON GROUPS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON groups;
DROP POLICY IF EXISTS "Only admins can insert groups" ON groups;
DROP POLICY IF EXISTS "Only admins or group creators can update groups" ON groups;
DROP POLICY IF EXISTS "groups_select_policy" ON groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON groups;
DROP POLICY IF EXISTS "groups_update_policy" ON groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON groups;

-- =====================================================
-- 2. DROP ALL EXISTING POLICIES ON GROUP_MEMBERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Group members are viewable by group members" ON group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "group_members_select_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON group_members;

-- =====================================================
-- 3. DROP ALL EXISTING POLICIES ON POSTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "Users can view non-deleted posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can soft delete own posts" ON posts;

-- =====================================================
-- 4. ENSURE RLS IS ENABLED
-- =====================================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE SIMPLE POLICIES FOR GROUPS TABLE
-- =====================================================

-- SELECT: Public groups are visible to everyone (no subquery to avoid recursion)
CREATE POLICY "groups_select_policy" ON groups
    FOR SELECT
    USING (is_active = true AND is_public = true);

-- INSERT: Only admins can create groups
CREATE POLICY "groups_insert_policy" ON groups
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- UPDATE: Only admins or creators can update
CREATE POLICY "groups_update_policy" ON groups
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
            OR created_by = auth.uid()
        )
    );

-- =====================================================
-- 6. CREATE SIMPLE POLICIES FOR GROUP_MEMBERS TABLE
-- =====================================================

-- SELECT: Anyone can view all memberships (simplified)
CREATE POLICY "group_members_select_policy" ON group_members
    FOR SELECT
    USING (true);

-- INSERT: Authenticated users can join groups
CREATE POLICY "group_members_insert_policy" ON group_members
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- DELETE: Users can leave their own groups
CREATE POLICY "group_members_delete_policy" ON group_members
    FOR DELETE
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- =====================================================
-- 7. CREATE SIMPLE POLICIES FOR POSTS TABLE
-- =====================================================

-- SELECT: Anyone can view non-deleted posts (simplified - no group check for now)
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        is_deleted = false
        OR auth.uid() = user_id
        OR (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        ))
    );

-- INSERT: Authenticated users can create posts
CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own posts
CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- 8. VERIFY COMUNIDAD GROUP EXISTS
-- =====================================================
INSERT INTO groups (name, slug, description, is_public, is_active, created_by, color)
SELECT 
    'Comunidad',
    'comunidad',
    'Canal principal de la comunidad. Aquí puedes compartir cualquier tema relacionado con prompts, IA, desarrollo y más.',
    true,
    true,
    id,
    '#6366f1'
FROM users 
WHERE is_admin = true 
LIMIT 1
ON CONFLICT (slug) DO NOTHING;
