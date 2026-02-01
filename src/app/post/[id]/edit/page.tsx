'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, Clock, Eye, EyeOff, Code, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import type { Tables } from '@/types/database'

type Post = Tables<'posts'>

const EDIT_WINDOW_MINUTES = 15

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const checkEditWindow = useCallback((createdAt: string): number => {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    const editWindowEnd = created + EDIT_WINDOW_MINUTES * 60 * 1000
    const remaining = Math.max(0, editWindowEnd - now)
    return Math.floor(remaining / 1000)
  }, [])

  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push(`/post/${postId}`)
          return
        }

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (postError || !postData) {
          router.push('/')
          return
        }

        if (postData.user_id !== user.id) {
          router.push(`/post/${postId}`)
          return
        }

        const remaining = checkEditWindow(postData.created_at)
        if (remaining <= 0) {
          router.push(`/post/${postId}`)
          return
        }

        setPost(postData)
        setTitle(postData.title)
        setContent(postData.content || '')
        setTimeRemaining(remaining)
        setIsAuthorized(true)
      } catch (err) {
        setError('Error al cargar el post')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, router, supabase, checkEditWindow])

  useEffect(() => {
    if (!isAuthorized || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/post/${postId}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isAuthorized, timeRemaining, router, postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (timeRemaining <= 0) {
      setError('El tiempo de edición ha expirado')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim() || null,
          edited_at: new Date().toISOString(),
        })
        .eq('id', postId)

      if (updateError) {
        throw updateError
      }

      router.push(`/post/${postId}`)
      router.refresh()
    } catch (err) {
      setError('Error al actualizar el post')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      </main>
    )
  }

  if (!isAuthorized || !post) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Editar post</h1>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            timeRemaining < 60 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          }`}>
            <Clock className="h-4 w-4" />
            <span>{formatTimeRemaining(timeRemaining)} restantes</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="mb-5">
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿De qué quieres hablar?"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              maxLength={300}
              required
              disabled={saving}
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="content" className="block text-sm font-medium text-foreground">
                Contenido
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  Soporta Markdown
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  disabled={saving}
                >
                  {showPreview ? (
                    <><EyeOff className="h-3 w-3" /> Editar</>
                  ) : (
                    <><Eye className="h-3 w-3" /> Preview</>
                  )}
                </button>
              </div>
            </div>
            
            {showPreview ? (
              <div className="w-full min-h-[150px] p-3 bg-muted border border-input rounded-lg">
                {content ? (
                  <MarkdownContent content={content} />
                ) : (
                  <p className="text-muted-foreground text-sm italic">Sin contenido...</p>
                )}
              </div>
            ) : (
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Comparte tus ideas, código o experiencias...\n\nPuedes usar Markdown:\n- **negrita**\n- *cursiva*\n- `código`\n- [links](https://ejemplo.com)"
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none font-mono text-sm"
                rows={8}
                disabled={saving}
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={`/post/${postId}`}
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !title.trim() || timeRemaining <= 0}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <div className="mt-6 bg-muted/50 rounded-xl p-4 text-sm">
          <p className="font-medium text-foreground mb-2">Información de edición:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Solo puedes editar posts dentro de los primeros {EDIT_WINDOW_MINUTES} minutos después de crearlos</li>
            <li>• Los posts editados mostrarán la fecha de última edición</li>
            <li>• El título es obligatorio, el contenido es opcional</li>
          </ul>
        </div>

        <div className="mt-6 bg-muted/50 rounded-xl p-4 text-sm">
          <p className="font-medium text-foreground mb-2">Formato Markdown soportado:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div><code className="bg-muted px-1 rounded">**texto**</code> → negrita</div>
            <div><code className="bg-muted px-1 rounded">*texto*</code> → cursiva</div>
            <div><code className="bg-muted px-1 rounded">`código`</code> → código inline</div>
            <div><code className="bg-muted px-1 rounded">```código```</code> → bloque de código</div>
            <div><code className="bg-muted px-1 rounded">[texto](url)</code> → enlace</div>
            <div><code className="bg-muted px-1 rounded">- item</code> → lista</div>
          </div>
        </div>
      </div>
    </main>
  )
}
