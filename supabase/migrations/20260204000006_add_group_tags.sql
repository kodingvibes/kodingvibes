-- Crear tabla de tags personalizados por grupo
CREATE TABLE group_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, name)
);

-- Crear índices para group_tags
CREATE INDEX idx_group_tags_group_id ON group_tags(group_id);

-- Políticas RLS para group_tags
ALTER TABLE group_tags ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver los tags de grupos públicos o a los que pertenecen
CREATE POLICY "Group tags are viewable by group members"
    ON group_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = group_tags.group_id 
            AND groups.is_active = true 
            AND (
                groups.is_public = true 
                OR EXISTS (
                    SELECT 1 FROM group_members 
                    WHERE group_members.group_id = group_tags.group_id 
                    AND group_members.user_id = auth.uid()
                )
            )
        )
    );

-- Solo el creador del grupo o moderadores/admins pueden crear tags
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
        AND (
            SELECT COUNT(*) FROM group_tags 
            WHERE group_id = group_tags.group_id
        ) < 10
    );

-- Solo el creador del grupo o moderadores/admins pueden actualizar tags
CREATE POLICY "Group admins can update tags"
    ON group_tags FOR UPDATE
    USING (
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

-- Solo el creador del grupo o moderadores/admins pueden eliminar tags
CREATE POLICY "Group admins can delete tags"
    ON group_tags FOR DELETE
    USING (
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

-- Función para validar el límite de 10 tags por grupo
CREATE OR REPLACE FUNCTION check_group_tags_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM group_tags WHERE group_id = NEW.group_id) >= 10 THEN
        RAISE EXCEPTION 'Un grupo no puede tener más de 10 tags personalizados';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_group_tags_limit
    BEFORE INSERT ON group_tags
    FOR EACH ROW
    EXECUTE FUNCTION check_group_tags_limit();
