'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  ArrowLeft, Plus, Trash2, AlertCircle, 
  Check, Tag, Palette, Settings 
} from 'lucide-react'
import type { Tables } from '@/types/database'

type Group = Tables<'groups'>
type GroupTag = {
  id: string
  name: string
  color: string
  created_at: string
}

export default function GroupAdminPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [tags, setTags] = useState<GroupTag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/groups')
          return
        }

        // Fetch group
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (groupError || !groupData) {
          router.push('/groups')
          return
        }

        setGroup(groupData)

        // Check if user is admin of the group
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupData.id)
          .eq('user_id', user.id)
          .single()

        const userIsCreator = groupData.created_by === user.id
        const userIsAdmin = memberData?.role === 'admin' || memberData?.role === 'moderator'

        if (!userIsCreator && !userIsAdmin) {
          router.push(`/group/${slug}`)
          return
        }

        setIsAdmin(true)

        // Fetch group tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('group_tags')
          .select('*')
          .eq('group_id', groupData.id)
          .order('created_at', { ascending: true })

        if (tagsError) {
          console.error('Error fetching tags:', tagsError)
        } else {
          setTags(tagsData || [])
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, router, supabase])

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setError('El nombre del tag no puede estar vacío')
      return
    }

    if (tags.length >= 10) {
      setError('No puedes tener más de 10 tags en un grupo')
      return
    }

    if (!group) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Debes estar autenticado')
        return
      }

      const { data, error: insertError } = await supabase
        .from('group_tags')
        .insert({
          group_id: group.id,
          name: newTagName.trim(),
          color: newTagColor,
          created_by: user.id
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError('Ya existe un tag con ese nombre en este grupo')
        } else {
          setError('Error al crear el tag: ' + insertError.message)
        }
        return
      }

      setTags([...tags, data])
      setNewTagName('')
      setNewTagColor('#6366f1')
      setSuccess('Tag creado exitosamente')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al crear el tag')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tag?')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from('group_tags')
        .delete()
        .eq('id', tagId)

      if (deleteError) {
        setError('Error al eliminar el tag: ' + deleteError.message)
        return
      }

      setTags(tags.filter(tag => tag.id !== tagId))
      setSuccess('Tag eliminado exitosamente')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al eliminar el tag')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">Cargando...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin || !group) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/group/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al grupo
          </Link>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ backgroundColor: group.color || '#6366f1' }}
            >
              {group.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-8 h-8" />
                Administrar {group.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestiona los tags y configuración de tu grupo
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Tags Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tags del Grupo
            </h2>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {tags.length}/10
            </span>
          </div>

          {/* Add Tag Form */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Crear nuevo tag
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nombre del tag"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !saving) {
                      handleAddTag()
                    }
                  }}
                />
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-20 h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
                  title="Color del tag"
                />
                <Palette className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white" />
              </div>
              <button
                onClick={handleAddTag}
                disabled={saving || tags.length >= 10 || !newTagName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>

          {/* Tags List */}
          {tags.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay tags creados todavía</p>
              <p className="text-sm mt-1">Crea el primer tag para tu grupo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-gray-900 dark:text-white font-medium">
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={saving}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar tag"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Los tags que crees aquí estarán disponibles para que los miembros los usen al crear posts en este grupo. Puedes crear hasta 10 tags personalizados.
          </p>
        </div>
      </div>
    </div>
  )
}
