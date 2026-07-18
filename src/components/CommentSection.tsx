'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import MarkdownContent from './MarkdownContent'
import { Send, CornerDownRight, ArrowBigUp, ArrowBigDown, Eye, MoreVertical, Shield, Trash2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { validateString, checkUserRateLimit, sanitizeMarkdown } from '@/lib/security/validation'
import Image from 'next/image'
import Link from 'next/link'
import { getPublicProfileHref } from '@/lib/profile'

type CommentUser = {
  name: string | null
  username: string | null
  email: string
  avatar_url?: string | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_id: string | null
  vote_count: number
  users: {
    name: string | null
    username: string | null
    email: string
    avatar_url?: string | null
  } | null
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  isAdmin?: boolean
}

interface CommentItemProps {
  comment: Comment
  depth?: number
  user: User | null
  isAdmin: boolean
  replyTo: string | null
  replyContent: string
  loading: boolean
  onReplyClick: (commentId: string) => void
  onReplyContentChange: (value: string) => void
  onSubmitReply: (e: React.FormEvent, commentId: string) => void
  onVote: (commentId: string, value: number) => void
  onDelete: (commentId: string) => void
  deletingId: string | null
  userVotes: Map<string, number>
  voteLoading: string | null
}

const CommentItem = ({
  comment,
  depth = 0,
  user,
  isAdmin,
  replyTo,
  replyContent,
  loading,
  onReplyClick,
  onReplyContentChange,
  onSubmitReply,
  onVote,
  onDelete,
  deletingId,
  userVotes,
  voteLoading
}: CommentItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
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

  const userVote = userVotes.get(comment.id)
  const isVoting = voteLoading === comment.id
  const isDeleting = deletingId === comment.id
  const avatarUrl = comment.users?.avatar_url || null
  const profileHref = getPublicProfileHref(comment.users?.username, comment.user_id)
  const isOwner = !!user && user.id === comment.user_id
  const canModerate = isAdmin || isOwner
  const isDeleted = (comment as unknown as { is_deleted?: boolean }).is_deleted === true

  console.log('[CommentItem]', {
    commentId: comment.id,
    commentUserId: comment.user_id,
    authUserId: user?.id,
    isAdmin,
    isOwner,
    canModerate,
    isDeleted,
  })

  return (
    <div className={`${depth > 0 ? 'ml-6 sm:ml-8 border-l-2 border-border pl-4' : ''}`}>
      <div className="bg-muted/50 rounded-xl p-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => onVote(comment.id, 1)}
              disabled={isVoting}
              className={`p-1 rounded-lg transition-all ${
                userVote === 1
                  ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowBigUp className="h-5 w-5" />
            </button>

            <span className={`text-xs font-bold min-w-[1.5rem] text-center ${
              userVote === 1 ? 'text-indigo-600' : userVote === -1 ? 'text-rose-600' : ''
            }`}>
              {comment.vote_count}
            </span>

            <button
              onClick={() => onVote(comment.id, -1)}
              disabled={isVoting}
              className={`p-1 rounded-lg transition-all ${
                userVote === -1
                  ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <ArrowBigDown className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Link href={profileHref} className="inline-flex items-center gap-2 rounded-md hover:opacity-90 transition-opacity">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                    {(comment.users?.name || comment.users?.email || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-foreground">
                  @{comment.users?.username || comment.users?.name || comment.users?.email?.split('@')[0] || 'anónimo'}
                </span>
              </Link>
              <span>•</span>
              <span>{formatDate(comment.created_at)}</span>
            </div>

            <div className="text-foreground text-sm">
              {isDeleted ? (
                <p className="italic text-muted-foreground text-sm">[Comentario eliminado]</p>
              ) : (
                <MarkdownContent content={comment.content} />
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              {user && !isDeleted && (
                <button
                  onClick={() => onReplyClick(comment.id)}
                  className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
                >
                  {replyTo === comment.id ? 'Cancelar' : 'Responder'}
                </button>
              )}

              {canModerate && !isDeleted && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setMenuOpen(menuOpen => !menuOpen)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Opciones del comentario"
                    title="Moderar comentario"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                        aria-hidden
                      />
                      <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border flex items-center gap-1">
                          {isAdmin && (
                            <Shield className="h-3 w-3 text-purple-600" />
                          )}
                          <span>{isAdmin ? 'Moderación admin' : 'Tus comentarios'}</span>
                        </div>
                        <button
                          onClick={() => {
                            setMenuOpen(false)
                            const confirmMsg = isAdmin && !isOwner
                              ? '¿Eliminar este comentario como administrador? Esta acción lo ocultará.'
                              : '¿Eliminar este comentario? Esta acción lo ocultará.'
                            if (confirm(confirmMsg)) {
                              onDelete(comment.id)
                            }
                          }}
                          disabled={isDeleting}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

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
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              user={user}
              isAdmin={isAdmin}
              replyTo={replyTo}
              replyContent={replyContent}
              loading={loading}
              onReplyClick={onReplyClick}
              onReplyContentChange={onReplyContentChange}
              onSubmitReply={onSubmitReply}
              onVote={onVote}
              onDelete={onDelete}
              deletingId={deletingId}
              userVotes={userVotes}
              voteLoading={voteLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const HiddenComment = ({
  comment,
  depth = 0,
  onShow
}: {
  comment: Comment
  depth?: number
  onShow: (commentId: string) => void
}) => {
  return (
    <div className={`${depth > 0 ? 'ml-6 sm:ml-8 border-l-2 border-border pl-4' : ''}`}>
      <div className="bg-muted/30 rounded-xl p-3 mb-3 flex items-center gap-3">
        <button
          onClick={() => onShow(comment.id)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="h-4 w-4" />
          <span>Mostrar comentario oculto</span>
          <span className="text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full">
            {comment.vote_count} votos
          </span>
        </button>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <HiddenComment key={reply.id} comment={reply} depth={depth + 1} onShow={onShow} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ postId, isAdmin: isAdminProp }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map())
  const [voteLoading, setVoteLoading] = useState<string | null>(null)
  const [visibleHidden, setVisibleHidden] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isAdminResolved, setIsAdminResolved] = useState<boolean>(isAdminProp ?? false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : isAdminResolved

  const fetchUserVotes = useCallback(async (currentUser: User) => {
    if (!currentUser) return

    try {
      const { data, error: voteError } = await supabase
        .from('comment_votes')
        .select('comment_id, value')
        .eq('user_id', currentUser.id)

      if (voteError) {
        console.error('Error fetching user votes:', voteError)
        return
      }

      if (data) {
        const voteMap = new Map<string, number>()
        data.forEach(vote => {
          voteMap.set(vote.comment_id, vote.value)
        })
        setUserVotes(voteMap)
      }
    } catch (err) {
      console.error('Unexpected error fetching user votes:', err)
    }
  }, [supabase])

  const fetchComments = useCallback(async () => {
    try {
      setError(null)
      const { data, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (name, username, email, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .returns<Comment[]>()

      if (commentsError) {
        console.error('Error fetching comments:', commentsError)
        setError('Error al cargar los comentarios')
        return
      }

        if (data) {
          const normalizedData = data.map((comment) => ({
            ...comment,
            users: comment.users as CommentUser | null,
          }))

          const commentMap = new Map<string, Comment & { replies: Comment[] }>()
          const rootComments: Comment[] = []

          normalizedData.forEach(comment => {
            const commentWithReplies = { ...comment, vote_count: comment.vote_count || 0, replies: [] }
            commentMap.set(comment.id, commentWithReplies)
          })

          normalizedData.forEach(comment => {
            if (comment.parent_id && commentMap.has(comment.parent_id)) {
              commentMap.get(comment.parent_id)!.replies.push(commentMap.get(comment.id)!)
            } else {
            rootComments.push(commentMap.get(comment.id)!)
          }
        })

        setComments(rootComments)
      }
    } catch (err) {
      console.error('Unexpected error fetching comments:', err)
      setError('Error al cargar los comentarios')
    }
  }, [postId, supabase])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        // Resolve session and admin status synchronously first so the
        // first render of <CommentItem> already knows the current user.
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!isMounted) return

        setUser(currentUser)

        let resolvedAdmin = Boolean(isAdminProp)
        if (currentUser && isAdminProp === undefined) {
          const { data } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single()
          resolvedAdmin = Boolean(data?.is_admin)
        }
        if (!isMounted) return
        setIsAdminResolved(resolvedAdmin)

        await fetchComments()

        if (currentUser) {
          await fetchUserVotes(currentUser)
        }
      } catch (err) {
        console.error('Error initializing component:', err)
        if (isMounted) {
          setError('Error al inicializar el componente')
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [postId, supabase, fetchComments, fetchUserVotes, isAdminProp])

  const handleVote = async (commentId: string, value: number) => {
    if (!user) {
      alert('Debes iniciar sesión para votar')
      return
    }

    setVoteLoading(commentId)

    try {
      const currentVote = userVotes.get(commentId)

      if (currentVote === value) {
        const { error: deleteError } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (deleteError) {
          console.error('Error removing vote:', deleteError)
          return
        }

        setUserVotes(prev => {
          const newMap = new Map(prev)
          newMap.delete(commentId)
          return newMap
        })

        updateCommentVoteCount(commentId, -value)
      } else {
        const { error: upsertError } = await supabase
          .from('comment_votes')
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            value: value,
          }, {
            onConflict: 'user_id,comment_id'
          })

        if (upsertError) {
          console.error('Error upserting vote:', upsertError)
          return
        }

        setUserVotes(prev => {
          const newMap = new Map(prev)
          newMap.set(commentId, value)
          return newMap
        })

        const voteDiff = currentVote ? value - currentVote : value
        updateCommentVoteCount(commentId, voteDiff)
      }
    } catch (err) {
      console.error('Error voting:', err)
    } finally {
      setVoteLoading(null)
    }
  }

  const updateCommentVoteCount = (commentId: string, diff: number) => {
    setComments(prev => updateCommentInTree(prev, commentId, diff))
  }

  const updateCommentInTree = (comments: Comment[], commentId: string, diff: number): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, vote_count: comment.vote_count + diff }
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, diff)
        }
      }
      return comment
    })
  }

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()

    if (!user) {
      alert('Debes iniciar sesión para comentar')
      return
    }

    if (!checkUserRateLimit(user.id, 'comment', 5, 60000)) {
      alert('Has alcanzado el límite de comentarios. Por favor espera un momento.')
      return
    }

    const content = parentId ? replyContent : newComment

    const validation = validateString(content, {
      maxLength: 5000,
      minLength: 1,
      allowHTML: false
    })

    if (!validation.valid) {
      alert(`Error de validación: ${validation.error}`)
      return
    }

    const sanitizedContent = sanitizeMarkdown(validation.sanitized || content)

    setLoading(true)

    try {
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: sanitizedContent,
        parent_id: parentId || null,
      })

      if (insertError) {
        console.error('Error creating comment:', insertError)
        alert('Error al crear el comentario')
      } else {
        if (parentId) {
          setReplyContent('')
          setReplyTo(null)
        } else {
          setNewComment('')
        }
        await fetchComments()
      }
    } catch (err) {
      console.error('Unexpected error creating comment:', err)
      alert('Error al crear el comentario')
    } finally {
      setLoading(false)
    }
  }

  const handleReplyClick = (commentId: string) => {
    setReplyTo(replyTo === commentId ? null : commentId)
  }

  const handleReplyContentChange = (value: string) => {
    setReplyContent(value)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      alert('Debes iniciar sesión para eliminar comentarios')
      return
    }

    setDeletingId(commentId)
    try {
      console.debug('[CommentSection] deleting', { commentId, isAdmin, userId: user.id })
      const { data, error: deleteError } = await supabase
        .from('comments')
        .update({
          is_deleted: true,
          content: '',
        })
        .eq('id', commentId)
        .select('id, is_deleted')

      console.debug('[CommentSection] delete result', { data, error: deleteError })

      if (deleteError) {
        console.error('Error deleting comment:', deleteError)
        alert(`Error al eliminar el comentario: ${deleteError.message}`)
        return
      }

      if (!data || data.length === 0) {
        alert('No se pudo eliminar el comentario (probable problema de permisos).')
        return
      }

      await fetchComments()
    } catch (err) {
      console.error('Unexpected error deleting comment:', err)
      alert('Error al eliminar el comentario')
    } finally {
      setDeletingId(null)
    }
  }

  const handleShowHidden = (commentId: string) => {
    setVisibleHidden(prev => new Set(prev).add(commentId))
  }

  const toggleShowAllHidden = () => {
    if (visibleHidden.size > 0) {
      setVisibleHidden(new Set())
    } else {
      const allHidden = new Set<string>()
      const collectHiddenIds = (comments: Comment[]) => {
        comments.forEach(comment => {
          if (comment.vote_count < 0) {
            allHidden.add(comment.id)
          }
          if (comment.replies) {
            collectHiddenIds(comment.replies)
          }
        })
      }
      collectHiddenIds(comments)
      setVisibleHidden(allHidden)
    }
  }

  const hasAnyHiddenComments = (comments: Comment[]): boolean => {
    for (const comment of comments) {
      if (comment.vote_count < 0) return true
      if (comment.replies && hasAnyHiddenComments(comment.replies)) return true
    }
    return false
  }

  const renderComments = (comments: Comment[], depth: number = 0): React.ReactNode[] => {
    return comments.map(comment => {
      const isHidden = comment.vote_count < 0 && !visibleHidden.has(comment.id)

      if (isHidden) {
        return (
          <HiddenComment
            key={comment.id}
            comment={comment}
            depth={depth}
            onShow={handleShowHidden}
          />
        )
      }

      const opacityClass = visibleHidden.has(comment.id) ? 'opacity-50' : ''

      return (
        <div key={comment.id} className={opacityClass}>
          <CommentItem
            comment={comment}
            depth={depth}
            user={user}
            isAdmin={isAdmin}
            replyTo={replyTo}
            replyContent={replyContent}
            loading={loading}
            onReplyClick={handleReplyClick}
            onReplyContentChange={handleReplyContentChange}
            onSubmitReply={handleSubmit}
            onVote={handleVote}
            onDelete={handleDeleteComment}
            deletingId={deletingId}
            userVotes={userVotes}
            voteLoading={voteLoading}
          />
        </div>
      )
    })
  }

  const countHiddenReplies = (replies: Comment[]): number => {
    return replies.reduce((count, reply) => {
      if (reply.vote_count < 0 && !visibleHidden.has(reply.id)) {
        return count + 1 + countHiddenReplies(reply.replies || [])
      }
      return count + countHiddenReplies(reply.replies || [])
    }, 0)
  }

  const hiddenCount = comments.reduce((count, comment) => {
    if (comment.vote_count < 0 && !visibleHidden.has(comment.id)) return count + 1 + countHiddenReplies(comment.replies || [])
    return count + countHiddenReplies(comment.replies || [])
  }, 0)

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        Comentarios
        <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </h3>

      {error && (
        <div className="mb-4 bg-destructive/10 text-destructive rounded-xl p-4 text-center">
          <p>{error}</p>
          <button
            onClick={fetchComments}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {hasAnyHiddenComments(comments) && (
        <div className="mb-4">
          <button
            onClick={toggleShowAllHidden}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {visibleHidden.size > 0
              ? `${hiddenCount} comentario${hiddenCount > 1 ? 's' : ''} oculto${hiddenCount > 1 ? 's' : ''}`
              : `Mostrar ${hiddenCount} comentario${hiddenCount > 1 ? 's' : ''} oculto${hiddenCount > 1 ? 's' : ''}`
            }
          </button>
        </div>
      )}

      <div className="space-y-2 mb-8">
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
          renderComments(comments)
        )}
      </div>

      {user ? (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`¿Qué opinas? Comparte tu perspectiva...
Soporta Markdown: **negrita**, *cursiva*, \`código\``}
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
    </div>
  )
}
