-- =====================================================
-- FIX DUPLICATE USERNAMES AND IMPROVE USERNAME GENERATION
-- =====================================================

-- 1. Fix existing users with duplicate or generic usernames
-- First, let's update users who have 'usuario' or similar generic names
DO $$
DECLARE
    user_record RECORD;
    new_username text;
    base_username text;
    random_suffix text;
BEGIN
    -- Find users with username 'usuario' or duplicates
    FOR user_record IN 
        SELECT id, email, username 
        FROM public.users 
        WHERE username = 'usuario' 
           OR username IN (
               SELECT username 
               FROM public.users 
               GROUP BY username 
               HAVING COUNT(*) > 1
           )
        ORDER BY created_at ASC
    LOOP
        -- Generate new username from email
        base_username := lower(regexp_replace(
            split_part(user_record.email, '@', 1),
            '[^a-zA-Z0-9]',
            '',
            'g'
        ));
        
        -- Ensure minimum length
        IF length(base_username) < 3 THEN
            base_username := 'user';
        END IF;
        
        -- Truncate if too long
        IF length(base_username) > 14 THEN
            base_username := substring(base_username from 1 for 14);
        END IF;
        
        -- Add random suffix
        random_suffix := floor(random() * 9000 + 1000)::text;
        new_username := base_username || random_suffix;
        
        -- Make sure it's unique
        WHILE EXISTS(SELECT 1 FROM public.users WHERE username = new_username AND id != user_record.id) LOOP
            random_suffix := floor(random() * 9000 + 1000)::text;
            new_username := base_username || random_suffix;
        END LOOP;
        
        -- Update the user
        UPDATE public.users 
        SET username = new_username, updated_at = now()
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Updated user % from % to %', user_record.id, user_record.username, new_username;
    END LOOP;
END $$;

-- 2. Improve the handle_new_user function with better random generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  random_suffix text;
  attempts integer := 0;
  max_attempts integer := 100;
  default_group_id uuid;
BEGIN
  -- Generate base username from name (first name) or email
  base_username := lower(regexp_replace(
    coalesce(
      -- Try to get first name only (split by space)
      split_part(coalesce(new.raw_user_meta_data->>'name', ''), ' ', 1),
      -- Fallback to email prefix
      split_part(new.email, '@', 1),
      'user'
    ),
    '[^a-zA-Z0-9]',
    '',
    'g'
  ));
  
  -- If base_username is empty or too short, use email prefix
  IF length(base_username) < 3 THEN
    base_username := lower(regexp_replace(
      split_part(new.email, '@', 1),
      '[^a-zA-Z0-9]',
      '',
      'g'
    ));
  END IF;
  
  -- Still too short? Use 'user' as base
  IF length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  
  -- Truncate to leave room for random suffix (max 14 chars base + 4-6 chars suffix)
  IF length(base_username) > 14 THEN
    base_username := substring(base_username from 1 for 14);
  END IF;
  
  -- First try without suffix
  final_username := base_username;
  
  -- If exists, add random suffix
  IF EXISTS(SELECT 1 FROM public.users WHERE username = final_username) THEN
    LOOP
      attempts := attempts + 1;
      -- Generate 4-digit random number (1000-9999)
      random_suffix := floor(random() * 9000 + 1000)::text;
      final_username := base_username || random_suffix;
      
      -- Check if unique
      IF NOT EXISTS(SELECT 1 FROM public.users WHERE username = final_username) THEN
        EXIT;
      END IF;
      
      -- Prevent infinite loop
      IF attempts >= max_attempts THEN
        -- Use UUID suffix as last resort
        final_username := substring(base_username from 1 for 8) || substring(gen_random_uuid()::text from 1 for 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Ensure final username doesn't exceed 20 chars
  IF length(final_username) > 20 THEN
    final_username := substring(final_username from 1 for 20);
  END IF;
  
  -- Create the user
  INSERT INTO public.users (id, email, name, username, avatar_url)
  VALUES (
    new.id, 
    new.email,
    coalesce(new.raw_user_meta_data->>'name', final_username),
    final_username,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Add to default group (comunidad)
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

-- 3. Ensure username column has unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;
