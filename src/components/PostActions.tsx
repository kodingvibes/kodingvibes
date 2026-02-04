'use client'

import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface PostActionsProps {
  postId: string
  userId: string
  currentUserId: string | null
  createdAt: string
  isDeleted: boolean
  onDelete: () => void
}

export default function PostActions({ 
  postId, 
  userId, 
  currentUserId, 
  createdAt, 
  isDeleted,
  onDelete 
}: PostActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  // Verificar si el usuario actual es el dueño del post
  const isOwner = currentUserId === userId
  
  // Calcular si está dentro de los 15 minutos de edición
  const canEdit = () => {
    if (!isOwner || isDeleted) {
      return false
    }
    
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
        onDelete()
        setIsMenuOpen(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Error inesperado')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOwner || isDeleted) {
    return null
  }

  const editable = canEdit()
  const remainingMinutes = Math.max(0, Math.ceil(15 - (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60)))

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-1.5 rounded-full hover:bg-muted transition-colors"
        aria-label="Opciones del post"
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
          {editable && (
            <Link
              href={`/post/${postId}/edit`}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {remainingMinutes}min
              </span>
            </Link>
          )}
          
          {!editable && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
              Tiempo de edición expirado
            </div>
          )}
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
