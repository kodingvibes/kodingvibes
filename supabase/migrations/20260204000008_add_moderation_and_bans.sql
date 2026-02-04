-- Migración: Sistema de Moderación y Bans de Usuarios

-- =====================================================
-- 1. TABLA DE PETICIONES DE MODERACIÓN
-- =====================================================
CREATE TABLE moderation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para moderation_requests
CREATE INDEX idx_moderation_requests_status ON moderation_requests(status);
CREATE INDEX idx_moderation_requests_group_id ON moderation_requests(group_id);
CREATE INDEX idx_moderation_requests_post_id ON moderation_requests(post_id);
CREATE INDEX idx_moderation_requests_requested_by ON moderation_requests(requested_by);

-- =====================================================
-- 2. TABLA DE BANS DE USUARIOS
-- =====================================================
CREATE TABLE user_bans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    ban_type VARCHAR(20) NOT NULL CHECK (ban_type IN ('permanent', 'temporary')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    unbanned_at TIMESTAMP WITH TIME ZONE,
    unbanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    unban_reason TEXT
);

-- Índices para user_bans
CREATE INDEX idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX idx_user_bans_is_active ON user_bans(is_active);
CREATE INDEX idx_user_bans_expires_at ON user_bans(expires_at);

-- =====================================================
-- 3. AGREGAR NUEVOS TIPOS DE NOTIFICACIONES
-- =====================================================
-- Modificar el check constraint de notifications para incluir nuevos tipos
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('upvote', 'comment', 'reply', 'ban', 'unban', 'moderation_request', 'moderation_approved', 'moderation_rejected'));

-- =====================================================
-- 4. POLÍTICAS RLS PARA MODERATION_REQUESTS
-- =====================================================
ALTER TABLE moderation_requests ENABLE ROW LEVEL SECURITY;

-- Los moderadores de un grupo pueden ver todas las peticiones de su grupo
CREATE POLICY "Moderators can view group moderation requests" ON moderation_requests
    FOR SELECT
    USING (
        -- Admins globales pueden ver todo
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
        OR 
        -- Moderadores del grupo pueden ver peticiones de su grupo
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = moderation_requests.group_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
        OR
        -- El creador de la petición puede verla
        requested_by = auth.uid()
    );

-- Solo moderadores y admins de grupo pueden crear peticiones
CREATE POLICY "Moderators can create moderation requests" ON moderation_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = requested_by
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = moderation_requests.group_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- Solo admins globales pueden actualizar peticiones
CREATE POLICY "Admins can update moderation requests" ON moderation_requests
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- 5. POLÍTICAS RLS PARA USER_BANS
-- =====================================================
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propios bans, y los admins pueden ver todos
CREATE POLICY "Users can view own bans, admins can view all" ON user_bans
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Solo admins globales pueden crear bans
CREATE POLICY "Only admins can create bans" ON user_bans
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- Solo admins globales pueden actualizar bans
CREATE POLICY "Only admins can update bans" ON user_bans
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- 6. FUNCIÓN PARA VERIFICAR SI UN USUARIO ESTÁ BANEADO
-- =====================================================
CREATE OR REPLACE FUNCTION is_user_banned(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_ban RECORD;
BEGIN
    -- Buscar un ban activo
    SELECT * INTO active_ban
    FROM user_bans
    WHERE user_id = check_user_id
    AND is_active = true
    AND (
        ban_type = 'permanent'
        OR (ban_type = 'temporary' AND expires_at > NOW())
    )
    LIMIT 1;
    
    -- Si encontramos un ban temporal expirado, marcarlo como inactivo
    IF active_ban.id IS NOT NULL AND active_ban.ban_type = 'temporary' AND active_ban.expires_at <= NOW() THEN
        UPDATE user_bans 
        SET is_active = false, updated_at = NOW()
        WHERE id = active_ban.id;
        RETURN false;
    END IF;
    
    RETURN active_ban.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCIÓN PARA APROBAR PETICIÓN DE MODERACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION approve_moderation_request(
    request_id UUID,
    admin_id UUID,
    notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    req RECORD;
    post_author_id UUID;
    requester_name TEXT;
BEGIN
    -- Obtener la petición
    SELECT * INTO req FROM moderation_requests WHERE id = request_id;
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Petición no encontrada';
    END IF;
    
    -- Marcar el post como eliminado
    UPDATE posts 
    SET is_deleted = true, deleted_at = NOW()
    WHERE id = req.post_id
    RETURNING user_id INTO post_author_id;
    
    -- Actualizar la petición
    UPDATE moderation_requests
    SET status = 'approved',
        reviewed_by = admin_id,
        reviewed_at = NOW(),
        admin_notes = notes,
        updated_at = NOW()
    WHERE id = request_id;
    
    -- Obtener nombre del moderador que solicitó
    SELECT COALESCE(name, username, email) INTO requester_name
    FROM users WHERE id = req.requested_by;
    
    -- Notificar al moderador que solicitó
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        post_id,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        req.requested_by,
        'moderation_approved',
        'Petición de moderación aprobada',
        'Tu petición para eliminar un post ha sido aprobada',
        req.post_id,
        admin_id,
        (SELECT COALESCE(name, username, email) FROM users WHERE id = admin_id),
        jsonb_build_object('reason', req.reason, 'admin_notes', notes)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCIÓN PARA RECHAZAR PETICIÓN DE MODERACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION reject_moderation_request(
    request_id UUID,
    admin_id UUID,
    notes TEXT
)
RETURNS VOID AS $$
DECLARE
    req RECORD;
BEGIN
    -- Obtener la petición
    SELECT * INTO req FROM moderation_requests WHERE id = request_id;
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Petición no encontrada';
    END IF;
    
    -- Actualizar la petición
    UPDATE moderation_requests
    SET status = 'rejected',
        reviewed_by = admin_id,
        reviewed_at = NOW(),
        admin_notes = notes,
        updated_at = NOW()
    WHERE id = request_id;
    
    -- Notificar al moderador que solicitó
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        req.requested_by,
        'moderation_rejected',
        'Petición de moderación rechazada',
        'Tu petición para eliminar un post ha sido rechazada',
        admin_id,
        (SELECT COALESCE(name, username, email) FROM users WHERE id = admin_id),
        jsonb_build_object('reason', req.reason, 'admin_notes', notes)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCIÓN PARA BANEAR USUARIO
-- =====================================================
CREATE OR REPLACE FUNCTION ban_user(
    target_user_id UUID,
    admin_id UUID,
    ban_reason TEXT,
    ban_type_val VARCHAR(20),
    expires_at_val TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_ban_id UUID;
    target_user_name TEXT;
BEGIN
    -- Validar que el admin no se banee a sí mismo
    IF target_user_id = admin_id THEN
        RAISE EXCEPTION 'No puedes banearte a ti mismo';
    END IF;
    
    -- Desactivar bans anteriores del usuario
    UPDATE user_bans
    SET is_active = false, updated_at = NOW()
    WHERE user_id = target_user_id AND is_active = true;
    
    -- Crear nuevo ban
    INSERT INTO user_bans (
        user_id,
        banned_by,
        reason,
        ban_type,
        expires_at,
        is_active
    ) VALUES (
        target_user_id,
        admin_id,
        ban_reason,
        ban_type_val,
        expires_at_val,
        true
    ) RETURNING id INTO new_ban_id;
    
    -- Obtener nombre del usuario baneado
    SELECT COALESCE(name, username, email) INTO target_user_name
    FROM users WHERE id = target_user_id;
    
    -- Notificar al usuario baneado
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        target_user_id,
        'ban',
        'Has sido suspendido',
        CASE 
            WHEN ban_type_val = 'permanent' THEN 'Tu cuenta ha sido suspendida permanentemente'
            ELSE 'Tu cuenta ha sido suspendida temporalmente hasta ' || expires_at_val::TEXT
        END,
        admin_id,
        (SELECT COALESCE(name, username, email) FROM users WHERE id = admin_id),
        jsonb_build_object(
            'reason', ban_reason,
            'ban_type', ban_type_val,
            'expires_at', expires_at_val
        )
    );
    
    RETURN new_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. FUNCIÓN PARA DESBANEAR USUARIO
-- =====================================================
CREATE OR REPLACE FUNCTION unban_user(
    target_user_id UUID,
    admin_id UUID,
    unban_reason_val TEXT DEFAULT 'Apelación aprobada'
)
RETURNS VOID AS $$
BEGIN
    -- Actualizar bans activos
    UPDATE user_bans
    SET is_active = false,
        unbanned_at = NOW(),
        unbanned_by = admin_id,
        unban_reason = unban_reason_val,
        updated_at = NOW()
    WHERE user_id = target_user_id AND is_active = true;
    
    -- Notificar al usuario
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        target_user_id,
        'unban',
        'Suspensión removida',
        'Tu suspensión ha sido removida. Puedes volver a participar en la comunidad.',
        admin_id,
        (SELECT COALESCE(name, username, email) FROM users WHERE id = admin_id),
        jsonb_build_object('reason', unban_reason_val)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
