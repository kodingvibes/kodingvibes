'use client'

import { useEffect, useState } from 'react'
import { MoreVertical, Pencil, Trash2, Shield, Share2, Link as LinkIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PostActionsClientProps {
  postId: string
  userId: string
  createdAt: string
  isDeleted: boolean
  status: 'draft' | 'published'
  title?: string
}

export default function PostActionsClient({ 
  postId, 
  userId, 
  createdAt, 
  isDeleted,
  status,
  title
}: PostActionsClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const postUrl = `https://www.kodingvibes.com/post/${postId}`

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(data?.is_admin || false)
      }
    }
    getUser()
  }, [supabase])

  // Verificar si el usuario actual es el dueño del post
  const isOwner = currentUserId === userId
  
  // Calcular si está dentro de los 15 minutos de edición
  // Solo aplica para posts publicados; los borradores se pueden editar sin límite
  const canEdit = () => {
    if (isDeleted) return false
    
    // Admins can always edit
    if (isAdmin) return true
    
    // Drafts can be edited without time limit
    if (status === 'draft') return true
    
    // Owners can edit published posts within 15 minutes
    if (!isOwner) return false
    
    const created = new Date(createdAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60)
    return diffMinutes <= 15
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este post? Esta acción lo ocultará.')) {
      return
    }

    if (!currentUserId) {
      alert('Debes iniciar sesión para eliminar posts')
      return
    }

    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', postId)
        .eq('user_id', currentUserId)

      if (error) {
        console.error('Error deleting post:', error)
        alert('Error al eliminar el post')
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Error inesperado')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    try {
      const ogUrl = `https://www.kodingvibes.com/api/og?id=${postId}${title ? `&title=${encodeURIComponent(title.substring(0, 80))}` : ''}&v=3`
      fetch(ogUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {})

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(postUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = postUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }

  // If post is deleted and user is not admin, show nothing
  if (isDeleted && !isAdmin) return null

  const editable = canEdit()
  const remainingMinutes = Math.max(0, Math.ceil(15 - (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60)))
  
  // Check if we should show the menu at all
  const hasMenuActions = (isOwner || isAdmin) && !isDeleted

  return (
    <div className="flex items-center gap-1 ml-auto">
      {/* Share button - visible to everyone */}
      <button
        onClick={handleShare}
        className="p-1.5 rounded-full hover:bg-muted transition-colors"
        aria-label={copied ? 'Enlace copiado' : 'Compartir post'}
        title={copied ? '¡Enlace copiado!' : 'Copiar enlace del post'}
      >
        {copied ? (
          <LinkIcon className="h-4 w-4 text-green-500" />
        ) : (
          <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
        )}
      </button>

      {/* Menu button - only for owners/admins */}
      {hasMenuActions && (
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Opciones del post"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
              {editable && (
                <Link
                  href={`/post/${postId}/edit`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Editar</span>
                  {isAdmin ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <Shield className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {remainingMinutes}min
                    </span>
                  )}
                </Link>
              )}
              
              {!editable && !isAdmin && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                  Tiempo de edición expirado
                </div>
              )}
              
              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
