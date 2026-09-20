import { setRequestLocale } from 'next-intl/server'
import HomeFeed, { type HomePost } from '@/components/HomeFeed'
import {
  getActiveGroups,
  getFeedPosts,
  getGroupTags,
  getHeroPosts,
  type PostRow,
} from '@/lib/public-data'

/**
 * The feed is rendered on the server so that the initial response already
 * contains the channel list and the posts. Previously this page was a client
 * component and Next.js emitted BAILOUT_TO_CLIENT_SIDE_RENDERING, so the HTML
 * that arrived was an empty <div class="min-h-screen bg-background"></div>:
 * anything that does not execute the React bundle — terminal browsers, very
 * old engines, crawlers, JS disabled — saw a blank document.
 *
 * The queries behind that render are cached (src/lib/public-data.ts), because
 * this route can never use the static cache: it reads `searchParams` for
 * `?channel=`, which forces dynamic rendering on its own. See that module for
 * why `export const revalidate` is not an option here.
 */

const normalizeTagValue = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ channel?: string; group?: string }>
}

function toHomePost(post: PostRow, commentsCount: number): HomePost {
  return {
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
    comments_count: commentsCount,
    users: post.users,
    groups: post.groups ?? null,
  }
}

export default async function Home({ params, searchParams }: Props) {
  const { locale } = await params
  const { channel, group } = await searchParams
  setRequestLocale(locale)

  const channelFilter = channel || group || null

  const groups = await getActiveGroups()

  const selectedGroup = channelFilter
    ? groups.find((item) => item.slug === channelFilter) ?? null
    : null

  const [postsData, heroData] = await Promise.all([
    getFeedPosts(selectedGroup?.id ?? null),
    getHeroPosts(),
  ])

  const posts = postsData.map((post) => toHomePost(post, post.comments?.[0]?.count ?? 0))
  const heroPosts = heroData.map((post) => toHomePost(post, 0))

  const groupIds = Array.from(
    new Set(posts.map((post) => post.group_id).filter((id): id is string => Boolean(id)))
  )

  const tagRows = await getGroupTags(groupIds)

  const tagStylesByKey: Record<string, { name: string; color: string }> = {}
  for (const tag of tagRows) {
    tagStylesByKey[`${tag.group_id}:${normalizeTagValue(tag.name)}`] = {
      name: tag.name,
      color: tag.color,
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
