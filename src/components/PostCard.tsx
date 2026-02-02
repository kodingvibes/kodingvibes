'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VoteButtons from './VoteButtons'
import MarkdownContent from './MarkdownContent'
import PostActions from './PostActions'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Clock } from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string | null
  image_url: string | null
  vote_count: number
  created_at: string
  user_id: string
  is_deleted: boolean
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
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('PostCard - Current user:', user?.id)
      console.log('PostCard - Post user_id:', post.user_id)
      console.log('PostCard - Match:', user?.id === post.user_id)
      setCurrentUserId(user?.id || null)
      setIsLoading(false)
    }
    getUser()
  }, [post.user_id])

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
              <span className="font-medium text-foreground/80">
                @{post.users?.username || post.users?.name || post.users?.email?.split('@')[0] || 'anónimo'}
              </span>
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
              />
            )}
          </div>

          <Link href={`/post/${post.id}`} className="block group/link">
            <h2 className="text-lg font-semibold text-foreground group-hover/link:text-primary transition-colors mb-2">
              {post.title}
            </h2>
          </Link>
            
          {post.content && (
            <div className="text-muted-foreground text-sm mb-3 line-clamp-2">
              <MarkdownContent content={post.content} />
            </div>
          )}

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
