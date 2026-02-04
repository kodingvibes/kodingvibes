-- Migration: Hacer que el canal "comunidad" sea el canal por defecto
-- Todos los usuarios logueados automáticamente pertenecen a este canal

-- Agregar columna is_default a groups para marcar el grupo principal
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Marcar "comunidad" como grupo por defecto
UPDATE groups SET is_default = true WHERE slug = 'comunidad';

-- Crear índice para búsqueda rápida del grupo por defecto
CREATE INDEX IF NOT EXISTS idx_groups_is_default ON groups(is_default) WHERE is_default = true;

-- Función para agregar usuario al grupo por defecto
CREATE OR REPLACE FUNCTION add_user_to_default_group(user_uuid UUID)
RETURNS void AS $$
DECLARE
    default_group_id UUID;
BEGIN
    -- Obtener el ID del grupo por defecto (comunidad)
    SELECT id INTO default_group_id FROM groups WHERE is_default = true LIMIT 1;
    
    -- Si existe el grupo por defecto, agregar al usuario
    IF default_group_id IS NOT NULL THEN
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (default_group_id, user_uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Actualizar función handle_new_user para agregar automáticamente al grupo por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
  default_group_id uuid;
BEGIN
  -- Generate base username from email or name
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'user'
    ),
    '[^a-zA-Z0-9]',
    '',
    'g'
  ));
  
  -- Ensure username is between 3-20 chars
  if length(base_username) < 3 then
    base_username := base_username || floor(random() * 1000)::text;
  end if;
  
  if length(base_username) > 20 then
    base_username := substring(base_username from 1 for 20);
  end if;
  
  -- Try to find unique username
  final_username := base_username;
  while exists(select 1 from public.users where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
    -- Ensure it doesn't exceed 20 chars
    if length(final_username) > 20 then
      final_username := substring(base_username from 1 for (20 - length(counter::text))) || counter::text;
    end if;
  end loop;
  
  -- Crear el usuario
  INSERT INTO public.users (id, email, name, username, avatar_url)
  VALUES (
    new.id, 
    new.email,
    coalesce(new.raw_user_meta_data->>'name', final_username),
    final_username,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Agregar automáticamente al grupo por defecto (comunidad)
  SELECT id INTO default_group_id FROM public.groups WHERE is_default = true LIMIT 1;
  
  IF default_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (default_group_id, new.id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Agregar todos los usuarios existentes al grupo "comunidad"
INSERT INTO group_members (group_id, user_id, role)
SELECT g.id, u.id, 'member'
FROM groups g
CROSS JOIN users u
WHERE g.is_default = true
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Actualizar el member_count del grupo comunidad
UPDATE groups 
SET member_count = (
    SELECT COUNT(*) FROM group_members WHERE group_id = groups.id
)
WHERE is_default = true;

-- Política adicional: Los usuarios autenticados siempre pueden ver el grupo por defecto
DROP POLICY IF EXISTS "Default group is always visible" ON groups;
CREATE POLICY "Default group is always visible"
    ON groups FOR SELECT
    USING (is_default = true);

-- Los usuarios no pueden abandonar el grupo por defecto
DROP POLICY IF EXISTS "Users cannot leave default group" ON group_members;

-- Modificar política de DELETE para prevenir abandonar grupo por defecto
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave non-default groups"
    ON group_members FOR DELETE
    USING (
        user_id = auth.uid() AND 
        NOT EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND is_default = true)
    );

-- Comentario explicativo
COMMENT ON COLUMN groups.is_default IS 'Indica si este es el grupo principal/por defecto. Todos los usuarios están automáticamente unidos a este grupo.';

-- Mejorar política de SELECT para group_members
-- Solo usuarios autenticados pueden ver miembros
DROP POLICY IF EXISTS "Group members are viewable by group members" ON group_members;
DROP POLICY IF EXISTS "Anyone can view members of public groups" ON group_members;
DROP POLICY IF EXISTS "Authenticated users can view members of public groups" ON group_members;

CREATE POLICY "Authenticated users can view members of public groups"
    ON group_members FOR SELECT
    USING (
        -- Debe estar autenticado
        auth.uid() IS NOT NULL
        AND
        (
            -- Puede ver miembros de grupos públicos
            EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND is_public = true)
            OR
            -- O si es el propio usuario
            user_id = auth.uid()
            OR
            -- O si el usuario es miembro del grupo (para grupos privados)
            EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
        )
    );
