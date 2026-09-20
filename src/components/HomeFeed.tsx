'use client'

import PostCard from '@/components/PostCard'
import GoogleSearch from '@/components/GoogleSearch'
import ChannelPicker from '@/components/ChannelPicker'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Clock, Hash } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Tables } from '@/types/database'

export interface HomePost {
  id: string
  title: string
  content: string | null
  image_url: string | null
  vote_count: number
  created_at: string
  user_id: string
  is_deleted: boolean
  status: string
  tags: string[] | null
  group_id: string | null
  is_bot_post: boolean
  bot_name: string | null
  comments_count: number
  users: {
    name: string | null
    username: string | null
    email: string
    avatar_url: string | null
  } | null
  groups?: { name: string; slug: string; color: string } | null
}

type Group = Tables<'groups'>

interface HomeFeedProps {
  posts: HomePost[]
  heroPosts: HomePost[]
  groups: Group[]
  selectedGroup: Group | null
  tagStylesByKey: Record<string, { name: string; color: string }>
  activeChannelSlug: string | null
  /** Locale-prefixed base path for the home route, e.g. "/es". */
  homeHref: string
  /** Locale-prefixed path builder, e.g. "/es/post/<id>". */
  postHrefBase: string
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  return 'hace unos minutos'
}

const truncateContent = (content: string | null, maxLength: number = 150) => {
  if (!content) return ''
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength).trim() + '...'
}

export default function HomeFeed({
  posts,
  heroPosts,
  groups,
  selectedGroup,
  tagStylesByKey,
  activeChannelSlug,
  homeHref,
  postHrefBase,
}: HomeFeedProps) {
  const router = useRouter()

  // Data arrives already rendered from the server, so there is no loading
  // state to show and nothing to fetch on mount.
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('recent')
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Auth-aware affordances (owner/admin menu) are a progressive enhancement:
  // the feed renders identically without them.
  useEffect(() => {
    let cancelled = false

    const loadCurrentUser = async () => {
      let user: { id: string; is_admin?: boolean } | null = null

      try {
        // Read the session from the cookie-backed endpoint rather than the
        // browser client, so this file adds no Supabase SDK to the bundle.
        const response = await fetch('/api/session', { credentials: 'same-origin' })
        if (!response.ok) return
        const payload = (await response.json()) as {
          user?: { id: string; is_admin?: boolean } | null
        }
        user = payload.user ?? null

        if (cancelled || !user) return

        setCurrentUserId(user.id)
        setIsAdmin(Boolean(user.is_admin))
      } catch {
        // Unauthenticated or offline: keep the anonymous rendering.
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  // Hero carousel rotation
  useEffect(() => {
    if (heroPosts.length === 0) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % heroPosts.length)
        setIsTransitioning(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [heroPosts.length])

  const handleGroupSelect = (group: Group | null) => {
    if (group) {
      router.push(`${homeHref}?channel=${encodeURIComponent(group.slug)}`)
    } else {
      router.push(homeHref)
    }
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.vote_count - a.vote_count
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const currentHeroPost = heroPosts[currentMessageIndex]

  return (
    <main className="min-h-screen bg-background">
      {/* Google Search Section */}
      <GoogleSearch />

      {/* Hero Section - Popular Posts Carousel */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        {/* Background image with overlay */}
        {currentHeroPost?.image_url && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: `url(${currentHeroPost.image_url})`,
                opacity: isTransitioning ? 0 : 1,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-purple-900/85 to-pink-900/90 backdrop-blur-sm" />
          </>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          {heroPosts.length === 0 ? (
            <div className="text-center h-[200px] sm:h-[240px] overflow-hidden flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 tracking-tight leading-tight">
                Posts más populares
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-3xl mx-auto mb-6 leading-relaxed">
                No hay posts populares aún. ¡Sé el primero en compartir!
              </p>
            </div>
          ) : (
            <div className="text-center h-[200px] sm:h-[240px] overflow-hidden flex flex-col justify-center">
              <div
                className={`transition-all duration-500 ease-in-out transform ${
                  isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                }`}
              >
                {currentHeroPost && (
                  <Link href={`${postHrefBase}${currentHeroPost.id}`} className="block">
                    {/* Group badge */}
                    {currentHeroPost.groups && (
                      <div className="flex justify-center mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-white/95"
                          style={{ backgroundColor: currentHeroPost.groups.color || '#6366f1' }}
                        >
                          <Hash className="h-4 w-4" />
                          {currentHeroPost.groups.name}
                        </span>
                      </div>
                    )}

                    {/* Post title */}
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 tracking-tight leading-tight hover:text-white/90 transition-colors">
                      {currentHeroPost.title}
                    </h1>

                    {/* Post preview */}
                    {currentHeroPost.content && (
                      <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-3xl mx-auto mb-3 leading-relaxed">
                        {truncateContent(currentHeroPost.content, 150)}
                      </p>
                    )}

                    {/* Post metadata */}
                    <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-white/80 mb-5">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        {currentHeroPost.vote_count} votos
                      </span>
                      <span>•</span>
                      <span className="hover:text-white transition-colors">
                        @{currentHeroPost.users?.username || currentHeroPost.users?.name || 'anónimo'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(currentHeroPost.created_at)}
                      </span>
                    </div>
                  </Link>
                )}
              </div>

              {/* Progress indicators */}
              <div className="flex justify-center gap-2 mb-6">
                {heroPosts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsTransitioning(true)
                      setTimeout(() => {
                        setCurrentMessageIndex(index)
                        setIsTransitioning(false)
                      }, 300)
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentMessageIndex
                        ? 'w-8 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Ver post ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 sm:pb-8">
        {/* Channel Selector & Sort tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          {/* Group Filter */}
          <div className="relative w-full sm:w-[340px]">
            <ChannelPicker
              channels={groups}
              selectedChannelId={selectedGroup?.id || null}
              onSelect={(channelId) => {
                if (!channelId) {
                  handleGroupSelect(null)
                  return
                }
                const group = groups.find((item) => item.id === channelId) || null
                handleGroupSelect(group)
              }}
              allowAll
              allLabel="Todos los canales"
            />
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => setSortBy('popular')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-colors ${
                sortBy === 'popular'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Populares</span>
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-colors ${
                sortBy === 'recent'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Recientes</span>
            </button>
          </div>
        </div>

        {/* Posts feed */}
        <div className="space-y-4">
          {sortedPosts.length > 0 ? (
            sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                tagStylesByKey={tagStylesByKey}
              />
            ))
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-base sm:text-lg mb-2">
                {selectedGroup
                  ? `No hay posts en ${selectedGroup.name} aún`
                  : 'No hay posts aún'}
              </p>
              <Link
                href={`${homeHref}/submit${selectedGroup ? `?channel=${selectedGroup.id}` : ''}`}
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm sm:text-base"
              >
                Sé el primero en publicar
              </Link>
            </div>
          )}
        </div>

        {/* Visible only to clients that never run JS: the feed above stays a
            plain list of links, and this is the explicit "show everything"
            escape hatch. */}
        {activeChannelSlug && (
          <noscript>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿No ves todos los canales?{' '}
              <Link href={homeHref} className="text-primary hover:underline">
                Ver todos los canales
              </Link>
            </p>
          </noscript>
        )}
      </div>
    </main>
  )
}
