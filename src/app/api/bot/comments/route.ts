import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import { canBotActOnPost } from '@/lib/bot/group-permissions'

interface Body {
  postId?: string
  content?: string
  parentId?: string | null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = getBotApiKeyFromRequest(request)
  const postId = (body.postId || '').trim()
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const parentId = typeof body.parentId === 'string' ? body.parentId : null

  if (!apiKey || !postId || !content) {
    return NextResponse.json({ error: 'API key in headers, postId and content are required' }, { status: 400 })
  }

  let key
  try {
    key = await getValidBotApiKey(apiKey)
  } catch (error) {
    console.error('Error validating bot api key:', error)
    return NextResponse.json({ error: 'No se pudo validar la API key' }, { status: 500 })
  }

  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnPost(key.id, key.user_id, postId)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para comentar en este post' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: key.user_id,
      content,
      parent_id: parentId,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el comentario' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ comment: data }, { status: 201 })
}
