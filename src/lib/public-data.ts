import { unstable_cache } from 'next/cache'
import { createPublicClient } from './supabase/public'
import type { Tables } from '@/types/database'

/**
 * Cached loaders for the public feed.
 *
 * Why this exists: the home page has to query Supabase to render on the server
 * (that is what makes it readable without JavaScript). Doing that per request
 * means four round-trips per visit for data that changes a few times an hour.
 *
 * `export const revalidate` would NOT have helped on its own — the home route
 * reads `searchParams` for `?channel=`, and `searchParams` (like `cookies()`)
 * forces dynamic rendering, so the route is never in the static cache. The Data
 * Cache that `unstable_cache` writes to is independent of the route's
 * static/dynamic nature, so it works here.
 *
 * A note on `?channel=`: filtering server-side is intentional. The previous
 * client-side implementation fetched every post and filtered in the browser;
 * with the server render that has to happen here, or the page would show all
 * channels while claiming to show one. Cached lookups below mean filtering a
 * channel costs a cache hit, not a new query.
 */

export const PUBLIC_REVALIDATE_SECONDS = 60

export const POSTS_CACHE_TAG = 'public-posts'
export const GROUPS_CACHE_TAG = 'public-groups'

export type Group = Tables<'groups'>

export type GroupTagRow = {
  group_id: string
  name: string
  color: string
}

export type PostRow = Tables<'posts'> & {
  users: {
    name: string | null
    username: string | null
    email: string
    avatar_url: string | null
  } | null
  comments?: { count: number }[] | null
  groups?: { name: string; slug: string; color: string } | null
}

const POST_SELECT = `
  *,
  users:user_id (name, username, email, avatar_url),
  comments:comments (count)
`

const HERO_SELECT = `
  *,
  users:user_id (name, username, email, avatar_url),
  groups:group_id (name, slug, color)
`

/**
 * Active channels. Same for every visitor, so cached.
 */
export const getActiveGroups = unstable_cache(
  async (): Promise<Group[]> => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('is_active', true)
      .order('post_count', { ascending: false })

    return (data ?? []) as Group[]
  },
  ['public-active-groups'],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [GROUPS_CACHE_TAG] }
)

/**
 * Published, non-deleted posts. `groupId` is part of the cache key, so the
 * unfiltered feed and each channel have their own entry.
 */
export const getFeedPosts = unstable_cache(
  async (groupId: string | null): Promise<PostRow[]> => {
    const supabase = createPublicClient()

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('is_deleted', false)
      .eq('status', 'published')
      .gte('vote_count', 0)

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    const { data } = await query.order('vote_count', { ascending: false })
    return (data ?? []) as PostRow[]
  },
  ['public-feed-posts'],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [POSTS_CACHE_TAG] }
)

/**
 * Top-voted posts of the last month, for the hero carousel.
 *
 * The month window is computed per call and is NOT a cache key input, so a
 * cached entry can be up to PUBLIC_REVALIDATE_SECONDS old in its boundary. At a
 * 60-second window against a month of data that is irrelevant, and it keeps the
 * key stable instead of spawning a new entry every minute.
 */
export const getHeroPosts = unstable_cache(
  async (): Promise<PostRow[]> => {
    const supabase = createPublicClient()

    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const { data } = await supabase
      .from('posts')
      .select(HERO_SELECT)
      .eq('is_deleted', false)
      .eq('status', 'published')
      .gte('vote_count', 1)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('vote_count', { ascending: false })
      .limit(5)

    return (data ?? []) as PostRow[]
  },
  ['public-hero-posts'],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [POSTS_CACHE_TAG] }
)

/**
 * Tag colours for the channels present in a feed. Keyed by Group id.
 */
export const getGroupTags = unstable_cache(
  async (groupIds: string[]): Promise<GroupTagRow[]> => {
    if (groupIds.length === 0) return []

    const supabase = createPublicClient()
    const { data } = await supabase
      .from('group_tags')
      .select('group_id, name, color')
      .in('group_id', groupIds)

    return (data ?? []) as GroupTagRow[]
  },
  ['public-group-tags'],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [GROUPS_CACHE_TAG] }
)
