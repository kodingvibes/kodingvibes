'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VoteButtons from './VoteButtons'
import PostActions from './PostActions'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Clock, Bot } from 'lucide-react'

interface GroupTag {
  id: string
  name: string
  color: string
}

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
  } | null
  comments_count?: number
}

interface PostCardProps {
  post: Post
  onDelete?: () => void
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [groupTags, setGroupTags] = useState<GroupTag[]>([])
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      setIsLoading(false)
    }
    getUser()

    // Cargar tags del grupo si existe
    const loadGroupTags = async () => {
      if (post.group_id) {
        const { data } = await supabase
          .from('group_tags')
          .select('*')
          .eq('group_id', post.group_id)
        
        if (data) {
          setGroupTags(data)
        }
      }
    }
    loadGroupTags()
  }, [post.user_id, post.group_id, supabase])

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

  if (post.is_deleted) {
    return (
      <article className="bg-muted/50 border border-border rounded-xl p-4 text-center text-muted-foreground">
        <p>Este post ha sido eliminado</p>
      </article>
    )
  }

  return (
    <article className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-slide-up">
      <div className="flex">
        {/* Vote section */}
        <div className="bg-muted/50 p-3 flex items-center">
          <VoteButtons postId={post.id} initialVotes={post.vote_count} />
        </div>

        {/* Content section */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-[10px]">
                {displayAvatarInitial}
              </span>
              <span className="font-medium text-foreground/80">
                {displayAuthor}
              </span>
              {post.is_bot_post && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
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
            
            {!isLoading && (
              <PostActions 
                postId={post.id}
                userId={post.user_id}
                currentUserId={currentUserId}
                createdAt={post.created_at}
                isDeleted={post.is_deleted}
                onDelete={onDelete || (() => {})}
                title={post.title}
                imageUrl={post.image_url}
              />
            )}
          </div>

          <Link href={`/post/${post.id}`} className="block group/link">
            {/* Tags sobre el título */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.tags.map((tagValue) => {
                  // Buscar el tag en los tags del grupo
                  const groupTag = groupTags.find(gt => 
                    gt.name.toLowerCase().replace(/\s+/g, '-') === tagValue
                  )
                  
                  return (
                    <span
                      key={tagValue}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: groupTag?.color || '#6b7280' }}
                    >
                      {groupTag?.name || tagValue}
                    </span>
                  )
                })}
              </div>
            )}
            
            <h2 className="text-lg font-semibold text-foreground group-hover/link:text-primary transition-colors mb-2">
              {post.title}
            </h2>
          </Link>

          {post.image_url && (
            <div className="mb-3 overflow-hidden rounded-lg">
              <Image
                src={post.image_url}
                alt={post.title}
                width={600}
                height={400}
                className="w-full max-h-80 object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 hover:bg-muted px-3 py-1.5 rounded-full transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments_count || 0} comentarios</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
