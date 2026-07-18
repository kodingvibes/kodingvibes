-- Ensure comments table has all the columns the app expects.
-- The remote DB seems to be missing several columns that exist in
-- schema.sql. We add them defensively with IF NOT EXISTS so the
-- migration is idempotent and safe on any environment.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS vote_count integer DEFAULT 0 NOT NULL;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;
