-- Ensure soft-delete columns exist on comments and posts.
-- Some remote DBs were provisioned before the schema.sql was applied
-- in full, so the columns may be missing.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;
