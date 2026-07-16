'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { User, Save, ArrowLeft, AtSign, AlertCircle, Users, Settings, KeyRound, Copy, Bot, Power, Check, Trash2, Upload, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { LoadingSpinner } from '@/components/ui/Loading'
import { validateFile } from '@/lib/security/validation'
import { compressImage } from '@/lib/utils'
import { getPublicProfileHref } from '@/lib/profile'

export const dynamic = 'force-dynamic'

interface Profile {
  id: string
  email: string
  name: string | null
  username: string | null
  avatar_url: string | null
  banner_url: string | null
}

type ProfileUpsert = {
  id: string
  email: string
  name: string | null
  username: string | null
  avatar_url: string | null
  banner_url: string | null
}

interface Group {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  member_count: number
  post_count: number
  created_at: string
}

interface UserApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface BotGroupRole {
  id: string
  group_id: string
  role: 'member' | 'moderator'
}

interface BotEndpointDoc {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  description: string
  requestExample: string
  responseExample: string
}

const BOT_ENDPOINT_DOCS: BotEndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/bot/posts',
    description: 'Lista posts con filtros y paginación obligatoria (max 10 por página).',
    requestExample: `Query params opcionales:
- page=1
- perPage=10 (maximo 10)
- mine=true|false
- groupId=uuid-grupo
- status=draft|published`,
    responseExample: `{
  "posts": [
    {
      "id": "uuid-post",
      "title": "Post desde mi bot",
      "is_bot_post": true,
      "bot_name": "Mi Bot",
      "status": "published"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/bot/posts',
    description: 'Crea un post marcado como bot del usuario.',
    requestExample: `{
  "title": "Post desde mi bot",
  "content": "Hola comunidad",
  "groupId": "uuid-del-grupo",
  "tags": ["bot", "ia"],
  "status": "published"
}`,
    responseExample: `{
  "post": {
    "id": "uuid-post",
    "title": "Post desde mi bot",
    "is_bot_post": true,
    "bot_name": "Mi Bot",
    "status": "published"
  }
}`,
  },
  {
    method: 'PATCH',
    path: '/api/bot/posts/{id}',
    description: 'Edita un post propio o moderable por el bot.',
    requestExample: `{
  "title": "Titulo actualizado",
  "content": "Contenido actualizado",
  "status": "published"
}`,
    responseExample: `{
  "post": {
    "id": "uuid-post",
    "title": "Titulo actualizado",
    "updated_at": "2026-04-12T02:10:00.000Z"
  }
}`,
  },
  {
    method: 'DELETE',
    path: '/api/bot/posts/{id}',
    description: 'Soft delete de post (is_deleted=true).',
    requestExample: `Sin body.`,
    responseExample: `{
  "deleted": true,
  "id": "uuid-post"
}`,
  },
  {
    method: 'GET',
    path: '/api/bot/comments',
    description: 'Lista comentarios con filtros y paginación obligatoria (max 10 por página).',
    requestExample: `Query params opcionales:
- page=1
- perPage=10 (maximo 10)
- mine=true|false
- postId=uuid-post
- parentId=uuid-comment`,
    responseExample: `{
  "comments": [
    {
      "id": "uuid-comment",
      "post_id": "uuid-post",
      "content": "Comentario desde bot"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 18,
    "totalPages": 2,
    "hasNext": true
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/bot/comments',
    description: 'Crea comentario en un post permitido para el bot.',
    requestExample: `{
  "postId": "uuid-post",
  "content": "Comentario desde bot",
  "parentId": null
}`,
    responseExample: `{
  "comment": {
    "id": "uuid-comment",
    "post_id": "uuid-post",
    "content": "Comentario desde bot"
  }
}`,
  },
  {
    method: 'PATCH',
    path: '/api/bot/comments/{id}',
    description: 'Edita comentario propio o moderable por el bot.',
    requestExample: `{
  "content": "Comentario editado"
}`,
    responseExample: `{
  "comment": {
    "id": "uuid-comment",
    "content": "Comentario editado"
  }
}`,
  },
  {
    method: 'DELETE',
    path: '/api/bot/comments/{id}',
    description: 'Soft delete de comentario (is_deleted=true).',
    requestExample: `Sin body.`,
    responseExample: `{
  "deleted": true,
  "id": "uuid-comment"
}`,
  },
  {
    method: 'GET',
    path: '/api/bot/votes',
    description: 'Lista votos con filtros y paginación obligatoria (max 10 por página).',
    requestExample: `Query params opcionales:
- page=1
- perPage=10 (maximo 10)
- mine=true|false
- postId=uuid-post
- value=1|-1`,
    responseExample: `{
  "votes": [
    {
      "id": "uuid-vote",
      "post_id": "uuid-post",
      "value": 1
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 12,
    "totalPages": 2,
    "hasNext": true
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/bot/votes',
    description: 'Crea o actualiza voto de post (1 o -1).',
    requestExample: `{
  "postId": "uuid-post",
  "value": 1
}`,
    responseExample: `{
  "vote": {
    "post_id": "uuid-post",
    "user_id": "uuid-user",
    "value": 1
  }
}`,
  },
  {
    method: 'DELETE',
    path: '/api/bot/votes',
    description: 'Elimina voto del bot en un post.',
    requestExample: `{
  "postId": "uuid-post"
}`,
    responseExample: `{
  "deleted": true
}`,
  },
  {
    method: 'GET',
    path: '/api/bot/group-roles',
    description: 'Lista roles del bot por grupo con paginación obligatoria (max 10 por página).',
    requestExample: `Query params opcionales:
- page=1
- perPage=10 (maximo 10)`,
    responseExample: `{
  "roles": [
    {
      "id": "uuid-role",
      "group_id": "uuid-grupo",
      "role": "moderator"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 3,
    "totalPages": 1,
    "hasNext": false
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/bot/group-roles',
    description: 'Asigna rol del bot en un grupo (si el usuario es dueno).',
    requestExample: `{
  "groupId": "uuid-grupo",
  "role": "moderator"
}`,
    responseExample: `{
  "role": {
    "group_id": "uuid-grupo",
    "role": "moderator"
  }
}`,
  },
]

export default function ProfilePage() {
  const [, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null)
  const [removeBanner, setRemoveBanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([])
  const [botName, setBotName] = useState('')
  const [creatingApiKey, setCreatingApiKey] = useState(false)
  const [updatingApiKeyId, setUpdatingApiKeyId] = useState<string | null>(null)
  const [apiKeyPendingDelete, setApiKeyPendingDelete] = useState<UserApiKey | null>(null)
  const [newApiKeyPlain, setNewApiKeyPlain] = useState<string | null>(null)
  const [apiKeysError, setApiKeysError] = useState<string | null>(null)
  const [botGroupRoles, setBotGroupRoles] = useState<BotGroupRole[]>([])
  const [assigningGroupRole, setAssigningGroupRole] = useState<string | null>(null)
  const [docsCopied, setDocsCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'bots'>('profile')
  const router = useRouter()
  const supabase = createClient()
  const publicProfileHref = getPublicProfileHref(username || null, userId)

  const generateUsername = useCallback((email: string): string => {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const random = Math.floor(Math.random() * 10000)
    return `${base}${random}`.substring(0, 20)
  }, [])

  const createProfile = useCallback(async (id: string, email: string, initialAvatarUrl: string | null) => {
    const newUsername = generateUsername(email)
    const newName = email.split('@')[0]

    const { data, error: insertError } = await supabase
      .from('users')
      .insert<ProfileUpsert>({
        id,
        email,
        name: newName,
        username: newUsername,
        avatar_url: initialAvatarUrl,
        banner_url: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating profile:', insertError)
      setError('No se pudo crear el perfil automáticamente')
    } else if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setName(data.name || '')
      setAvatarUrl(data.avatar_url || null)
      setAvatarPreview(data.avatar_url || null)
      setNewAvatarFile(null)
      setRemoveAvatar(false)
      setBannerUrl(data.banner_url || null)
      setBannerPreview(data.banner_url || null)
      setNewBannerFile(null)
      setRemoveBanner(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }, [supabase, generateUsername])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return null

    const fileExt = file.name.split('.').pop() || 'webp'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`
    const filePath = `avatars/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, { contentType: file.type || 'image/webp', upsert: true })

    if (uploadError) {
      setError('No se pudo subir la imagen de avatar')
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('images').getPublicUrl(filePath)

    return publicUrl
  }, [supabase, userId])

  const uploadBanner = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return null

    const fileExt = file.name.split('.').pop() || 'webp'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`
    const filePath = `banners/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, { contentType: file.type || 'image/webp', upsert: true })

    if (uploadError) {
      setError('No se pudo subir la imagen de banner')
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('images').getPublicUrl(filePath)

    return publicUrl
  }, [supabase, userId])

  const loadApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'GET',
      })

      const result = await response.json()

      if (!response.ok) {
        setApiKeysError(result?.error || 'No se pudieron cargar tus API keys')
        return
      }

      setApiKeys(result?.keys || [])
      setApiKeysError(null)
    } catch (error) {
      console.error('Error loading api keys:', error)
      setApiKeysError('No se pudieron cargar tus API keys')
    }
  }, [])

  const loadBotGroupRoles = useCallback(async (apiKeyId: string) => {
    try {
      const query = new URLSearchParams({ apiKeyId }).toString()
      const response = await fetch(`/api/user/api-keys/group-roles?${query}`)
      const result = await response.json()

      if (!response.ok) return
      setBotGroupRoles(result?.roles || [])
    } catch (error) {
      console.error('Error loading bot group roles:', error)
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || '')
        const metadataAvatar =
          typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim().length > 0
            ? user.user_metadata.avatar_url.trim()
            : null

        // Intentar cargar el perfil
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.error('Error loading profile:', fetchError)
          setError('Error al cargar el perfil')
        } else if (data) {
          // Perfil existe
          setProfile(data)
          setUsername(data.username || '')
          setName(data.name || '')
          const effectiveAvatar = data.avatar_url || metadataAvatar
          setAvatarUrl(effectiveAvatar)
          setAvatarPreview(effectiveAvatar)
          setNewAvatarFile(null)
          setRemoveAvatar(false)
          setBannerUrl(data.banner_url || null)
          setBannerPreview(data.banner_url || null)
          setNewBannerFile(null)
          setRemoveBanner(false)
        } else {
          // Perfil no existe, crearlo automáticamente
          await createProfile(user.id, user.email || '', metadataAvatar)
        }

        // Cargar grupos creados por el usuario
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('created_by', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (groupsError) {
          console.error('Error loading groups:', groupsError)
        } else if (groupsData) {
          setMyGroups(groupsData)
        }

        await loadApiKeys()
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Error inesperado al cargar el perfil')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase, createProfile, loadApiKeys])

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiKeysError(null)
    setNewApiKeyPlain(null)

    const trimmedBotName = botName.trim()
    if (trimmedBotName.length < 3 || trimmedBotName.length > 80) {
      setApiKeysError('El nombre del bot debe tener entre 3 y 80 caracteres')
      return
    }

    if (apiKeys.length > 0) {
      setApiKeysError('Solo puedes tener 1 API key. Revoca y elimina la actual para crear otra.')
      return
    }

    setCreatingApiKey(true)
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botName: trimmedBotName }),
      })

      const result = await response.json()

      if (!response.ok) {
        setApiKeysError(result?.error || 'No se pudo crear la API key')
        return
      }

      const createdPlain = result?.key?.plain || null
      setNewApiKeyPlain(createdPlain)
      setBotName('')
      await loadApiKeys()
      if (result?.key?.id) {
        await loadBotGroupRoles(result.key.id)
      }
    } catch (error) {
      console.error('Error creating api key:', error)
      setApiKeysError('No se pudo crear la API key')
    } finally {
      setCreatingApiKey(false)
    }
  }

  const handleToggleApiKey = async (id: string, nextState: boolean) => {
    setApiKeysError(null)
    setUpdatingApiKeyId(id)
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, is_active: nextState }),
      })

      const result = await response.json()

      if (!response.ok) {
        setApiKeysError(result?.error || 'No se pudo actualizar la API key')
        return
      }

      setApiKeys((prev) => prev.map((key) => (key.id === id ? result.key : key)))
    } catch (error) {
      console.error('Error updating api key:', error)
      setApiKeysError('No se pudo actualizar la API key')
    } finally {
      setUpdatingApiKeyId(null)
    }
  }

  const handleRequestDeleteApiKey = (key: UserApiKey) => {
    setApiKeysError(null)
    setApiKeyPendingDelete(key)
  }

  const handleDeleteApiKey = async (id: string) => {
    setApiKeysError(null)
    setUpdatingApiKeyId(id)

    try {
      const response = await fetch(`/api/user/api-keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        setApiKeysError(result?.error || 'No se pudo eliminar la API key')
        return
      }

      setApiKeys((prev) => prev.filter((key) => key.id !== id))
      setBotGroupRoles([])
      setNewApiKeyPlain(null)
      setApiKeyPendingDelete(null)
    } catch (error) {
      console.error('Error deleting api key:', error)
      setApiKeysError('No se pudo eliminar la API key')
    } finally {
      setUpdatingApiKeyId(null)
    }
  }

  const copyApiKey = async () => {
    if (!newApiKeyPlain) return

    try {
      await navigator.clipboard.writeText(newApiKeyPlain)
    } catch (error) {
      console.error('Error copying api key:', error)
    }
  }

  const copyBotApiDocs = async () => {
    const translatedDescriptions: Record<string, string> = {
      'GET /api/bot/posts': 'Lists posts with optional filters and mandatory pagination (max 10 per page).',
      'POST /api/bot/posts': 'Creates a post marked as a bot post for the user.',
      'PATCH /api/bot/posts/{id}': 'Edits an owned post or a post the bot can moderate.',
      'DELETE /api/bot/posts/{id}': 'Soft deletes a post (is_deleted=true).',
      'GET /api/bot/comments': 'Lists comments with optional filters and mandatory pagination (max 10 per page).',
      'POST /api/bot/comments': 'Creates a comment on a post the bot is allowed to access.',
      'PATCH /api/bot/comments/{id}': 'Edits an owned comment or a comment the bot can moderate.',
      'DELETE /api/bot/comments/{id}': 'Soft deletes a comment (is_deleted=true).',
      'GET /api/bot/votes': 'Lists votes with optional filters and mandatory pagination (max 10 per page).',
      'POST /api/bot/votes': 'Creates or updates a post vote (1 or -1).',
      'DELETE /api/bot/votes': 'Deletes the bot vote on a post.',
      'GET /api/bot/group-roles': 'Lists bot roles per group with mandatory pagination (max 10 per page).',
      'POST /api/bot/group-roles': 'Assigns a bot role in a group (if the user is the owner).',
    }

    const toEnglishExample = (text: string): string => {
      return text
        .replaceAll('Sin body.', 'No body.')
        .replaceAll('Post desde mi bot', 'Post from my bot')
        .replaceAll('Hola comunidad', 'Hello community')
        .replaceAll('Titulo actualizado', 'Updated title')
        .replaceAll('Contenido actualizado', 'Updated content')
        .replaceAll('Comentario desde bot', 'Comment from bot')
        .replaceAll('Comentario editado', 'Edited comment')
        .replaceAll('Lista posts con filtros y paginación obligatoria (max 10 por página).', 'Lists posts with optional filters and mandatory pagination (max 10 per page).')
        .replaceAll('Lista comentarios con filtros y paginación obligatoria (max 10 por página).', 'Lists comments with optional filters and mandatory pagination (max 10 per page).')
        .replaceAll('Lista votos con filtros y paginación obligatoria (max 10 por página).', 'Lists votes with optional filters and mandatory pagination (max 10 per page).')
        .replaceAll('Lista roles del bot por grupo con paginación obligatoria (max 10 por página).', 'Lists bot roles per group with mandatory pagination (max 10 per page).')
        .replaceAll('maximo 10', 'maximum 10')
    }

    const docsText = [
      '# Bot API - KodingVibes',
      '',
      '## Context',
      '- This API lets users publish and moderate content through their bot.',
      '- All routes use the same base URL.',
      '',
      '## Base URL',
      '`https://www.kodingvibes.com`',
      '',
      '## Authentication',
      '- Send the API key in headers, using either `x-api-key: <API_KEY>` or `Authorization: Bearer <API_KEY>`.',
      '- Do not send `apiKey` in the JSON body.',
      '- Read endpoints are rate-limited and may return `429 Too Many Requests` with `Retry-After`.',
      '',
      '## Pagination Rules',
      '- All list endpoints are paginated.',
      '- Use `page` and `perPage` query params.',
      '- `perPage` maximum is 10 (values above 10 are clamped to 10).',
      '- Responses include `pagination: { page, perPage, total, totalPages, hasNext }`.',
      '',
      '### Header example',
      '```http',
      'x-api-key: kvb_xxxxx',
      'Authorization: Bearer kvb_xxxxx',
      '```',
      '',
      '## Endpoints',
      '',
      ...BOT_ENDPOINT_DOCS.flatMap((endpoint, index) => [
        `### ${index + 1}) ${endpoint.method} ${endpoint.path}`,
        '',
        `**Description**: ${translatedDescriptions[`${endpoint.method} ${endpoint.path}`] || endpoint.description}`,
        '',
        '**Request (example)**',
        '```json',
        toEnglishExample(endpoint.requestExample),
        '```',
        '',
        '**Response (example)**',
        '```json',
        toEnglishExample(endpoint.responseExample),
        '```',
        '',
      ]),
      '## Suggested prompt for another AI',
      '```text',
      'Use this documentation to generate a complete bot integration with robust error handling, retries, and input validation. Return production-ready JavaScript/TypeScript examples.',
      '```',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(docsText)
      setDocsCopied(true)
      setTimeout(() => setDocsCopied(false), 2500)
    } catch (error) {
      console.error('Error copying bot docs:', error)
    }
  }

  const handleAssignBotRole = async (groupId: string, role: 'member' | 'moderator') => {
    const apiKeyId = apiKeys[0]?.id
    if (!apiKeyId) {
      setApiKeysError('Necesitas generar una API key para configurar roles del bot')
      return
    }

    setAssigningGroupRole(groupId)
    setApiKeysError(null)
    try {
      const response = await fetch('/api/user/api-keys/group-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKeyId,
          groupId,
          role,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setApiKeysError(result?.error || 'No se pudo asignar rol del bot en el grupo')
        return
      }

      setBotGroupRoles((prev) => {
        const exists = prev.find((item) => item.group_id === groupId)
        if (exists) {
          return prev.map((item) => (item.group_id === groupId ? result.role : item))
        }
        return [result.role, ...prev]
      })
    } catch (error) {
      console.error('Error assigning bot role:', error)
      setApiKeysError('No se pudo asignar rol del bot en el grupo')
    } finally {
      setAssigningGroupRole(null)
    }
  }

  const getBotRoleForGroup = (groupId: string): 'member' | 'moderator' => {
    return botGroupRoles.find((item) => item.group_id === groupId)?.role || 'member'
  }

  useEffect(() => {
    const apiKeyId = apiKeys[0]?.id
    if (apiKeyId) {
      loadBotGroupRoles(apiKeyId)
    } else {
      setBotGroupRoles([])
    }
  }, [apiKeys, loadBotGroupRoles])

  useEffect(() => {
    if (!apiKeyPendingDelete) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (updatingApiKeyId === apiKeyPendingDelete.id) return
      setApiKeyPendingDelete(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [apiKeyPendingDelete, updatingApiKeyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    if (!userId) return

    // Validate username format
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('El username debe tener entre 3 y 20 caracteres, solo letras, números y guiones bajos')
      setSaving(false)
      return
    }

    // Check if username is already taken (only if username is being changed)
    if (username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId) // Exclude current user
        .maybeSingle()

      if (checkError) {
        console.error('Error checking username:', checkError)
        setError('Error al verificar disponibilidad del username')
        setSaving(false)
        return
      }

      if (existingUser) {
        setError(`El username "${username}" ya está en uso. Por favor elige otro.`)
        setSaving(false)
        return
      }
    }

    let finalAvatarUrl = removeAvatar ? null : avatarUrl
    let finalBannerUrl = removeBanner ? null : bannerUrl

    if (newAvatarFile) {
      const compressedAvatar = await compressImage(newAvatarFile, { maxSizeMB: 1, maxWidthOrHeight: 1024 })
      const uploadedAvatarUrl = await uploadAvatar(compressedAvatar)
      if (!uploadedAvatarUrl) {
        setSaving(false)
        return
      }
      finalAvatarUrl = uploadedAvatarUrl
    }

    if (newBannerFile) {
      const compressedBanner = await compressImage(newBannerFile, { maxSizeMB: 2, maxWidthOrHeight: 2200 })
      const uploadedBannerUrl = await uploadBanner(compressedBanner)
      if (!uploadedBannerUrl) {
        setSaving(false)
        return
      }
      finalBannerUrl = uploadedBannerUrl
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: username || null,
        name: name || null,
        avatar_url: finalAvatarUrl,
        banner_url: finalBannerUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('Este username ya está en uso')
      } else {
        setError('Error al guardar los cambios')
        console.error('Update error:', updateError)
      }
    } else {
      setAvatarUrl(finalAvatarUrl)
      setAvatarPreview(finalAvatarUrl)
      setNewAvatarFile(null)
      setRemoveAvatar(false)
      setBannerUrl(finalBannerUrl)
      setBannerPreview(finalBannerUrl)
      setNewBannerFile(null)
      setRemoveBanner(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    })

    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido')
      return
    }

    setError(null)
    setNewAvatarFile(file)
    setRemoveAvatar(false)

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setNewAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file, {
      maxSizeMB: 25,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    })

    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido')
      return
    }

    setError(null)
    setNewBannerFile(file)
    setRemoveBanner(false)

    const reader = new FileReader()
    reader.onloadend = () => {
      setBannerPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBanner = () => {
    setNewBannerFile(null)
    setBannerPreview(null)
    setRemoveBanner(true)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tu Perfil</h1>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <Link href={publicProfileHref} className="text-xs text-primary hover:underline">
              Ver perfil publico
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            Perfil actualizado correctamente
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Perfil
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bots')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${
                activeTab === 'bots'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Bots
            </button>
          </div>
        </div>

        {activeTab === 'profile' && (
          <>
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>

                    {(avatarPreview || avatarUrl || newAvatarFile) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos: PNG, JPG, GIF o WebP. Tamaño máximo: 10MB (se reduce a WebP).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Banner del perfil</label>
                <div className="space-y-3">
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border bg-muted">
                    {bannerPreview ? (
                      <Image
                        src={bannerPreview}
                        alt="Banner"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {bannerPreview || bannerUrl ? 'Cambiar banner' : 'Subir banner'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="hidden"
                      />
                    </label>

                    {(bannerPreview || bannerUrl || newBannerFile) && (
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos: PNG, JPG, GIF o WebP. Tamaño máximo: 25MB (se reduce a WebP).
                </p>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    <span>Pseudónimo (Username)</span>
                  </div>
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="tu_username"
                  className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Entre 3 y 20 caracteres. Solo letras, números y guiones bajos.
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Link
                  href="/"
                  className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saving || !userId}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">¿Cómo te verán otros usuarios?</p>
              <p>
                Tu pseudónimo (username) se mostrará en tus posts y comentarios.
                Si no tienes uno, se usará tu nombre o email.
              </p>
            </div>

            {myGroups.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-foreground" />
                  <h2 className="text-xl font-bold text-foreground">Mis Canales</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myGroups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                          style={{ backgroundColor: group.color || '#6366f1' }}
                        >
                          {group.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {group.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {group.description || 'Sin descripción'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <span>{group.member_count} miembros</span>
                            <span>{group.post_count} posts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                        <Link
                          href={`/channel/${group.slug}`}
                          className="flex-1 px-3 py-2 text-center text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Ver canal
                        </Link>
                        <Link
                          href={`/channel/${group.slug}/admin`}
                          className="flex-1 px-3 py-2 text-center text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          Administrar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'bots' && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">API Keys para Bots</h2>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Puedes generar 1 API key para publicar desde tu bot. El post queda marcado como bot y muestra el nombre del bot.
            </p>

            {apiKeysError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                {apiKeysError}
              </div>
            )}

            {newApiKeyPlain && (
              <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Guarda esta key ahora: solo se muestra una vez.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 break-all">{newApiKeyPlain}</code>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {apiKeys.length === 0 && (
              <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-2 mb-5">
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Nombre del bot (ej: Bot Discord)"
                  className="flex-1 p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  maxLength={80}
                />
                <button
                  type="submit"
                  disabled={creatingApiKey}
                  className="px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creatingApiKey ? 'Creando...' : 'Generar key'}
                </button>
              </form>
            )}

            {apiKeys.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                Ya tienes una API key creada. Solo se permite una por usuario. Si esta revocada, puedes eliminarla y luego crear otra.
              </p>
            )}

            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no tienes API keys.</p>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="border border-border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{key.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prefijo: <code>{key.key_prefix}...</code>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Último uso: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Nunca'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          key.is_active
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {key.is_active ? 'Activa' : 'Revocada'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleApiKey(key.id, !key.is_active)}
                        disabled={updatingApiKeyId === key.id}
                        className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {key.is_active ? <Power className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        {key.is_active ? 'Revocar' : 'Reactivar'}
                      </button>

                      {!key.is_active && (
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteApiKey(key)}
                          disabled={updatingApiKeyId === key.id}
                          className="px-3 py-2 border border-red-300 text-red-700 dark:text-red-300 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              URL base para bots: <code>https://www.kodingvibes.com</code>
            </div>

            <div className="mt-4 border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground">Documentacion API Bot</h3>
                <button
                  type="button"
                  onClick={copyBotApiDocs}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
                >
                  {docsCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {docsCopied ? 'Copiado' : 'Copiar todo'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Estilo referencia: endpoint, ejemplo de request y ejemplo de respuesta.
              </p>
              <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                Autenticacion obligatoria en headers: <code className="mx-1">x-api-key: kvb_xxxxx</code>
                o <code className="mx-1">Authorization: Bearer kvb_xxxxx</code>. No enviar <code className="mx-1">apiKey</code> en el body.
              </div>

              <div className="space-y-3">
                {BOT_ENDPOINT_DOCS.map((endpoint) => (
                  <details key={`${endpoint.method}-${endpoint.path}`} className="border border-border rounded-lg group" open={false}>
                    <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center gap-2 flex-wrap hover:bg-muted/50 rounded-lg">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          endpoint.method === 'GET'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                            : endpoint.method === 'POST'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : endpoint.method === 'PATCH'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-red-500/15 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-xs break-all flex-1">{endpoint.path}</code>
                      <span className="text-xs text-muted-foreground group-open:hidden">Ver</span>
                      <span className="text-xs text-muted-foreground hidden group-open:inline">Ocultar</span>
                    </summary>

                    <div className="px-3 pb-3">
                      <p className="text-xs text-muted-foreground mb-3">{endpoint.description}</p>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Request ejemplo</p>
                          <pre className="text-xs bg-muted/60 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">
                            {endpoint.requestExample}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Response ejemplo</p>
                          <pre className="text-xs bg-muted/60 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">
                            {endpoint.responseExample}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {myGroups.length > 0 && (
              <div className="mt-5 border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Asignar rol del bot en tus canales
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Como dueño del canal, puedes dejar tu bot como moderador para que administre posts y comentarios del canal.
                </p>
                <div className="space-y-3">
                  {myGroups.map((group) => {
                    const selectedRole = getBotRoleForGroup(group.id)
                    return (
                      <div key={group.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">/{group.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedRole}
                            onChange={(e) => handleAssignBotRole(group.id, e.target.value as 'member' | 'moderator')}
                            disabled={apiKeys.length === 0 || assigningGroupRole === group.id}
                            className="px-3 py-2 text-sm bg-background border border-input rounded-lg"
                          >
                            <option value="member">Miembro</option>
                            <option value="moderator">Moderador</option>
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {apiKeyPendingDelete && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (updatingApiKeyId === apiKeyPendingDelete.id) return
                  setApiKeyPendingDelete(null)
                }}
              >
                <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Eliminar API key</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Esta acción elimina de forma permanente la API key revocada{' '}
                    <span className="font-medium text-foreground">{apiKeyPendingDelete.name}</span>. Luego podrás crear una nueva.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setApiKeyPendingDelete(null)}
                      disabled={updatingApiKeyId === apiKeyPendingDelete.id}
                      className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteApiKey(apiKeyPendingDelete.id)}
                      disabled={updatingApiKeyId === apiKeyPendingDelete.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {updatingApiKeyId === apiKeyPendingDelete.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
