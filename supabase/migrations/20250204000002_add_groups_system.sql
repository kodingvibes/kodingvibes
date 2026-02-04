-- Crear tabla de grupos/canales
CREATE TABLE groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    icon_url TEXT,
    color VARCHAR(7) DEFAULT '#6366f1'
);

-- Crear índice en slug para búsquedas rápidas
CREATE INDEX idx_groups_slug ON groups(slug);
CREATE INDEX idx_groups_is_public ON groups(is_public) WHERE is_public = true;
CREATE INDEX idx_groups_is_active ON groups(is_active);

-- Crear tabla de miembros de grupos
CREATE TABLE group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Crear índices para group_members
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Crear tabla de solicitudes para crear grupos
CREATE TABLE group_creation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para group_creation_requests
CREATE INDEX idx_group_creation_requests_status ON group_creation_requests(status);
CREATE INDEX idx_group_creation_requests_requested_by ON group_creation_requests(requested_by);

-- Agregar columna group_id a la tabla posts
ALTER TABLE posts ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- Crear grupo "Comunidad" por defecto (público)
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
LIMIT 1;

-- Función para actualizar member_count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_member_count
    AFTER INSERT OR DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_group_member_count();

-- Función para actualizar post_count
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.group_id IS NOT NULL THEN
        UPDATE groups SET post_count = post_count + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.group_id IS NOT NULL THEN
        UPDATE groups SET post_count = post_count - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.group_id IS DISTINCT FROM NEW.group_id THEN
            IF OLD.group_id IS NOT NULL THEN
                UPDATE groups SET post_count = post_count - 1 WHERE id = OLD.group_id;
            END IF;
            IF NEW.group_id IS NOT NULL THEN
                UPDATE groups SET post_count = post_count + 1 WHERE id = NEW.group_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_post_count
    AFTER INSERT OR DELETE OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_group_post_count();

-- Políticas RLS para groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone"
    ON groups FOR SELECT
    USING (is_active = true AND (is_public = true OR 
        EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())));

CREATE POLICY "Only admins can insert groups"
    ON groups FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Only admins or group creators can update groups"
    ON groups FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true) OR 
           created_by = auth.uid() OR
           EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role IN ('admin', 'moderator')));

-- Políticas RLS para group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members are viewable by group members"
    ON group_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND is_public = true) OR
           user_id = auth.uid() OR
           EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));

CREATE POLICY "Users can join public groups"
    ON group_members FOR INSERT
    WITH CHECK (user_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM groups WHERE id = group_id AND is_public = true AND is_active = true));

CREATE POLICY "Users can leave groups"
    ON group_members FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Group admins can manage members"
    ON group_members FOR ALL
    USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')));

-- Políticas RLS para group_creation_requests
ALTER TABLE group_creation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
    ON group_creation_requests FOR SELECT
    USING (requested_by = auth.uid() OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Users can create requests"
    ON group_creation_requests FOR INSERT
    WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Only admins can update requests"
    ON group_creation_requests FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Política para posts en grupos privados
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable by everyone"
    ON posts FOR SELECT
    USING (is_deleted = false AND 
           (group_id IS NULL OR 
            EXISTS (SELECT 1 FROM groups WHERE id = posts.group_id AND is_public = true) OR
            EXISTS (SELECT 1 FROM group_members WHERE group_id = posts.group_id AND user_id = auth.uid())));

-- Función para aprobar solicitud de grupo
CREATE OR REPLACE FUNCTION approve_group_request(request_id UUID, admin_id UUID)
RETURNS void AS $$
DECLARE
    req_record RECORD;
    new_group_id UUID;
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden aprobar solicitudes';
    END IF;

    -- Obtener la solicitud
    SELECT * INTO req_record FROM group_creation_requests WHERE id = request_id;
    
    IF req_record IS NULL THEN
        RAISE EXCEPTION 'Solicitud no encontrada';
    END IF;

    IF req_record.status != 'pending' THEN
        RAISE EXCEPTION 'La solicitud ya ha sido procesada';
    END IF;

    -- Crear el grupo
    INSERT INTO groups (name, slug, description, is_public, is_active, created_by, color)
    VALUES (req_record.name, req_record.slug, req_record.description, req_record.is_public, true, req_record.requested_by, '#6366f1')
    RETURNING id INTO new_group_id;

    -- Agregar al creador como miembro admin
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (new_group_id, req_record.requested_by, 'admin');

    -- Actualizar la solicitud
    UPDATE group_creation_requests 
    SET status = 'approved', reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Función para rechazar solicitud de grupo
CREATE OR REPLACE FUNCTION reject_group_request(request_id UUID, admin_id UUID, reason TEXT)
RETURNS void AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = admin_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Solo administradores pueden rechazar solicitudes';
    END IF;

    -- Actualizar la solicitud
    UPDATE group_creation_requests 
    SET status = 'rejected', reviewed_by = admin_id, reviewed_at = NOW(), rejection_reason = reason
    WHERE id = request_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql;
