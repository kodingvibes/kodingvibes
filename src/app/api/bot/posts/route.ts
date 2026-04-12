import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface BotPostBody {
  apiKey?: string
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

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const content = typeof body.content === 'string' ? body.content : undefined
    const groupId = typeof body.groupId === 'string' ? body.groupId : undefined
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 5) : undefined
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : undefined
    const status = body.status === 'draft' ? 'draft' : 'published'

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey es requerido' }, { status: 400 })
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
