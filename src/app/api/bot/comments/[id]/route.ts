import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import { canBotActOnComment } from '@/lib/bot/group-permissions'

interface Body {
  content?: string
  isDeleted?: boolean
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = getBotApiKeyFromRequest(request)

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required in headers' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnComment(key.id, key.user_id, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para gestionar este comentario' }, { status: 403 })
  }

  const updatePayload: {
    content?: string
    is_deleted?: boolean
    deleted_at?: string | null
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.content === 'string') updatePayload.content = body.content.trim()
  if (typeof body.isDeleted === 'boolean') {
    updatePayload.is_deleted = body.isDeleted
    updatePayload.deleted_at = body.isDeleted ? new Date().toISOString() : null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('comments')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo actualizar el comentario' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ comment: data })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const apiKey = getBotApiKeyFromRequest(request)

  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required in headers' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnComment(key.id, key.user_id, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para eliminar este comentario' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('comments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el comentario' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ deleted: true, id: data.id })
}
