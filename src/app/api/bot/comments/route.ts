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
    logger.error('Error validating bot api key', error)
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

  const parentIdParsed = parseUuidQueryParam(searchParams.get('parentId'))
  if (parentIdParsed.error) {
    return NextResponse.json({ error: parentIdParsed.error }, { status: 400 })
  }

  const readLimit = checkBotReadRateLimit(key.id, 'comments:get')
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

  const supabase = createAdminClient()
  let query = supabase
    .from('comments')
    .select('id, post_id, user_id, parent_id, content, vote_count, is_deleted, created_at, updated_at, deleted_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)

  if (mineParsed.value) {
    query = query.eq('user_id', key.user_id)
  }

  if (postIdParsed.value) {
    query = query.eq('post_id', postIdParsed.value)
  }

  if (parentIdParsed.value) {
    query = query.eq('parent_id', parentIdParsed.value)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los comentarios' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)

  return NextResponse.json({
    comments: data ?? [],
    pagination: buildPaginationMeta(page, perPage, count ?? 0),
  })
}
