import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import { canBotActOnPost } from '@/lib/bot/group-permissions'

interface Body {
  postId?: string
  value?: -1 | 1
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = getBotApiKeyFromRequest(request)
  const postId = (body.postId || '').trim()
  const value = body.value

  if (!apiKey || !postId || (value !== 1 && value !== -1)) {
    return NextResponse.json({ error: 'API key in headers, postId and value(1|-1) are required' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnPost(key.id, key.user_id, postId)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para votar en este post' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('votes')
    .upsert(
      {
        post_id: postId,
        user_id: key.user_id,
        value,
      },
      { onConflict: 'user_id,post_id' }
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo registrar el voto' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ vote: data })
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = getBotApiKeyFromRequest(request)
  const postId = (body.postId || '').trim()

  if (!apiKey || !postId) {
    return NextResponse.json({ error: 'API key in headers and postId are required' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const allowed = await canBotActOnPost(key.id, key.user_id, postId)
  if (!allowed) {
    return NextResponse.json({ error: 'Sin permisos para quitar voto en este post' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', key.user_id)

  if (error) {
    return NextResponse.json({ error: 'No se pudo eliminar el voto' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ deleted: true })
}
