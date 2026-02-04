-- Add vote_count column to comments table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS vote_count integer DEFAULT 0 NOT NULL;

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  value integer NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, comment_id)
);

-- Enable RLS on comment_votes
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables (fixes security linter errors)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Indexes for comment_votes
CREATE INDEX IF NOT EXISTS comment_votes_comment_id_idx ON public.comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS comment_votes_user_id_idx ON public.comment_votes(user_id);

-- Function to update vote_count on comments
CREATE OR REPLACE FUNCTION public.update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.comments 
    SET vote_count = vote_count + NEW.value 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.comments 
    SET vote_count = vote_count - OLD.value + NEW.value 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.comments 
    SET vote_count = vote_count - OLD.value 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment vote count updates
DROP TRIGGER IF EXISTS comment_vote_count_trigger ON public.comment_votes;
CREATE TRIGGER comment_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_vote_count();

-- RLS Policies for comment_votes
CREATE POLICY "Users can read own comment votes"
  ON public.comment_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create comment votes"
  ON public.comment_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comment votes"
  ON public.comment_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment votes"
  ON public.comment_votes FOR DELETE
  USING (auth.uid() = user_id);
