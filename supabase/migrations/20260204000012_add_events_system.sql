-- Crear tabla de eventos para grupos
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('online', 'irl')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location VARCHAR(500),
    meeting_link VARCHAR(500),
    max_attendees INTEGER,
    is_public BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para events
CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_group_status ON events(group_id, status);

-- Crear tabla de asistentes a eventos
CREATE TABLE event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Crear índices para event_attendees
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);

-- Agregar columna event_count a groups si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'groups' AND column_name = 'event_count') THEN
        ALTER TABLE groups ADD COLUMN event_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Función para actualizar event_count
CREATE OR REPLACE FUNCTION update_group_event_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups SET event_count = event_count + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups SET event_count = event_count - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_event_count ON events;
CREATE TRIGGER trigger_update_group_event_count
    AFTER INSERT OR DELETE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_group_event_count();

-- Políticas RLS para events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by group members or if public"
    ON events FOR SELECT
    USING (
        is_public = true OR 
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = events.group_id AND is_public = true
        ) OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = events.group_id AND user_id = auth.uid()
        ) OR
        created_by = auth.uid()
    );

CREATE POLICY "Group members can create events"
    ON events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = events.group_id 
            AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = events.group_id 
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Event creators and group admins can update events"
    ON events FOR UPDATE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = events.group_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        ) OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = events.group_id 
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Event creators and group admins can delete events"
    ON events FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = events.group_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        ) OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = events.group_id 
            AND created_by = auth.uid()
        )
    );

-- Políticas RLS para event_attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event attendees are viewable by event viewers"
    ON event_attendees FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendees.event_id
            AND (
                e.is_public = true OR
                EXISTS (
                    SELECT 1 FROM groups g
                    WHERE g.id = e.group_id AND g.is_public = true
                ) OR
                EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = e.group_id AND gm.user_id = auth.uid()
                ) OR
                e.created_by = auth.uid()
            )
        )
    );

CREATE POLICY "Users can register themselves for events"
    ON event_attendees FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = event_attendees.event_id
            AND (
                e.is_public = true OR
                EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = e.group_id AND gm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can update their own attendance"
    ON event_attendees FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can remove their own attendance"
    ON event_attendees FOR DELETE
    USING (user_id = auth.uid());

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AGREGAR post_creation_type A GRUPOS
-- =====================================================
-- Esta sección se consolidó aquí para evitar duplicidad de versión
-- de migración (20260204000012) en el historial.

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
