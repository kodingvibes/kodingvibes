-- =====================================================
-- NOTIFICACIONES PARA SOLICITUDES DE NUEVOS CANALES
-- =====================================================
-- Esta migración agrega notificaciones automáticas a los administradores
-- globales cuando se crea una nueva solicitud de canal.

-- 1. Agregar el nuevo tipo de notificación 'group_request'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('upvote', 'comment', 'reply', 'ban', 'unban', 'moderation_request', 'moderation_approved', 'moderation_rejected', 'group_request'));

-- 2. Crear función para notificar a admins sobre nuevas solicitudes de canal
CREATE OR REPLACE FUNCTION public.notify_admins_group_request()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    requester_name TEXT;
BEGIN
    -- Obtener el nombre del solicitante
    SELECT COALESCE(name, username, email) INTO requester_name
    FROM public.users WHERE id = NEW.requested_by;
    
    -- Insertar notificación para cada administrador global
    FOR admin_record IN 
        SELECT id FROM public.users WHERE is_admin = true AND id != NEW.requested_by
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            actor_id,
            actor_name,
            metadata
        ) VALUES (
            admin_record.id,
            'group_request',
            'Nueva solicitud de canal',
            requester_name || ' ha solicitado crear el canal "' || NEW.name || '"',
            NEW.requested_by,
            requester_name,
            jsonb_build_object(
                'request_id', NEW.id,
                'channel_name', NEW.name,
                'channel_slug', NEW.slug,
                'description', NEW.description,
                'is_public', NEW.is_public
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger que se dispara al insertar una nueva solicitud
DROP TRIGGER IF EXISTS trigger_notify_admins_group_request ON group_creation_requests;
CREATE TRIGGER trigger_notify_admins_group_request
    AFTER INSERT ON group_creation_requests
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION public.notify_admins_group_request();

-- 4. Comentario sobre la funcionalidad
COMMENT ON FUNCTION public.notify_admins_group_request() IS 
    'Notifica a todos los administradores globales cuando se crea una nueva solicitud de canal';
