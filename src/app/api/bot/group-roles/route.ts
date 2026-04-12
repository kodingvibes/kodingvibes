import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidBotApiKey, touchBotApiKeyUsage } from '@/lib/bot/auth'

interface Body {
  apiKey?: string
  groupId?: string
  role?: 'member' | 'moderator'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const apiKey = (searchParams.get('apiKey') || '').trim()

  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey es requerido' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_api_key_group_roles')
    .select('id, group_id, role, created_at, updated_at')
    .eq('api_key_id', key.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los roles del bot' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ roles: data ?? [] })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body
  const apiKey = (body.apiKey || '').trim()
  const groupId = (body.groupId || '').trim()
  const role = body.role === 'moderator' ? 'moderator' : 'member'

  if (!apiKey || !groupId) {
    return NextResponse.json({ error: 'apiKey y groupId son requeridos' }, { status: 400 })
  }

  const key = await getValidBotApiKey(apiKey)
  if (!key) {
    return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, created_by, is_active')
    .eq('id', groupId)
    .single()

  if (groupError || !group || !group.is_active) {
    return NextResponse.json({ error: 'Grupo inválido' }, { status: 404 })
  }

  if (group.created_by !== key.user_id) {
    return NextResponse.json(
      { error: 'Solo el dueño del grupo puede asignar rol al bot' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('user_api_key_group_roles')
    .upsert(
      {
        api_key_id: key.id,
        group_id: groupId,
        role,
        assigned_by: key.user_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'api_key_id,group_id' }
    )
    .select('id, group_id, role, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo asignar el rol del bot' }, { status: 500 })
  }

  await touchBotApiKeyUsage(key.id)
  return NextResponse.json({ role: data })
}
