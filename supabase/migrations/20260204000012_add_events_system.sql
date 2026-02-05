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
