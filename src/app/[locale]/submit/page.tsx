'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, X, Sparkles, Eye, Code, Youtube, Link as LinkIcon, HelpCircle } from 'lucide-react'
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
  const preselectedGroupId = searchParams.get('channel') || searchParams.get('group')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false)
  const [editMode, setEditMode] = useState(true)

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeThumbnail, setYoutubeThumbnail] = useState<string | null>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(preselectedGroupId)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupTags, setGroupTags] = useState<GroupTag[]>([])
  const [canPost, setCanPost] = useState(true)
  const [postPermissionError, setPostPermissionError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoadingGroups(false)
        return
      }

      const { data: memberships } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', user.id)

      const memberGroups = (memberships || [])
        .map((membership) => membership.groups)
        .filter((group): group is Group => Boolean(group && group.is_active))
        .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))

      setGroups(memberGroups)

      if (memberGroups.length > 0) {
        if (preselectedGroupId) {
          const preselectedExists = memberGroups.some((group) => group.id === preselectedGroupId)
          setSelectedGroupId(preselectedExists ? preselectedGroupId : memberGroups[0].id)
        } else {
          const comunidadGroup = memberGroups.find((group) => group.slug === 'comunidad')
          setSelectedGroupId(comunidadGroup ? comunidadGroup.id : memberGroups[0].id)
        }
      } else {
        setSelectedGroupId(null)
      }

      setLoadingGroups(false)
    }

    fetchGroups()
  }, [preselectedGroupId, supabase])

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

      const { data: tagsData } = await supabase
        .from('group_tags')
        .select('*')
        .eq('group_id', selectedGroupId)
        .order('created_at', { ascending: true })

      if (tagsData) {
        setGroupTags(tagsData)
      }

      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', selectedGroupId)
        .eq('user_id', user.id)
        .single()

      const selectedGroup = groups.find(g => g.id === selectedGroupId)
      if (!selectedGroup) {
        setCanPost(false)
        setPostPermissionError('Canal no encontrado')
        return
      }

      const postCreationType = selectedGroup.post_creation_type || 'anyone'

      if (!membership) {
        setCanPost(false)
        if (!selectedGroup.is_public) {
          setPostPermissionError('No eres miembro de este canal privado')
        } else {
          setPostPermissionError('No eres miembro de este canal')
        }
        return
      }

      if (postCreationType === 'anyone') {
        setCanPost(true)
        setPostPermissionError(null)
      } else if (postCreationType === 'moderators_admins') {
        if (membership.role === 'member') {
          setCanPost(false)
          setPostPermissionError('Solo moderadores y admins pueden crear posts en este canal')
        } else {
          setCanPost(true)
          setPostPermissionError(null)
        }
      } else if (postCreationType === 'admins_only') {
        if (membership.role !== 'admin') {
          setCanPost(false)
          setPostPermissionError('Solo admins pueden crear posts en este canal')
        } else {
          setCanPost(true)
          setPostPermissionError(null)
        }
      }
    }

    fetchGroupData()
  }, [selectedGroupId, supabase, groups])

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) {
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type })

          const validation = validateFile(file, {
            maxSizeMB: 5,
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          })

          if (!validation.valid) {
            alert(validation.error)
            return
          }

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

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validation = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })

      if (!validation.valid) {
        alert(validation.error)
        return
      }

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

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const getYoutubeThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setYoutubeUrl(url)
    const videoId = extractYoutubeId(url)
    if (videoId) {
      setYoutubeThumbnail(getYoutubeThumbnail(videoId))
    } else {
      setYoutubeThumbnail(null)
    }
  }

  const useYoutubeThumbnail = () => {
    if (youtubeThumbnail) {
      setImagePreview(youtubeThumbnail)
      setImage(null)
    }
  }

  const removeYoutube = () => {
    setYoutubeUrl('')
    setYoutubeThumbnail(null)
    if (!image) {
      setImagePreview(null)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const validation = validateFile(file, {
      maxSizeMB: 2,
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

    const titleValidation = validateString(title, {
      maxLength: 300,
      minLength: 5,
      allowHTML: false
    })

    if (!titleValidation.valid) {
      alert(`Error en título: ${titleValidation.error}`)
      return
    }

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
      } else if (youtubeThumbnail && !image) {
        imageUrl = youtubeThumbnail
      }

      const videoUrl = youtubeUrl && extractYoutubeId(youtubeUrl)
        ? `https://youtube.com/watch?v=${extractYoutubeId(youtubeUrl)}`
        : null

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          title: titleValidation.sanitized || title.trim(),
          content: sanitizedContent,
          image_url: imageUrl,
          video_url: videoUrl,
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
        const ogUrl = `https://www.kodingvibes.com/api/og?id=${post.id}${title ? `&title=${encodeURIComponent(title.substring(0, 80))}` : ''}${imageUrl ? `&image=${encodeURIComponent(imageUrl)}` : ''}&v=4`
        fetch(ogUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {})
        router.push(`/post/${post.id}`)
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Error al crear el post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Crear un post</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {loadingGroups ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
              <div className="h-10 bg-muted rounded-lg animate-pulse"></div>
            </div>
          ) : (
            <ChannelSelector
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelect={setSelectedGroupId}
              disabled={!canPost}
              error={postPermissionError}
            />
          )}

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
                  Markdown
                </span>
                <button
                  type="button"
                  onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  {showMarkdownHelp ? 'Ocultar' : 'Sintaxis'}
                </button>
                <div className="flex items-center gap-1 border border-input rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(true)
                      setShowPreview(false)
                    }}
                    className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
                      editMode && !showPreview
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false)
                      setShowPreview(true)
                    }}
                    className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
                      showPreview && !editMode
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>
                </div>
              </div>
            </div>

            {showMarkdownHelp && (
              <div className="mb-3 bg-muted/50 rounded-lg p-3 text-xs">
                <p className="font-medium text-foreground mb-2">Sintaxis Markdown:</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div><code className="bg-background px-1 rounded">**texto**</code> → negrita</div>
                  <div><code className="bg-background px-1 rounded">*texto*</code> → cursiva</div>
                  <div><code className="bg-background px-1 rounded">`código`</code> → código inline</div>
                  <div><code className="bg-background px-1 rounded">```código```</code> → bloque</div>
                  <div><code className="bg-background px-1 rounded">[texto](url)</code> → enlace</div>
                  <div><code className="bg-background px-1 rounded">- item</code> → lista</div>
                  <div><code className="bg-background px-1 rounded"># título</code> → título</div>
                  <div><code className="bg-background px-1 rounded">&gt; quote</code> → cita</div>
                </div>
              </div>
            )}

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
                  onClick={() => {
                    removeImage()
                    if (youtubeThumbnail) {
                      setImagePreview(youtubeThumbnail)
                      setImage(null)
                    }
                  }}
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

          <div className="mb-6">
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-foreground mb-2">
              <Youtube className="h-4 w-4 inline mr-1" />
              Video de YouTube
              <span className="text-xs text-muted-foreground font-normal ml-2">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-10 p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
              {youtubeThumbnail && (
                <button
                  type="button"
                  onClick={useYoutubeThumbnail}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Usar thumbnail
                </button>
              )}
              {youtubeUrl && (
                <button
                  type="button"
                  onClick={removeYoutube}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {youtubeThumbnail && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Image
                  src={youtubeThumbnail}
                  alt="Thumbnail"
                  width={120}
                  height={68}
                  className="rounded object-cover"
                />
                <span>Thumbnail listo para usar</span>
              </div>
            )}
          </div>

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
      </div>
    </main>
  )
}