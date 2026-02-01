'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImageIcon, X, Sparkles, Eye, EyeOff, Code } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import MarkdownContent from '@/components/MarkdownContent'

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen debe ser menor a 5MB')
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
    
    if (!title.trim()) {
      alert('El título es obligatorio')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Debes iniciar sesión para publicar')
        return
      }

      let imageUrl = null
      if (image) {
        imageUrl = await uploadImage(image)
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content: content.trim() || null,
          image_url: imageUrl,
          user_id: user.id,
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

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Crear un post</h1>
        </div>

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
                placeholder="Comparte tus ideas, código o experiencias...\n\nPuedes usar Markdown:\n- **negrita**\n- *cursiva*\n- `código`\n- [links](https://ejemplo.com)"
                className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none font-mono text-sm"
                rows={8}
              />
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Imagen
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

          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !title.trim()}
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
