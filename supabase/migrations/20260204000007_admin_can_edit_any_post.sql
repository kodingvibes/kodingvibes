-- Actualizar política de UPDATE para posts: permitir a admins globales editar cualquier post

-- Eliminar política existente
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;

-- Crear nueva política que permite a usuarios editar sus propios posts O a admins globales editar cualquier post
CREATE POLICY "Users can update own posts or admins can update any post" ON posts
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );
