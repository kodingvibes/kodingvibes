'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, X, Sparkles, Eye, EyeOff, Code, Lock, Globe } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import { validateString, validateFile, checkUserRateLimit, sanitizeMarkdown } from '@/lib/security/validation'
import TagInput from '@/components/TagInput'
import type { Tables } from '@/types/database'

type Group = Tables<'groups'>

export default function SubmitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedGroupId = searchParams.get('group')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Group selection states
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(preselectedGroupId)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [_userMemberships, _setUserMemberships] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  // Fetch groups where user can post
  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoadingGroups(false)
        return
      }

      // Fetch all groups with their details
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false })

      if (groupsData) {
        // Fetch user's memberships
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)

        const membershipSet = new Set(memberships?.map(m => m.group_id) || [])
        _setUserMemberships(membershipSet)

        // Filter groups: public groups OR groups where user is member
        const accessibleGroups = groupsData.filter(g => 
          g.is_public || membershipSet.has(g.id)
        )

        setGroups(accessibleGroups)

        // If no group preselected, default to 'comunidad' if available
        if (!preselectedGroupId) {
          const comunidadGroup = accessibleGroups.find(g => g.slug === 'comunidad')
          if (comunidadGroup) {
            setSelectedGroupId(comunidadGroup.id)
          } else if (accessibleGroups.length > 0) {
            setSelectedGroupId(accessibleGroups[0].id)
          }
        }
      }

      setLoadingGroups(false)
    }

    fetchGroups()
  }, [preselectedGroupId, supabase])

  // Handle clipboard paste for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Check if the item is an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) {
          // Create a File object from the blob
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type })
          
          // Validate the file
          const validation = validateFile(file, {
            maxSizeMB: 5,
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          })

          if (!validation.valid) {
            alert(validation.error)
            return
          }

          setImage(file)
          const reader = new FileReader()
          reader.onloadend = () => {
            setImagePreview(reader.result as string)
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }, [])

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // OWASP File Validation
      const validation = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })

      if (!validation.valid) {
        alert(validation.error)
        return
      }

      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validación adicional antes de subir
    const validation = validateFile(file, {
      maxSizeMB: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    })

    if (!validation.valid) {
      alert(validation.error)
      return null
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `posts/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGroupId) {
      alert('Debes seleccionar un canal para publicar')
      return
    }

    // OWASP Input Validation
    const titleValidation = validateString(title, {
      maxLength: 300,
      minLength: 5,
      allowHTML: false
    })

    if (!titleValidation.valid) {
      alert(`Error en título: ${titleValidation.error}`)
      return
    }

    // Validar contenido si existe
    let sanitizedContent = null
    if (content.trim()) {
      const contentValidation = validateString(content, {
        maxLength: 10000,
        minLength: 0,
        allowHTML: false
      })

      if (!contentValidation.valid) {
        alert(`Error en contenido: ${contentValidation.error}`)
        return
      }

      sanitizedContent = sanitizeMarkdown(contentValidation.sanitized || content)
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Debes iniciar sesión para publicar')
        return
      }

      // Rate limiting: máximo 3 posts por hora
      if (!checkUserRateLimit(user.id, 'post', 3, 3600000)) {
        alert('Has alcanzado el límite de posts. Por favor espera antes de publicar nuevamente.')
        return
      }

      let imageUrl = null
      if (image) {
        imageUrl = await uploadImage(image)
        if (!imageUrl) {
          setLoading(false)
          return
        }
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          title: titleValidation.sanitized || title.trim(),
          content: sanitizedContent,
          image_url: imageUrl,
          tags: tags,
          user_id: user.id,
          group_id: selectedGroupId,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      router.push(`/post/${post.id}`)
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error al crear el post')
    } finally {
      setLoading(false)
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Crear un post</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Channel Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              Canal <span className="text-red-500">*</span>
            </label>
            
            {loadingGroups ? (
              <div className="p-3 bg-muted rounded-lg animate-pulse h-12" />
            ) : groups.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No tienes acceso a ningún canal. 
                  <Link href="/groups" className="underline ml-1">
                    Explora los canales disponibles
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      selectedGroupId === group.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-background'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: group.color || '#6366f1' }}
                    >
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${
                        selectedGroupId === group.id ? 'text-primary' : 'text-foreground'
                      }`}>
                        {group.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {group.is_public ? (
                          <>
                            <Globe className="h-3 w-3" />
                            <span>Público</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>Privado</span>
                          </>
                        )}
                      </div>
                    </div>
                    {selectedGroupId === group.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {selectedGroup && (
              <p className="text-xs text-muted-foreground mt-2">
                Publicando en: <span className="font-medium text-foreground">{selectedGroup.name}</span>
                {selectedGroup.slug !== 'general' && (
                  <Link 
                    href={`/group/${selectedGroup.slug}`}
                    className="ml-2 text-primary hover:underline"
                  >
                    Ver canal
                  </Link>
                )}
              </p>
            )}
          </div>

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
            />
          </div>

          <div className="mb-5">
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
                placeholder={`Comparte tus ideas, código o experiencias...

Puedes usar Markdown:
- **negrita**
- *cursiva*
- \`código\`
- [links](https://ejemplo.com)`}
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none font-mono text-sm"
                rows={8}
              />
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Imagen
              <span className="text-xs text-muted-foreground font-normal ml-2">(También puedes pegar imagen con Ctrl+V)</span>
            </label>
            
            {imagePreview ? (
              <div className="relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={300}
                  height={200}
                  className="rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-input rounded-xl cursor-pointer hover:border-primary hover:bg-muted/50 transition-all">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Haz click para subir una imagen</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF hasta 5MB</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <TagInput selectedTags={tags} onChange={setTags} maxTags={5} />
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !title.trim() || !selectedGroupId || groups.length === 0}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>

        {/* Markdown Help */}
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
