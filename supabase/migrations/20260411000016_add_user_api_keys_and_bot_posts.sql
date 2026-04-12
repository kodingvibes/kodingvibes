-- API keys por usuario para publicación desde bots

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabla de API keys
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON public.user_api_keys(user_id, is_active);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own api keys" ON public.user_api_keys;
CREATE POLICY "Users can view own api keys"
    ON public.user_api_keys FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own api keys" ON public.user_api_keys;
CREATE POLICY "Users can create own api keys"
    ON public.user_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own api keys" ON public.user_api_keys;
CREATE POLICY "Users can update own api keys"
    ON public.user_api_keys FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own api keys" ON public.user_api_keys;
CREATE POLICY "Users can delete own api keys"
    ON public.user_api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- 2) Marcar posts creados por bot
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS is_bot_post BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES public.user_api_keys(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bot_name VARCHAR(80);

DROP INDEX IF EXISTS idx_posts_is_bot_post;
CREATE INDEX idx_posts_is_bot_post ON public.posts(is_bot_post) WHERE is_bot_post = true;

-- 3) Función para crear posts usando API key
CREATE OR REPLACE FUNCTION public.create_post_with_api_key(
    p_api_key TEXT,
    p_title TEXT,
    p_content TEXT DEFAULT NULL,
    p_group_id UUID DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'published'
)
RETURNS public.posts AS $$
DECLARE
    key_record RECORD;
    new_post public.posts;
    hashed_key TEXT;
    user_role_in_group VARCHAR(20);
    group_post_type VARCHAR(20);
    group_is_active BOOLEAN;
BEGIN
    IF p_api_key IS NULL OR length(trim(p_api_key)) = 0 THEN
        RAISE EXCEPTION 'API key requerida';
    END IF;

    IF p_title IS NULL OR length(trim(p_title)) < 5 OR length(trim(p_title)) > 300 THEN
        RAISE EXCEPTION 'Titulo invalido';
    END IF;

    IF p_content IS NOT NULL AND length(p_content) > 10000 THEN
        RAISE EXCEPTION 'Contenido demasiado largo';
    END IF;

    IF p_status NOT IN ('published', 'draft') THEN
        RAISE EXCEPTION 'Estado invalido';
    END IF;

    hashed_key := encode(extensions.digest(p_api_key, 'sha256'), 'hex');

    SELECT *
    INTO key_record
    FROM public.user_api_keys
    WHERE key_hash = hashed_key
      AND is_active = true
      AND revoked_at IS NULL
    LIMIT 1;

    IF key_record IS NULL THEN
        RAISE EXCEPTION 'API key invalida o revocada';
    END IF;

    IF p_group_id IS NOT NULL THEN
        SELECT g.post_creation_type, g.is_active
        INTO group_post_type, group_is_active
        FROM public.groups g
        WHERE g.id = p_group_id;

        IF group_post_type IS NULL OR group_is_active IS DISTINCT FROM true THEN
            RAISE EXCEPTION 'Grupo invalido o inactivo';
        END IF;

        SELECT gm.role
        INTO user_role_in_group
        FROM public.group_members gm
        WHERE gm.group_id = p_group_id
          AND gm.user_id = key_record.user_id;

        IF user_role_in_group IS NULL THEN
            RAISE EXCEPTION 'Debes ser miembro del grupo para publicar';
        END IF;

        IF group_post_type = 'moderators_admins' THEN
            IF user_role_in_group NOT IN ('moderator', 'admin') THEN
                RAISE EXCEPTION 'Sin permisos para publicar en este grupo';
            END IF;
        ELSIF group_post_type = 'admins_only' THEN
            IF user_role_in_group IS DISTINCT FROM 'admin' THEN
                RAISE EXCEPTION 'Sin permisos para publicar en este grupo';
            END IF;
        END IF;
    END IF;

    INSERT INTO public.posts (
        title,
        content,
        image_url,
        tags,
        user_id,
        group_id,
        status,
        is_bot_post,
        api_key_id,
        bot_name
    )
    VALUES (
        trim(p_title),
        p_content,
        p_image_url,
        p_tags,
        key_record.user_id,
        p_group_id,
        p_status,
        true,
        key_record.id,
        key_record.name
    )
    RETURNING * INTO new_post;

    UPDATE public.user_api_keys
    SET last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = key_record.id;

    RETURN new_post;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.create_post_with_api_key(TEXT, TEXT, TEXT, UUID, TEXT[], TEXT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post_with_api_key(TEXT, TEXT, TEXT, UUID, TEXT[], TEXT, VARCHAR) TO anon, authenticated;

COMMENT ON FUNCTION public.create_post_with_api_key(TEXT, TEXT, TEXT, UUID, TEXT[], TEXT, VARCHAR) IS
    'Crea un post en nombre del dueño de la API key y lo marca como bot';
