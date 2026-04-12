-- Roles por grupo para bots (API keys)

CREATE TABLE IF NOT EXISTS public.user_api_key_group_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES public.user_api_keys(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(api_key_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_api_key_group_roles_key ON public.user_api_key_group_roles(api_key_id);
CREATE INDEX IF NOT EXISTS idx_user_api_key_group_roles_group ON public.user_api_key_group_roles(group_id);

ALTER TABLE public.user_api_key_group_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bot group roles" ON public.user_api_key_group_roles;
CREATE POLICY "Users can view own bot group roles"
    ON public.user_api_key_group_roles FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_api_keys k
        WHERE k.id = user_api_key_group_roles.api_key_id
          AND k.user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Users can manage own bot group roles" ON public.user_api_key_group_roles;
CREATE POLICY "Users can manage own bot group roles"
    ON public.user_api_key_group_roles FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_api_keys k
        WHERE k.id = user_api_key_group_roles.api_key_id
          AND k.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.user_api_keys k
        WHERE k.id = user_api_key_group_roles.api_key_id
          AND k.user_id = auth.uid()
      )
    );

-- Actualizar función para que el rol del bot también cuente
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
    bot_role_in_group VARCHAR(20);
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

        SELECT gr.role
        INTO bot_role_in_group
        FROM public.user_api_key_group_roles gr
        WHERE gr.api_key_id = key_record.id
          AND gr.group_id = p_group_id;

        IF bot_role_in_group IS NULL THEN
            bot_role_in_group := 'member';
        END IF;

        IF group_post_type = 'moderators_admins' THEN
            IF user_role_in_group = 'admin' THEN
                NULL;
            ELSIF user_role_in_group = 'moderator' THEN
                IF bot_role_in_group <> 'moderator' THEN
                    RAISE EXCEPTION 'El bot debe ser moderador para publicar en este grupo';
                END IF;
            ELSE
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
