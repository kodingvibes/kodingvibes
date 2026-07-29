import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import { canBotActOnPost } from '@/lib/bot/group-permissions'
import { logger } from '@/lib/security/logger'
import {
  buildPaginationMeta,
  checkBotReadRateLimit,
  parseBooleanQueryParam,
  parseBotPagination,
  parseUuidQueryParam,
} from '@/lib/bot/query'

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

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)

  const parsedPagination = parseBotPagination(searchParams)
  if (!parsedPagination.pagination) {
    return NextResponse.json({ error: parsedPagination.error || 'Paginación inválida' }, { status: 400 })
  }

  const mineParsed = parseBooleanQueryParam(searchParams.get('mine'), false)
  if (mineParsed.error) {
    return NextResponse.json({ error: mineParsed.error }, { status: 400 })
  }

  const postIdParsed = parseUuidQueryParam(searchParams.get('postId'))
  if (postIdParsed.error) {
    return NextResponse.json({ error: postIdParsed.error }, { status: 400 })
  }

  const valueParamRaw = (searchParams.get('value') || '').trim()
  let valueFilter: -1 | 1 | null = null
  if (valueParamRaw) {
    if (valueParamRaw !== '1' && valueParamRaw !== '-1') {
      return NextResponse.json({ error: 'value inválido. Usa 1 o -1' }, { status: 400 })
    }
    valueFilter = valueParamRaw === '1' ? 1 : -1
  }

  const readLimit = checkBotReadRateLimit(key.id, 'votes:get')
  if (!readLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes de lectura para el bot' },
      {
        status: 429,
        headers: { 'Retry-After': String(readLimit.retryAfterSeconds || 60) },
      }
    )
  }

  const { page, perPage, from, to } = parsedPagination.pagination

  // El cliente admin salta RLS. La política de votes es `auth.uid() = user_id`:
  // el registro de votos es privado y solo los conteos agregados son públicos,
  // vía posts.vote_count. Por eso el filtro es incondicional y `mine` no aplica
  // aquí: se sigue validando para que un valor inválido dé 400 como en el resto
  // de endpoints, pero la respuesta siempre son los votos propios.
  const supabase = createAdminClient()
  let query = supabase
    .from('votes')
    .select('id, post_id, user_id, value, created_at', { count: 'exact' })
    .eq('user_id', key.user_id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)

  if (postIdParsed.value) {
    query = query.eq('post_id', postIdParsed.value)
  }

  if (valueFilter !== null) {
    query = query.eq('value', valueFilter)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los votos' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)

  return NextResponse.json({
    votes: data ?? [],
    pagination: buildPaginationMeta(page, perPage, count ?? 0),
  })
}
