import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import { canBotActOnPost, canBotModerateGroup } from '@/lib/bot/group-permissions'
import { logger } from '@/lib/security/logger'

interface Body {
  title?: string
  content?: string | null
  tags?: string[] | null
  imageUrl?: string | null
  status?: 'draft' | 'published'
  isDeleted?: boolean
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = getBotApiKeyFromRequest(request)

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required in headers' }, { status: 400 })
  }

  let key
  try {
    key = await getValidBotApiKey(apiKey)
  } catch (error) {
    logger.error('Error validating bot api key', error)
    return NextResponse.json({ error: 'No se pudo validar la API key' }, { status: 500 })
  }

  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: currentPost, error: currentPostError } = await supabase
    .from('posts')
    .select('id, user_id, group_id')
    .eq('id', id)
    .single()

  if (currentPostError || !currentPost) {
    return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  }

  const canManageCurrent = await canBotActOnPost(key.id, key.user_id, id)
  if (!canManageCurrent) {
    return NextResponse.json({ error: 'Sin permisos para gestionar este post' }, { status: 403 })
  }

  if (typeof body.status === 'string' && body.status === 'published' && currentPost.group_id) {
    const canModerate = await canBotModerateGroup(key.id, key.user_id, currentPost.group_id)
    const isOwnerPost = currentPost.user_id === key.user_id
    if (!isOwnerPost && !canModerate) {
      return NextResponse.json(
        { error: 'Solo el bot moderador del grupo puede publicar posts de terceros' },
        { status: 403 }
      )
    }
  }

  const updatePayload: {
    title?: string
    content?: string | null
    tags?: string[] | null
    image_url?: string | null
    status?: 'draft' | 'published'
    is_deleted?: boolean
    deleted_at?: string | null
    edited_at?: string
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
    edited_at: new Date().toISOString(),
  }

  if (typeof body.title === 'string') updatePayload.title = body.title.trim()
  if (typeof body.content === 'string' || body.content === null) updatePayload.content = body.content
  if (Array.isArray(body.tags)) updatePayload.tags = body.tags.slice(0, 5)
  if (typeof body.imageUrl === 'string' || body.imageUrl === null) updatePayload.image_url = body.imageUrl
  if (body.status === 'draft' || body.status === 'published') updatePayload.status = body.status
  if (typeof body.isDeleted === 'boolean') {
    updatePayload.is_deleted = body.isDeleted
    updatePayload.deleted_at = body.isDeleted ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el post' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ post: data })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const apiKey = getBotApiKeyFromRequest(request)

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required in headers' }, { status: 400 })
  }

  let key
  try {
    key = await getValidBotApiKey(apiKey)
  } catch (error) {
    logger.error('Error validating bot api key', error)
    return NextResponse.json({ error: 'No se pudo validar la API key' }, { status: 500 })
  }

  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnPost(key.id, key.user_id, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para eliminar este post' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el post' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ deleted: true, id: data.id })
}
