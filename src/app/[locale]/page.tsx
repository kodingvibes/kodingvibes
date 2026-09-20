import { createClient } from '@/lib/supabase/server'
import { setRequestLocale } from 'next-intl/server'
import HomeFeed, { type HomePost } from '@/components/HomeFeed'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

type Group = Tables<'groups'>

type GroupTagRow = {
  group_id: string
  name: string
  color: string
}

type PostRow = Tables<'posts'> & {
  users: {
    name: string | null
    username: string | null
    email: string
    avatar_url: string | null
  } | null
  comments?: { count: number }[] | null
  groups?: { name: string; slug: string; color: string } | null
}

const normalizeTagValue = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ channel?: string; group?: string }>
}

/**
 * The feed is rendered on the server so that the initial response already
 * contains the channel list and the posts. Previously this page was a client
 * component and Next.js emitted BAILOUT_TO_CLIENT_SIDE_RENDERING, so the HTML
 * that arrived was an empty <div class="min-h-screen bg-background"></div>:
 * anything that does not execute the React bundle — terminal browsers, very
 * old engines, crawlers, JS disabled — saw a blank document.
 */
export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params
  const { channel, group } = await searchParams
  setRequestLocale(locale)

  const supabase = await createClient()
  const channelFilter = channel || group || null

  const { data: groupsData } = await supabase
    .from('groups')
    .select('*')
    .eq('is_active', true)
    .order('post_count', { ascending: false })

  const groups = (groupsData ?? []) as Group[]

  const selectedGroup = channelFilter
    ? groups.find((item) => item.slug === channelFilter) ?? null
    : null

  let postsQuery = supabase
    .from('posts')
    .select(`
      *,
      users:user_id (name, username, email, avatar_url),
      comments:comments (count)
    `)
    .eq('is_deleted', false)
    .eq('status', 'published')
    .gte('vote_count', 0)

  if (selectedGroup) {
    postsQuery = postsQuery.eq('group_id', selectedGroup.id)
  }

  const { data: postsData } = await postsQuery.order('vote_count', { ascending: false })

  const posts: HomePost[] = ((postsData ?? []) as PostRow[]).map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    image_url: post.image_url,
    vote_count: post.vote_count,
    created_at: post.created_at,
    user_id: post.user_id,
    is_deleted: post.is_deleted,
    status: post.status,
    tags: post.tags,
    group_id: post.group_id,
    is_bot_post: post.is_bot_post,
    bot_name: post.bot_name,
    comments_count: post.comments?.[0]?.count ?? 0,
    users: post.users,
  }))

  // Hero carousel: top voted posts of the last month
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const { data: heroData } = await supabase
    .from('posts')
    .select(`
      *,
      users:user_id (name, username, email, avatar_url),
      groups:group_id (name, slug, color)
    `)
    .eq('is_deleted', false)
    .eq('status', 'published')
    .gte('vote_count', 1)
    .gte('created_at', oneMonthAgo.toISOString())
    .order('vote_count', { ascending: false })
    .limit(5)

  const heroPosts: HomePost[] = ((heroData ?? []) as PostRow[]).map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    image_url: post.image_url,
    vote_count: post.vote_count,
    created_at: post.created_at,
    user_id: post.user_id,
    is_deleted: post.is_deleted,
    status: post.status,
    tags: post.tags,
    group_id: post.group_id,
    is_bot_post: post.is_bot_post,
    bot_name: post.bot_name,
    comments_count: 0,
    users: post.users,
    groups: post.groups ?? null,
  }))

  const groupIds = Array.from(
    new Set(posts.map((post) => post.group_id).filter((id): id is string => Boolean(id)))
  )

  const tagStylesByKey: Record<string, { name: string; color: string }> = {}

  if (groupIds.length > 0) {
    const { data: tagRows } = await supabase
      .from('group_tags')
      .select('group_id, name, color')
      .in('group_id', groupIds)

    for (const tag of (tagRows ?? []) as GroupTagRow[]) {
      tagStylesByKey[`${tag.group_id}:${normalizeTagValue(tag.name)}`] = {
        name: tag.name,
        color: tag.color,
      }
    }
  }

  return (
    <HomeFeed
      posts={posts}
      heroPosts={heroPosts}
      groups={groups}
      selectedGroup={selectedGroup}
      tagStylesByKey={tagStylesByKey}
      activeChannelSlug={selectedGroup?.slug ?? null}
      homeHref={`/${locale}`}
      postHrefBase={`/${locale}/post/`}
    />
  )
}
