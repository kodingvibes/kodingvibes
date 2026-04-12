import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBotApiKeyFromRequest, getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'
import {
  buildPaginationMeta,
  checkBotReadRateLimit,
  parseBooleanQueryParam,
  parseBotPagination,
  parseUuidQueryParam,
} from '@/lib/bot/query'

interface BotPostBody {
  title?: string
  content?: string | null
  groupId?: string | null
  tags?: string[] | null
  imageUrl?: string | null
  status?: 'draft' | 'published'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as BotPostBody

    const apiKey = getBotApiKeyFromRequest(request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const content = typeof body.content === 'string' ? body.content : undefined
    const groupId = typeof body.groupId === 'string' ? body.groupId : undefined
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 5) : undefined
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : undefined
    const status = body.status === 'draft' ? 'draft' : 'published'

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required in headers' }, { status: 400 })
    }

    if (!title || title.length < 5 || title.length > 300) {
      return NextResponse.json({ error: 'title debe tener entre 5 y 300 caracteres' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('create_post_with_api_key', {
      p_api_key: apiKey,
      p_title: title,
      p_content: content,
      p_group_id: groupId,
      p_tags: tags,
      p_image_url: imageUrl,
      p_status: status,
    })

    if (error) {
      return NextResponse.json({ error: error.message || 'No se pudo crear el post' }, { status: 400 })
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating bot post:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
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
    console.error('Error validating bot api key:', error)
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

  const groupIdParsed = parseUuidQueryParam(searchParams.get('groupId'))
  if (groupIdParsed.error) {
    return NextResponse.json({ error: groupIdParsed.error }, { status: 400 })
  }

  const statusParam = (searchParams.get('status') || '').trim()
  if (statusParam && statusParam !== 'draft' && statusParam !== 'published') {
    return NextResponse.json({ error: 'status inválido. Usa draft o published' }, { status: 400 })
  }

  const readLimit = checkBotReadRateLimit(key.id, 'posts:get')
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
    .from('posts')
    .select(
      'id, user_id, group_id, title, content, tags, image_url, status, vote_count, is_deleted, created_at, updated_at, edited_at, is_bot_post, bot_name',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)

  if (mineParsed.value) {
    query = query.eq('user_id', key.user_id)
  }

  if (groupIdParsed.value) {
    query = query.eq('group_id', groupIdParsed.value)
  }

  if (statusParam) {
    query = query.eq('status', statusParam)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los posts' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)

  return NextResponse.json({
    posts: data ?? [],
    pagination: buildPaginationMeta(page, perPage, count ?? 0),
  })
}
