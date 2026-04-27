'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  ArrowLeft, Plus, Trash2, AlertCircle, 
  Check, Tag, Palette, Settings, Users, Shield, 
  Search, ChevronLeft, ChevronRight, 
  Upload, X
} from 'lucide-react'
import Image from 'next/image'
import { compressImage } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/Loading'
import type { Tables } from '@/types/database'
import { getPublicProfileHref } from '@/lib/profile'

type Group = Tables<'groups'>
type GroupTag = {
  id: string
  name: string
  color: string
  created_at: string
}

type GroupMember = {
  id: string
  user_id: string
  role: 'member' | 'moderator' | 'admin'
  joined_at: string
  users: {
    username: string
    name: string | null
    avatar_url: string | null
  }
}

type TabType = 'settings' | 'tags' | 'moderators'

export default function GroupAdminPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  
  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [group, setGroup] = useState<Group | null>(null)
  const [tags, setTags] = useState<GroupTag[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Settings tab state
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupColor, setGroupColor] = useState('#6366f1')
  const [groupPostCreationType, setGroupPostCreationType] = useState('anyone')
  const [groupIconUrl, setGroupIconUrl] = useState<string | null>(null)
  const [groupBannerUrl, setGroupBannerUrl] = useState<string | null>(null)
  const [newIconFile, setNewIconFile] = useState<File | null>(null)
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  
  // Tags tab state
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  
  // Moderators tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 10
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/channels')
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
          router.push('/channels')
          return
        }

        setGroup(groupData)
        setGroupName(groupData.name)
        setGroupDescription(groupData.description || '')
        setGroupColor(groupData.color || '#6366f1')
        setGroupPostCreationType(groupData.post_creation_type || 'anyone')
        setGroupIconUrl(groupData.icon_url || null)
        setGroupBannerUrl(groupData.banner_url || null)

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
          router.push(`/channel/${slug}`)
          return
        }

        setIsAdmin(true)
        setIsCreator(userIsCreator)

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

        // Fetch group members
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            users (
              username,
              name,
              avatar_url
            )
          `)
          .eq('group_id', groupData.id)
          .order('joined_at', { ascending: true })

        if (membersError) {
          console.error('Error fetching members:', membersError)
        } else {
          setMembers((membersData || []) as GroupMember[])
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

  const uploadImage = async (file: File, type: 'icon' | 'banner'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `groups/${type}s/${group?.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file)

    if (uploadError) {
      console.error(`Error uploading ${type}:`, uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setIconPreview(reader.result as string)
      setNewIconFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setBannerPreview(reader.result as string)
      setNewBannerFile(file)
    }
    reader.readAsDataURL(file)
  }

  const removeIcon = () => {
    setNewIconFile(null)
    setIconPreview(null)
    setGroupIconUrl(null)
  }

  const removeBanner = () => {
    setNewBannerFile(null)
    setBannerPreview(null)
    setGroupBannerUrl(null)
  }

  const handleUpdateGroupSettings = async () => {
    if (!groupName.trim()) {
      setError('El nombre del canal no puede estar vacío')
      return
    }

    if (!group) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let finalIconUrl = groupIconUrl
      let finalBannerUrl = groupBannerUrl

      if (newIconFile) {
        const compressedFile = await compressImage(newIconFile, { maxSizeMB: 1 })
        const uploadedUrl = await uploadImage(compressedFile, 'icon')
        if (uploadedUrl) {
          finalIconUrl = uploadedUrl
        }
      }

      if (newBannerFile) {
        const compressedFile = await compressImage(newBannerFile, { maxSizeMB: 2 })
        const uploadedUrl = await uploadImage(compressedFile, 'banner')
        if (uploadedUrl) {
          finalBannerUrl = uploadedUrl
        }
      }

      const { error: updateError } = await supabase
        .from('groups')
        .update({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          color: groupColor,
          post_creation_type: groupPostCreationType,
          icon_url: finalIconUrl,
          banner_url: finalBannerUrl
        })
        .eq('id', group.id)

      if (updateError) {
        setError('Error al actualizar el canal: ' + updateError.message)
        return
      }

      setGroup({
        ...group,
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        color: groupColor,
        post_creation_type: groupPostCreationType,
        icon_url: finalIconUrl,
        banner_url: finalBannerUrl
      })

      setGroupIconUrl(finalIconUrl)
      setGroupBannerUrl(finalBannerUrl)
      setNewIconFile(null)
      setNewBannerFile(null)
      setIconPreview(null)
      setBannerPreview(null)
      
      setSuccess('Configuración del canal actualizada exitosamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al actualizar el canal')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setError('El nombre del tag no puede estar vacío')
      return
    }

    if (tags.length >= 10) {
      setError('No puedes tener más de 10 tags en un canal')
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
          setError('Ya existe un tag con ese nombre en este canal')
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

    setDeletingTag(tagId)
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
      setDeletingTag(null)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'member' | 'moderator' | 'admin') => {
    if (!isCreator) {
      setError('Solo el creador del canal puede cambiar roles')
      return
    }

    setChangingRole(memberId)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (updateError) {
        setError('Error al cambiar el rol: ' + updateError.message)
        return
      }

      setMembers(members.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))
      
      const memberUsername = members.find(m => m.id === memberId)?.users.username
      setSuccess(`Rol de ${memberUsername} actualizado a ${newRole}`)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cambiar el rol')
    } finally {
      setChangingRole(null)
    }
  }

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    if (!isCreator && member.role === 'moderator') {
      setError('Solo el creador del canal puede remover moderadores')
      return
    }

    if (memberUserId === group?.created_by) {
      setError('No puedes remover al creador del canal')
      return
    }

    if (!confirm(`¿Estás seguro de que quieres remover a ${member.users.username} del canal?`)) {
      return
    }

    setRemovingMember(memberId)
    setError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)

      if (deleteError) {
        setError('Error al remover al miembro: ' + deleteError.message)
        return
      }

      setMembers(members.filter(m => m.id !== memberId))
      setSuccess(`${member.users.username} ha sido removido del canal`)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al remover al miembro')
    } finally {
      setRemovingMember(null)
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
            href={`/channel/${slug}`}
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
                 Gestiona la configuración de tu canal
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

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Ajustes
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tags'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                  {tags.length}/10
                </span>
              </div>
            </button>
            {isCreator && (
              <button
                onClick={() => setActiveTab('moderators')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'moderators'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Moderadores
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                    {members.length}
                  </span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                 Ajustes del Canal
                </h2>
            </div>

            <div className="space-y-6">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Canal
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nombre del canal"
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Descripción del canal"
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {groupDescription.length}/500 caracteres
                </p>
              </div>

              {/* Icono del Canal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icono del Canal
                </label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="relative flex-shrink-0">
                    {iconPreview || groupIconUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                        <Image
                          src={iconPreview || groupIconUrl || ''}
                          alt="Icono del canal"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeIcon}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                        style={{ backgroundColor: groupColor }}
                      >
                        {groupName ? groupName[0].toUpperCase() : 'G'}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload controls */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconChange}
                      className="hidden"
                      id="icon-upload"
                    />
                    <label
                      htmlFor="icon-upload"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Subir icono
                    </label>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Imagen cuadrada. Se recomienda mínimo 128x128px.
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner del Canal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Banner del Canal
                </label>
                {bannerPreview || groupBannerUrl ? (
                  <div className="relative mb-2">
                    <div className="relative w-full h-32 rounded-xl overflow-hidden">
                      <Image
                        src={bannerPreview || groupBannerUrl || ''}
                        alt="Banner del canal"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeBanner}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                  id="banner-upload"
                />
                <label
                  htmlFor="banner-upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {groupBannerUrl ? 'Cambiar banner' : 'Subir banner'}
                </label>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Imagen wide. Se recomienda mínimo 600x200px.
                </p>
              </div>

              {/* Color fallback del Icono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color del Icono (fallback)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                    placeholder="#6366f1"
                    maxLength={7}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm w-32"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Color de respaldo cuando no hay icono personalizado.
                </p>
              </div>

              {/* Slug info (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug del Canal
                </label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <code className="text-sm text-gray-900 dark:text-white font-mono">
                    {slug}
                  </code>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  El slug del canal no se puede modificar
                </p>
              </div>

              {/* Post Creation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ¿Quién puede crear posts?
                </label>
                <select
                  value={groupPostCreationType}
                  onChange={(e) => setGroupPostCreationType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="anyone">Todos los miembros</option>
                  <option value="moderators_admins">Solo moderadores y admins</option>
                  <option value="admins_only">Solo admins</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Configura quién puede publicar en este canal. Los admins siempre pueden crear posts.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleUpdateGroupSettings}
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Tag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Tags del Canal
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
                      disabled={deletingTag === tag.id}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar tag"
                    >
                      {deletingTag === tag.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Nota:</strong> Los tags que crees aquí estarán disponibles para que los miembros los usen al crear posts en este grupo. Puedes crear hasta 10 tags personalizados.
              </p>
            </div>
          </div>
        )}

        {/* Moderators Tab - Only visible to group creator */}
        {activeTab === 'moderators' && isCreator && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Gestión de Moderadores
              </h2>
            </div>

            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>Roles:</strong>
              </p>
              <ul className="text-sm text-purple-700 dark:text-purple-300 mt-2 space-y-1 ml-4">
                <li><strong>Miembro:</strong> Puede ver y crear posts en el canal</li>
                <li><strong>Moderador:</strong> Puede gestionar tags y contenido del canal</li>
                <li><strong>Admin:</strong> Tiene todos los permisos excepto cambiar roles (solo el creador puede hacerlo)</li>
              </ul>
            </div>

            {/* Search and Stats Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o usuario..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
              </div>
            </div>

            {/* Members List with Role Management */}
            <div className="space-y-2">
              {(() => {
                // Filter members based on search query
                const filteredMembers = members.filter(member => {
                  const searchLower = searchQuery.toLowerCase()
                  const username = member.users.username.toLowerCase()
                  const name = (member.users.name || '').toLowerCase()
                  return username.includes(searchLower) || name.includes(searchLower)
                })

                // Calculate pagination
                const totalPages = Math.ceil(filteredMembers.length / membersPerPage)
                const startIndex = (currentPage - 1) * membersPerPage
                const endIndex = startIndex + membersPerPage
                const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

                if (filteredMembers.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {searchQuery ? (
                        <>
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No se encontraron miembros</p>
                          <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
                        </>
                      ) : (
                        <>
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No hay miembros en el canal</p>
                        </>
                      )}
                    </div>
                  )
                }

                return (
                  <>
                    {paginatedMembers.map((member) => {
                      const isGroupCreator = member.user_id === group?.created_by
                      
                      // Get role badge color
                      const getRoleBadge = (role: string) => {
                        switch (role) {
                          case 'admin':
                            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          case 'moderator':
                            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          default:
                            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }
                      }

                      // Avatar component with fallback
                      const AvatarDisplay = () => {
                        const [imageError, setImageError] = useState(false)
                        const hasAvatar = member.users.avatar_url && !imageError

                        if (hasAvatar) {
                          return (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={member.users.avatar_url!}
                              alt={member.users.username}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={() => setImageError(true)}
                            />
                          )
                        }

                        return (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                            {member.users.username[0].toUpperCase()}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <Link href={getPublicProfileHref(member.users.username, member.user_id)}>
                              <AvatarDisplay />
                            </Link>
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={getPublicProfileHref(member.users.username, member.user_id)}
                                className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                <span>{member.users.name || member.users.username}</span>
                                {changingRole === member.id && <LoadingSpinner size="sm" />}
                              </Link>
                              {isGroupCreator && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 flex-shrink-0">
                                  Creador
                                </span>
                              )}
                              {!isGroupCreator && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getRoleBadge(member.role)}`}>
                                  {member.role === 'admin' ? 'Admin' : member.role === 'moderator' ? 'Moderador' : 'Miembro'}
                                </span>
                              )}
                            </div>
                            <Link
                              href={getPublicProfileHref(member.users.username, member.user_id)}
                              className="text-xs text-gray-500 dark:text-gray-400 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              @{member.users.username}
                            </Link>
                          </div>

                          {/* Role Selector - Only for non-creators */}
                          {!isGroupCreator && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value as 'member' | 'moderator' | 'admin')}
                                disabled={saving}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                              >
                                <option value="member">Miembro</option>
                                <option value="moderator">Moderador</option>
                                <option value="admin">Admin</option>
                              </select>

                              <button
                                onClick={() => handleRemoveMember(member.id, member.user_id)}
                                disabled={removingMember === member.id}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Remover del canal"
                              >
                                {removingMember === member.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} de {filteredMembers.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                            Página {currentPage} de {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
