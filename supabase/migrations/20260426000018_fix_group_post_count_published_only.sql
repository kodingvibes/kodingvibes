-- Count only published, non-deleted posts in groups.post_count

CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
DECLARE
    old_counts BOOLEAN;
    new_counts BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.group_id IS NOT NULL AND NEW.status = 'published' AND NEW.is_deleted = false THEN
            UPDATE public.groups
            SET post_count = post_count + 1
            WHERE id = NEW.group_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.group_id IS NOT NULL AND OLD.status = 'published' AND OLD.is_deleted = false THEN
            UPDATE public.groups
            SET post_count = GREATEST(post_count - 1, 0)
            WHERE id = OLD.group_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_counts := OLD.group_id IS NOT NULL AND OLD.status = 'published' AND OLD.is_deleted = false;
        new_counts := NEW.group_id IS NOT NULL AND NEW.status = 'published' AND NEW.is_deleted = false;

        IF old_counts AND (NOT new_counts OR OLD.group_id IS DISTINCT FROM NEW.group_id) THEN
            UPDATE public.groups
            SET post_count = GREATEST(post_count - 1, 0)
            WHERE id = OLD.group_id;
        END IF;

        IF new_counts AND (NOT old_counts OR OLD.group_id IS DISTINCT FROM NEW.group_id) THEN
            UPDATE public.groups
            SET post_count = post_count + 1
            WHERE id = NEW.group_id;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Backfill all groups to fix existing counters
UPDATE public.groups g
SET post_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.posts p
    WHERE p.group_id = g.id
      AND p.status = 'published'
      AND p.is_deleted = false
);
