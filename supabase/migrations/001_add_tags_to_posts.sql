-- Migration: Add tags column to posts table
-- Run this in Supabase SQL Editor if you have an existing database

-- Add tags column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for tags (for efficient filtering/searching)
CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING gin(tags);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'tags';
