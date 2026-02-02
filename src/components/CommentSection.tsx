'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import MarkdownContent from './MarkdownContent'
import { Send, CornerDownRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { validateString, checkUserRateLimit, sanitizeMarkdown } from '@/lib/security/validation'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_id: string | null
  users: {
    name: string | null
    username: string | null
    email: string
  } | null
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
}

interface CommentItemProps {
  comment: Comment
  depth?: number
  user: User | null
  replyTo: string | null
  replyContent: string
  loading: boolean
  onReplyClick: (commentId: string) => void
  onReplyContentChange: (value: string) => void
  onSubmitReply: (e: React.FormEvent, commentId: string) => void
}

const CommentItem = ({ 
  comment, 
  depth = 0, 
  user, 
  replyTo, 
  replyContent, 
  loading,
  onReplyClick,
  onReplyContentChange,
  onSubmitReply
}: CommentItemProps) => {
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

  return (
    <div className={`${depth > 0 ? 'ml-6 sm:ml-8 border-l-2 border-border pl-4' : ''}`}>
      <div className="bg-muted/50 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
            {(comment.users?.name || comment.users?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-foreground">
            @{comment.users?.username || comment.users?.name || comment.users?.email?.split('@')[0] || 'anónimo'}
          </span>
          <span>•</span>
          <span>{formatDate(comment.created_at)}</span>
        </div>
        
        <div className="text-foreground text-sm">
          <MarkdownContent content={comment.content} />
        </div>
        
        {user && (
          <button
            onClick={() => onReplyClick(comment.id)}
            className="mt-3 text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
          >
            {replyTo === comment.id ? 'Cancelar' : 'Responder'}
          </button>
        )}
        
        {replyTo === comment.id && (
          <form onSubmit={(e) => onSubmitReply(e, comment.id)} className="mt-3 animate-slide-up">
            <textarea
              value={replyContent}
              onChange={(e) => onReplyContentChange(e.target.value)}
              placeholder="Escribe tu respuesta... (soporta Markdown)"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm resize-none"
              rows={3}
              required
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading || !replyContent.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
              >
                <Send className="h-4 w-4" />
                Responder
              </button>
            </div>
          </form>
        )}
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              depth={depth + 1}
              user={user}
              replyTo={replyTo}
              replyContent={replyContent}
              loading={loading}
              onReplyClick={onReplyClick}
              onReplyContentChange={onReplyContentChange}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, supabase])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (name, username, email)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) {
      const commentMap = new Map<string, Comment & { replies: Comment[] }>()
      const rootComments: Comment[] = []

      data.forEach(comment => {
        const commentWithReplies = { ...comment, replies: [] }
        commentMap.set(comment.id, commentWithReplies)
      })

      data.forEach(comment => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id)!.replies.push(commentMap.get(comment.id)!)
        } else {
          rootComments.push(commentMap.get(comment.id)!)
        }
      })

      setComments(rootComments)
    }
  }

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    
    if (!user) {
      alert('Debes iniciar sesión para comentar')
      return
    }

    // Rate limiting: máximo 5 comentarios por minuto
    if (!checkUserRateLimit(user.id, 'comment', 5, 60000)) {
      alert('Has alcanzado el límite de comentarios. Por favor espera un momento.')
      return
    }

    const content = parentId ? replyContent : newComment

    // Validación de seguridad OWASP
    const validation = validateString(content, {
      maxLength: 5000,
      minLength: 1,
      allowHTML: false
    })

    if (!validation.valid) {
      alert(`Error de validación: ${validation.error}`)
      return
    }

    // Sanitizar contenido Markdown
    const sanitizedContent = sanitizeMarkdown(validation.sanitized || content)

    setLoading(true)

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: sanitizedContent,
      parent_id: parentId || null,
    })

    if (error) {
      console.error('Error creating comment:', error)
    } else {
      if (parentId) {
        setReplyContent('')
        setReplyTo(null)
      } else {
        setNewComment('')
      }
      fetchComments()
    }

    setLoading(false)
  }

  const handleReplyClick = (commentId: string) => {
    setReplyTo(replyTo === commentId ? null : commentId)
  }

  const handleReplyContentChange = (value: string) => {
    setReplyContent(value)
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        Comentarios
        <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </h3>
      
      {user ? (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="¿Qué opinas? Comparte tu perspectiva...\nSoporta Markdown: **negrita**, *cursiva*, `código`"
              className="w-full p-3 bg-transparent border-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground"
              rows={3}
              required
            />
            <div className="flex justify-end mt-2 pt-2 border-t border-border">
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
              >
                <Send className="h-4 w-4" />
                Comentar
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 bg-muted/50 rounded-xl p-6 text-center">
          <p className="text-muted-foreground mb-2">Inicia sesión para participar en la conversación</p>
        </div>
      )}
      
      <div className="space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <CornerDownRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No hay comentarios aún. Sé el primero en comentar.
            </p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              user={user}
              replyTo={replyTo}
              replyContent={replyContent}
              loading={loading}
              onReplyClick={handleReplyClick}
              onReplyContentChange={handleReplyContentChange}
              onSubmitReply={handleSubmit}
            />
          ))
        )}
      </div>
    </div>
  )
}
