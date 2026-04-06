-- =====================================================
-- AGREGAR post_creation_type A GRUPOS
-- =====================================================
-- Esta migración permite que los admins de canal configuren
-- quién puede crear posts: todos, solo moderadores+admins, o solo admins.

-- 1. Agregar columna post_creation_type a groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS post_creation_type VARCHAR(20) DEFAULT 'anyone';

-- 2. Agregar constraint para valores válidos
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_post_creation_type_check;
ALTER TABLE groups ADD CONSTRAINT groups_post_creation_type_check 
    CHECK (post_creation_type IN ('anyone', 'moderators_admins', 'admins_only'));

-- 3. Función helper para verificar si un usuario puede crear posts en un grupo
CREATE OR REPLACE FUNCTION public.can_create_post_in_group(group_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_uuid UUID;
    user_role VARCHAR(20);
    group_post_type VARCHAR(20);
BEGIN
    current_user_uuid := auth.uid();
    
    IF current_user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obtener el post_creation_type del grupo
    SELECT post_creation_type INTO group_post_type
    FROM groups WHERE id = group_id;
    
    -- Si el grupo no existe o no tiene restricción, permitir por defecto
    IF group_post_type IS NULL OR group_post_type = 'anyone' THEN
        RETURN TRUE;
    END IF;
    
    -- Obtener el rol del usuario en el grupo
    SELECT role INTO user_role
    FROM group_members 
    WHERE group_id = can_create_post_in_group.group_id AND user_id = current_user_uuid;
    
    -- Si no es miembro, no puede crear
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar según el tipo de restricción
    IF group_post_type = 'moderators_admins' THEN
        RETURN user_role IN ('moderator', 'admin');
    ELSIF group_post_type = 'admins_only' THEN
        RETURN user_role = 'admin';
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Modificar la RLS policy de INSERT para posts
-- Primero eliminar la política existente
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;

-- Crear nueva política que verifica post_creation_type
CREATE POLICY "Users can create posts in groups based on post_creation_type"
    ON public.posts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Puede crear si no tiene grupo asignado (posts globales)
            group_id IS NULL 
            -- O puede crear si el grupo lo permite según post_creation_type
            OR public.can_create_post_in_group(group_id) = TRUE
        )
    );

-- 5. Actualizar función approve_group_request para incluir post_creation_type
-- NOTA: Esta función usa SECURITY DEFINER para evitar problemas con RLS en la tabla users
CREATE OR REPLACE FUNCTION public.approve_group_request(request_id UUID, admin_id UUID)
RETURNS void AS $$
DECLARE
    req_record RECORD;
    new_group_id UUID;
BEGIN
    -- Verificar admin sin RLS (usando SECURITY DEFINER)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden aprobar solicitudes';
    END IF;

    SELECT * INTO req_record FROM group_creation_requests WHERE id = request_id;
    
    IF req_record IS NULL THEN
        RAISE EXCEPTION 'Solicitud no encontrada';
    END IF;

    IF req_record.status != 'pending' THEN
        RAISE EXCEPTION 'La solicitud ya ha sido procesada';
    END IF;

    INSERT INTO groups (name, slug, description, is_public, is_active, created_by, color, post_creation_type)
    VALUES (req_record.name, req_record.slug, req_record.description, req_record.is_public, true, req_record.requested_by, '#6366f1', 'anyone')
    RETURNING id INTO new_group_id;

    INSERT INTO group_members (group_id, user_id, role)
    VALUES (new_group_id, req_record.requested_by, 'admin');

    UPDATE group_creation_requests 
    SET status = 'approved', reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_group_request(request_id UUID, admin_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Verificar admin sin RLS (usando SECURITY DEFINER)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden rechazar solicitudes';
    END IF;

    UPDATE group_creation_requests 
    SET status = 'rejected', reviewed_by = admin_id, reviewed_at = NOW(), rejection_reason = reason
    WHERE id = request_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Comentario documenting la funcionalidad
COMMENT ON FUNCTION public.can_create_post_in_group(UUID) IS 
    'Verifica si el usuario actual puede crear posts en un grupo basado en post_creation_type';