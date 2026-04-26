'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import VoteButtons from './VoteButtons'
import PostActions from './PostActions'
import { MessageSquare, Clock, Bot } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string | null
  image_url: string | null
  vote_count: number
  created_at: string
  user_id: string
  is_deleted: boolean
  tags: string[] | null
  group_id: string | null
  is_bot_post: boolean
  bot_name: string | null
  users: {
    name: string | null
    username: string | null
    email: string
    avatar_url?: string | null
  } | null
  comments_count?: number
}

interface PostCardProps {
  post: Post
  onDelete?: () => void
  currentUserId?: string | null
  isAdmin?: boolean
  tagStylesByKey?: Record<string, { name: string; color: string }>
}

const normalizeTagValue = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

export default function PostCard({
  post,
  onDelete,
  currentUserId = null,
  isAdmin = false,
  tagStylesByKey,
}: PostCardProps) {
  const router = useRouter()

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

  const displayAuthor =
    post.is_bot_post && post.bot_name?.trim()
      ? post.bot_name.trim()
      : `@${post.users?.username || post.users?.name || post.users?.email?.split('@')[0] || 'anónimo'}`

  const displayAvatarInitial =
    (post.is_bot_post && post.bot_name?.trim()
      ? post.bot_name.trim()
      : post.users?.username || post.users?.name || post.users?.email || 'A')
      .charAt(0)
      .toUpperCase()

  const displayAvatarUrl = post.users?.avatar_url || null

  if (post.is_deleted) {
    return (
      <article className="bg-muted/50 border border-border rounded-xl p-4 text-center text-muted-foreground">
        <p>Este post ha sido eliminado</p>
      </article>
    )
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Evitar navegación si se hizo clic en botones de acción o votos
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-no-navigate]')) {
      return
    }
    router.push(`/post/${post.id}`)
  }

  const hasImage = !!post.image_url

  return (
    <article 
      onClick={handleCardClick}
      className={`group relative border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all duration-300 animate-slide-up ${
        hasImage ? 'min-h-[180px]' : ''
      }`}
    >
      {/* Background image with blur effect */}
      {hasImage && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${post.image_url})` }}
          />
          <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
        </>
      )}

      {/* Content */}
      <div className={`relative flex ${hasImage ? 'text-white' : 'bg-card text-foreground'}`}>
        {/* Vote section */}
        <div className={`p-3 flex items-center ${hasImage ? 'bg-black/20' : 'bg-muted/50'}`} data-no-navigate>
          <VoteButtons postId={post.id} initialVotes={post.vote_count} />
        </div>

        {/* Content section */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 text-xs ${hasImage ? 'text-white/80' : 'text-muted-foreground'}`}>
              {displayAvatarUrl ? (
                <Image
                  src={displayAvatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[10px] ${
                  hasImage 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                }`}>
                  {displayAvatarInitial}
                </span>
              )}
              <span className={`font-medium ${hasImage ? 'text-white' : 'text-foreground/80'}`}>
                {displayAuthor}
              </span>
              {post.is_bot_post && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                  hasImage 
                    ? 'bg-emerald-500/30 text-emerald-200' 
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <Bot className="h-3 w-3" />
                  bot
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(post.created_at)}
              </span>
            </div>
            
            <div data-no-navigate>
              <PostActions 
                postId={post.id}
                userId={post.user_id}
                currentUserId={currentUserId}
                createdAt={post.created_at}
                isDeleted={post.is_deleted}
                isAdmin={isAdmin}
                onDelete={onDelete || (() => {})}
                title={post.title}
                imageUrl={post.image_url}
              />
            </div>
          </div>

          {/* Tags sobre el título */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.tags.map((tagValue) => {
                const normalizedTag = normalizeTagValue(tagValue)
                const tagKey = `${post.group_id ?? 'global'}:${normalizedTag}`
                const tagMeta = tagStylesByKey?.[tagKey]

                return (
                  <span
                    key={tagValue}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tagMeta?.color || '#6b7280' }}
                  >
                    {tagMeta?.name || tagValue}
                  </span>
                )
              })}
            </div>
          )}
          
          <h2 className={`text-lg font-semibold mb-2 transition-colors ${
            hasImage 
              ? 'text-white group-hover:text-white/90' 
              : 'text-foreground group-hover:text-primary'
          }`}>
            {post.title}
          </h2>

          {/* Post image preview */}
          {hasImage && (
            <div className="mb-3 overflow-hidden rounded-lg border border-white/20">
              <Image
                src={post.image_url!}
                alt={post.title}
                width={600}
                height={400}
                className="w-full max-h-60 object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          <div className={`flex items-center gap-4 text-sm ${hasImage ? 'text-white/70' : 'text-muted-foreground'}`}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              hasImage 
                ? 'hover:bg-white/10' 
                : 'hover:bg-muted'
            }`}>
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments_count || 0} comentarios</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
