'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Hash, Globe, Lock, Loader2, Info } from 'lucide-react'
import Link from 'next/link'
import { validateString } from '@/lib/security/validation'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type GroupRequest = Tables<'group_creation_requests'>

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [existingRequest, setExistingRequest] = useState<GroupRequest | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        alert('Debes iniciar sesión para solicitar un canal')
        router.push('/')
        return
      }
      setUser(currentUser)

      // Check for existing pending request
      const { data: requests } = await supabase
        .from('group_creation_requests')
        .select('*')
        .eq('requested_by', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      if (requests && requests.length > 0) {
        setExistingRequest(requests[0])
      }
    }

    checkAuth()
  }, [supabase, router])

  // Auto-generate slug from name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
    setSlug(generatedSlug)
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Debes iniciar sesión')
      return
    }

    // Validation
    const nameValidation = validateString(name, {
      minLength: 3,
      maxLength: 50,
      allowHTML: false
    })

    if (!nameValidation.valid) {
      alert(`Error en el nombre: ${nameValidation.error}`)
      return
    }

    if (slug.length < 3 || slug.length > 50) {
      alert('El slug debe tener entre 3 y 50 caracteres')
      return
    }

    const descValidation = validateString(description, {
      minLength: 10,
      maxLength: 500,
      allowHTML: false
    })

    if (!descValidation.valid) {
      alert(`Error en la descripción: ${descValidation.error}`)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('group_creation_requests')
        .insert({
          requested_by: user.id,
          name: nameValidation.sanitized || name.trim(),
          slug: slug,
          description: descValidation.sanitized || description.trim(),
          is_public: isPublic,
          status: 'pending'
        })

      if (error) {
        if (error.message.includes('duplicate key')) {
          alert('Ya existe un canal o solicitud con ese nombre/slug')
        } else {
          throw error
        }
        return
      }

      alert('¡Solicitud enviada! Un administrador la revisará pronto.')
      router.push('/groups')
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (existingRequest) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/groups" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a canales
          </Link>

          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Solicitud en revisión
            </h1>
            <p className="text-muted-foreground mb-6">
              Ya tienes una solicitud pendiente para el canal &quot;{existingRequest.name}&quot;.
              Un administrador la revisará pronto.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-muted-foreground mb-1">Detalles de tu solicitud:</p>
              <p className="font-medium text-foreground">Nombre: {existingRequest.name}</p>
              <p className="font-medium text-foreground">Slug: /{existingRequest.slug}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Tipo: {existingRequest.is_public ? 'Público' : 'Privado'}
              </p>
              <p className="text-sm text-muted-foreground">
                Enviada: {new Date(existingRequest.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Ver todos los canales
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link 
          href="/groups" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a canales
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Hash className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solicitar nuevo canal</h1>
            <p className="text-muted-foreground">Crea un espacio para tu comunidad</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground mb-6">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p>
              Las solicitudes son revisadas por administradores antes de ser aprobadas. 
              Esto nos ayuda a mantener la calidad de la comunidad y evitar canales duplicados.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Nombre del canal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Inteligencia Artificial"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Entre 3 y 50 caracteres
            </p>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-2">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                /
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="inteligencia-artificial"
                className="w-full p-3 pl-6 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                maxLength={50}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Solo letras minúsculas, números y guiones
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este canal? ¿Qué tipo de contenido se comparte aquí?"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              rows={4}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo 10 caracteres, máximo 500
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Tipo de canal
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  isPublic 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Globe className={`h-5 w-5 ${isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${isPublic ? 'text-primary' : 'text-foreground'}`}>
                    Público
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cualquiera puede ver y unirse
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  !isPublic 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock className={`h-5 w-5 ${!isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${!isPublic ? 'text-primary' : 'text-foreground'}`}>
                    Privado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo miembros pueden ver contenido
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link
              href="/groups"
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim() || !description.trim()}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
