import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Body {
  apiKeyId?: string
  groupId?: string
  role?: 'member' | 'moderator'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const apiKeyId = (searchParams.get('apiKeyId') || '').trim()

  if (!apiKeyId) {
    return NextResponse.json({ error: 'apiKeyId es requerido' }, { status: 400 })
  }

  const { data: key, error: keyError } = await supabase
    .from('user_api_keys')
    .select('id, user_id')
    .eq('id', apiKeyId)
    .eq('user_id', user.id)
    .single()

  if (keyError || !key) {
    return NextResponse.json({ error: 'API key no encontrada' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_api_key_group_roles')
    .select('id, group_id, role, created_at, updated_at')
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los roles del bot' }, { status: 500 })
  }

  return NextResponse.json({ roles: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Body
  const apiKeyId = (body.apiKeyId || '').trim()
  const groupId = (body.groupId || '').trim()
  const role = body.role === 'moderator' ? 'moderator' : 'member'

  if (!apiKeyId || !groupId) {
    return NextResponse.json({ error: 'apiKeyId y groupId son requeridos' }, { status: 400 })
  }

  const { data: key, error: keyError } = await supabase
    .from('user_api_keys')
    .select('id, user_id')
    .eq('id', apiKeyId)
    .eq('user_id', user.id)
    .single()

  if (keyError || !key) {
    return NextResponse.json({ error: 'API key no encontrada' }, { status: 404 })
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, created_by, is_active')
    .eq('id', groupId)
    .single()

  if (groupError || !group || !group.is_active) {
    return NextResponse.json({ error: 'Grupo inválido' }, { status: 404 })
  }

  if (group.created_by !== user.id) {
    return NextResponse.json(
      { error: 'Solo el dueño del grupo puede asignar rol al bot' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('user_api_key_group_roles')
    .upsert(
      {
        api_key_id: apiKeyId,
        group_id: groupId,
        role,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'api_key_id,group_id' }
    )
    .select('id, group_id, role, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'No se pudo asignar el rol del bot' }, { status: 500 })
  }

  return NextResponse.json({ role: data })
}
