-- Enable RLS (Row Level Security)
alter table if exists public.posts enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.votes enable row level security;
alter table if exists public.users enable row level security;

-- Users table (synced with Supabase Auth)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null unique,
  name text,
  username text unique,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Posts table with soft delete and edit tracking
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  content text,
  image_url text,
  tags text[] default '{}',
  vote_count integer default 0 not null,
  is_deleted boolean default false not null,
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Comments table (self-referential for nested replies)
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  is_deleted boolean default false not null,
  deleted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Votes table (unique constraint prevents duplicate votes)
create table if not exists public.votes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamptz default now() not null,
  unique(user_id, post_id)
);

-- Indexes for performance
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_is_deleted_idx on public.posts(is_deleted);
create index if not exists posts_tags_idx on public.posts using gin(tags);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_user_id_idx on public.comments(user_id);
create index if not exists votes_post_id_idx on public.votes(post_id);
create index if not exists votes_user_id_idx on public.votes(user_id);

-- Function to update vote_count on posts
create or replace function public.update_vote_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts 
    set vote_count = vote_count + NEW.value 
    where id = NEW.post_id;
    return NEW;
  elsif (tg_op = 'UPDATE') then
    update public.posts 
    set vote_count = vote_count - OLD.value + NEW.value 
    where id = NEW.post_id;
    return NEW;
  elsif (tg_op = 'DELETE') then
    update public.posts 
    set vote_count = vote_count - OLD.value 
    where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger for vote count updates
drop trigger if exists vote_count_trigger on public.votes;
create trigger vote_count_trigger
  after insert or update or delete on public.votes
  for each row execute function public.update_vote_count();

-- Function to handle user creation from auth with automatic username generation
-- and automatic membership to default group (comunidad)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
  default_group_id uuid;
begin
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
  insert into public.users (id, email, name, username, avatar_url)
  values (
    new.id, 
    new.email,
    coalesce(new.raw_user_meta_data->>'name', final_username),
    final_username,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Agregar automáticamente al grupo por defecto (comunidad)
  select id into default_group_id from public.groups where is_default = true limit 1;
  
  if default_group_id is not null then
    insert into public.group_members (group_id, user_id, role)
    values (default_group_id, new.id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

-- Trigger to create user profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security Policies

-- Users: Users can read all profiles, update only their own
CREATE POLICY "Users can read all profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Posts: Filter deleted posts for normal users, admins can see all
CREATE POLICY "Users can view non-deleted posts"
  ON public.posts FOR SELECT
  USING (
    is_deleted = false 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can soft delete own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments: Filter deleted comments
CREATE POLICY "Users can view non-deleted comments"
  ON public.comments FOR SELECT
  USING (
    is_deleted = false 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Votes: Users can only see their own votes, but aggregated counts are public via posts.vote_count
CREATE POLICY "Users can read own votes"
  ON public.votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create votes"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if post can be edited (within 15 minutes)
create or replace function public.can_edit_post(post_id uuid)
returns boolean as $$
declare
  post_created_at timestamptz;
  current_user_id uuid;
begin
  -- Get current user id
  current_user_id := auth.uid();
  
  -- Get post creation time and verify ownership
  select created_at into post_created_at
  from public.posts
  where id = post_id and user_id = current_user_id;
  
  -- If post not found or not owned by current user, return false
  if post_created_at is null then
    return false;
  end if;
  
  -- Check if within 15 minutes
  return (now() - post_created_at) <= interval '15 minutes';
end;
$$ language plpgsql security definer;

-- Function to soft delete a post
create or replace function public.soft_delete_post(post_id uuid)
returns void as $$
begin
  update public.posts
  set is_deleted = true, deleted_at = now()
  where id = post_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- Function to soft delete a comment
create or replace function public.soft_delete_comment(comment_id uuid)
returns void as $$
begin
  update public.comments
  set is_deleted = true, deleted_at = now()
  where id = comment_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;
