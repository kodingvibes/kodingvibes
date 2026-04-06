'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, X, Sparkles, Eye, EyeOff, Code } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'
import { validateString, validateFile, checkUserRateLimit, sanitizeMarkdown } from '@/lib/security/validation'
import { compressImage } from '@/lib/utils'
import TagInput from '@/components/TagInput'
import ChannelSelector from '@/components/ChannelSelector'
import type { Tables } from '@/types/database'

type Group = Tables<'groups'>
type GroupTag = Tables<'group_tags'>

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
  const [groupTags, setGroupTags] = useState<GroupTag[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canPost, setCanPost] = useState(true)
  const [postPermissionError, setPostPermissionError] = useState<string | null>(null)
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

  // Fetch group tags and check post permissions when selected group changes
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!selectedGroupId) {
        setGroupTags([])
        setCanPost(true)
        setPostPermissionError(null)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setGroupTags([])
        setCanPost(false)
        setPostPermissionError('Debes iniciar sesión para publicar')
        return
      }

      // Fetch tags
      const { data: tagsData } = await supabase
        .from('group_tags')
        .select('*')
        .eq('group_id', selectedGroupId)
        .order('created_at', { ascending: true })

      if (tagsData) {
        setGroupTags(tagsData)
      }

      // Check if user is member of the group
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', selectedGroupId)
        .eq('user_id', user.id)
        .single()

      // Get the selected group's post_creation_type
      const selectedGroup = groups.find(g => g.id === selectedGroupId)
      if (!selectedGroup) {
        setCanPost(false)
        setPostPermissionError('Grupo no encontrado')
        return
      }

      const postCreationType = selectedGroup.post_creation_type || 'anyone'

      // If user is not a member, they can't post
      if (!membership) {
        setCanPost(false)
        setUserRole(null)
        if (!selectedGroup.is_public) {
          setPostPermissionError('No eres miembro de este grupo privado')
        } else {
          setPostPermissionError('No eres miembro de este grupo')
        }
        return
      }

      setUserRole(membership.role)

      // Check post permissions based on post_creation_type
      if (postCreationType === 'anyone') {
        setCanPost(true)
        setPostPermissionError(null)
      } else if (postCreationType === 'moderators_admins') {
        if (membership.role === 'member') {
          setCanPost(false)
          setPostPermissionError('Solo moderadores y admins pueden crear posts en este grupo')
        } else {
          setCanPost(true)
          setPostPermissionError(null)
        }
      } else if (postCreationType === 'admins_only') {
        if (membership.role !== 'admin') {
          setCanPost(false)
          setPostPermissionError('Solo admins pueden crear posts en este grupo')
        } else {
          setCanPost(true)
          setPostPermissionError(null)
        }
      }
    }

    fetchGroupData()
  }, [selectedGroupId, supabase, groups])

  // Handle clipboard paste for images
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
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

          // Comprimir imagen antes de mostrarla
          const compressedFile = await compressImage(file)
          setImage(compressedFile)
          const reader = new FileReader()
          reader.onloadend = () => {
            setImagePreview(reader.result as string)
          }
          reader.readAsDataURL(compressedFile)
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Comprimir imagen antes de mostrarla
      const compressedFile = await compressImage(file)
      setImage(compressedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    // La imagen ya viene comprimida, solo validar tamaño final
    const validation = validateFile(file, {
      maxSizeMB: 2, // Reducido porque ya está comprimida
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

  const handleSubmit = async (e: React.FormEvent, postStatus: 'draft' | 'published' = 'published') => {
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

      // Rate limiting: máximo 3 posts por hora (only for published posts)
      if (postStatus === 'published' && !checkUserRateLimit(user.id, 'post', 3, 3600000)) {
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
          status: postStatus,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      if (postStatus === 'draft') {
        router.push(`/drafts`)
      } else {
        router.push(`/post/${post.id}`)
      }
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
          <ChannelSelector
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelect={setSelectedGroupId}
            disabled={loadingGroups || !canPost}
            error={postPermissionError}
          />

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
            <TagInput 
              selectedTags={tags} 
              onChange={setTags} 
              maxTags={5} 
              groupTags={groupTags}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || !title.trim() || !selectedGroupId || groups.length === 0 || !canPost}
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={loading || !title.trim() || !selectedGroupId || groups.length === 0 || !canPost}
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
