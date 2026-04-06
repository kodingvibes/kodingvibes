'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Send, Trash2, Edit3, Clock, ArrowLeft } from 'lucide-react'
import type { Tables } from '@/types/database'

type Post = Tables<'posts'> & {
  users: { name: string | null; username: string | null; email: string } | null
  groups: { name: string; slug: string; color: string } | null
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDrafts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth')
        return
      }

      const { data: draftsData } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (name, username, email),
          groups:group_id (name, slug, color)
        `)
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      setDrafts(draftsData || [])
      setLoading(false)
    }

    fetchDrafts()
  }, [supabase, router])

  const handlePublish = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ status: 'published' })
      .eq('id', postId)

    if (!error) {
      setDrafts(drafts.filter(d => d.id !== postId))
      router.push(`/post/${postId}`)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('¿Estás seguro de eliminar este borrador?')) return

    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', postId)

    if (!error) {
      setDrafts(drafts.filter(d => d.id !== postId))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours} hr`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link 
            href="/"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Mis borradores</h1>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No tienes borradores</h2>
            <p className="text-muted-foreground mb-6">
              Los borradores que guardes aparecerán aquí para que puedas publicarlos después.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              <Edit3 className="h-4 w-4" />
              Crear un post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div 
                key={draft.id} 
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {draft.groups && (
                        <div 
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: draft.groups.color || '#6366f1' }}
                        >
                          {draft.groups.name}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(draft.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                      {draft.title}
                    </h3>
                    
                    {draft.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {draft.content.replace(/[#*_`\[\]]/g, '').substring(0, 150)}
                      </p>
                    )}
                    
                    {draft.tags && draft.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {draft.tags.slice(0, 3).map((tag, i) => (
                          <span 
                            key={i} 
                            className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {draft.image_url && (
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <img
                        src={draft.image_url}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <Link
                    href={`/post/${draft.id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handlePublish(draft.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-opacity"
                  >
                    <Send className="h-4 w-4" />
                    Publicar
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
