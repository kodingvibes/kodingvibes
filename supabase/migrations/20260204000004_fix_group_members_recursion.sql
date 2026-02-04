-- =====================================================
-- FIX INFINITE RECURSION IN GROUP_MEMBERS RLS POLICIES
-- Error: "infinite recursion detected in policy for relation group_members"
-- =====================================================

-- 1. Drop ALL existing policies on group_members to start fresh
-- These cause infinite recursion because they reference group_members in subqueries
DROP POLICY IF EXISTS "Group members are viewable by group members" ON group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "group_members_select_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_update_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_select_public" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_self" ON group_members;
DROP POLICY IF EXISTS "group_members_update_self" ON group_members;
-- These are the problematic recursive policies
DROP POLICY IF EXISTS "Authenticated users can view members of public groups" ON group_members;
DROP POLICY IF EXISTS "Group members are viewable by everyone" ON group_members;
DROP POLICY IF EXISTS "Users can leave non-default groups" ON group_members;

-- 2. Ensure RLS is enabled
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 3. Create SIMPLE non-recursive policies

-- SELECT: Everyone can view group memberships (no subqueries to avoid recursion)
CREATE POLICY "group_members_select_public" ON group_members
    FOR SELECT
    USING (true);

-- INSERT: Authenticated users can add themselves to groups
CREATE POLICY "group_members_insert_self" ON group_members
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- DELETE: Users can remove themselves from groups
CREATE POLICY "group_members_delete_self" ON group_members
    FOR DELETE
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- UPDATE: Users can update their own membership (if needed)
CREATE POLICY "group_members_update_self" ON group_members
    FOR UPDATE
    USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
