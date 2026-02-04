-- Migración: Arreglar recursión infinita en políticas de group_tags

-- Eliminar la política problemática
DROP POLICY IF EXISTS "Group admins can create tags" ON group_tags;

-- Recrear la política sin la verificación del COUNT que causa recursión
-- (El límite de 10 tags ya se valida en el trigger check_group_tags_limit)
CREATE POLICY "Group admins can create tags"
    ON group_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_tags.group_id 
            AND (
                groups.created_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM group_members 
                    WHERE group_members.group_id = group_tags.group_id 
                    AND group_members.user_id = auth.uid() 
                    AND group_members.role IN ('admin', 'moderator')
                )
            )
        )
    );
