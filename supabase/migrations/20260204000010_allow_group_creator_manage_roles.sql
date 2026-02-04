-- =====================================================
-- ALLOW GROUP CREATORS TO MANAGE MEMBER ROLES
-- Permite al creador del grupo actualizar roles de miembros y eliminar miembros
-- =====================================================

-- Política para que el creador del grupo pueda actualizar roles de miembros
CREATE POLICY "group_creator_can_update_member_roles" ON group_members
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- Política para que el creador del grupo pueda eliminar miembros
-- (además de la política existente que permite a los usuarios eliminarse a sí mismos)
CREATE POLICY "group_creator_can_remove_members" ON group_members
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_members.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- Política para que moderadores y admins también puedan eliminar miembros (pero no cambiar roles)
CREATE POLICY "group_moderators_can_remove_members" ON group_members
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id = auth.uid()
            AND gm.role IN ('moderator', 'admin')
            -- No pueden remover al creador del grupo
            AND group_members.user_id != g.created_by
        )
    );
