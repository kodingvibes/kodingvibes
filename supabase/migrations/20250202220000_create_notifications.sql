-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('upvote', 'comment', 'reply')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Crear índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Crear función para notificar upvotes múltiplos de 5
CREATE OR REPLACE FUNCTION public.handle_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    current_votes INTEGER;
    voter_name TEXT;
    post_title_val TEXT;
BEGIN
    -- Obtener el autor del post
    SELECT user_id, title INTO post_author_id, post_title_val
    FROM public.posts WHERE id = NEW.post_id;
    
    -- No notificar si el autor vota su propio post
    IF post_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Obtener el conteo actual de votos
    SELECT vote_count INTO current_votes
    FROM public.posts WHERE id = NEW.post_id;
    
    -- Solo notificar si es múltiplo de 5
    IF current_votes > 0 AND current_votes % 5 = 0 THEN
        -- Obtener nombre del votante
        SELECT COALESCE(name, username, email) INTO voter_name
        FROM public.users WHERE id = NEW.user_id;
        
        -- Insertar notificación
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            post_id,
            actor_id,
            actor_name,
            metadata
        ) VALUES (
            post_author_id,
            'upvote',
            '¡Nuevos upvotes!',
            voter_name || ' y otros han upvoteado tu post',
            NEW.post_id,
            NEW.user_id,
            voter_name,
            jsonb_build_object(
                'vote_count', current_votes,
                'post_title', post_title_val
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para upvotes
DROP TRIGGER IF EXISTS trigger_vote_notification ON public.votes;
CREATE TRIGGER trigger_vote_notification
    AFTER INSERT ON public.votes
    FOR EACH ROW
    WHEN (NEW.value > 0)
    EXECUTE FUNCTION public.handle_vote_notification();

-- Crear función para notificar comentarios nuevos
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    commenter_name TEXT;
    post_title_val TEXT;
BEGIN
    -- Obtener el autor del post
    SELECT user_id, title INTO post_author_id, post_title_val
    FROM public.posts WHERE id = NEW.post_id;
    
    -- No notificar si el autor comenta su propio post
    IF post_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Obtener nombre del comentarista
    SELECT COALESCE(name, username, email) INTO commenter_name
    FROM public.users WHERE id = NEW.user_id;
    
    -- Insertar notificación
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        post_id,
        comment_id,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        post_author_id,
        'comment',
        'Nuevo comentario',
        commenter_name || ' comentó en tu post "' || LEFT(post_title_val, 30) || CASE WHEN LENGTH(post_title_val) > 30 THEN '...' ELSE '' END || '"',
        NEW.post_id,
        NEW.id,
        NEW.user_id,
        commenter_name,
        jsonb_build_object('post_title', post_title_val)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para comentarios
DROP TRIGGER IF EXISTS trigger_comment_notification ON public.comments;
CREATE TRIGGER trigger_comment_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW
    WHEN (NEW.parent_id IS NULL)
    EXECUTE FUNCTION public.handle_comment_notification();

-- Crear función para notificar respuestas a comentarios
CREATE OR REPLACE FUNCTION public.handle_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
    parent_comment_author_id UUID;
    replier_name TEXT;
    post_title_val TEXT;
BEGIN
    -- Obtener el autor del comentario padre
    SELECT c.user_id, p.title 
    INTO parent_comment_author_id, post_title_val
    FROM public.comments c
    JOIN public.posts p ON c.post_id = p.id
    WHERE c.id = NEW.parent_id;
    
    -- No notificar si responde a su propio comentario
    IF parent_comment_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Obtener nombre del que responde
    SELECT COALESCE(name, username, email) INTO replier_name
    FROM public.users WHERE id = NEW.user_id;
    
    -- Insertar notificación
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        post_id,
        comment_id,
        actor_id,
        actor_name,
        metadata
    ) VALUES (
        parent_comment_author_id,
        'reply',
        'Nueva respuesta',
        replier_name || ' respondió a tu comentario en "' || LEFT(post_title_val, 30) || CASE WHEN LENGTH(post_title_val) > 30 THEN '...' ELSE '' END || '"',
        NEW.post_id,
        NEW.id,
        NEW.user_id,
        replier_name,
        jsonb_build_object('post_title', post_title_val)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para respuestas
DROP TRIGGER IF EXISTS trigger_reply_notification ON public.comments;
CREATE TRIGGER trigger_reply_notification
    AFTER INSERT ON public.comments
    FOR EACH ROW
    WHEN (NEW.parent_id IS NOT NULL)
    EXECUTE FUNCTION public.handle_reply_notification();

-- Políticas RLS para notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Política: El sistema puede insertar notificaciones
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Política: Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);
