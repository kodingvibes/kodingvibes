import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

function buildApiKey(): { plain: string; prefix: string } {
  const token = randomBytes(32).toString('hex')
  const plain = `kvb_${token}`
  return {
    plain,
    prefix: plain.slice(0, 14),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, name, key_prefix, is_active, created_at, last_used_at, revoked_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'No se pudieron cargar las API keys' }, { status: 500 })
    }

    return NextResponse.json({ keys: data ?? [] })
  } catch (error) {
    console.error('Error listing api keys:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const botNameRaw = typeof body?.botName === 'string' ? body.botName : body?.name
    const botName = typeof botNameRaw === 'string' ? botNameRaw.trim() : ''

    if (!botName || botName.length < 3 || botName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre del bot debe tener entre 3 y 80 caracteres' },
        { status: 400 }
      )
    }

    const { count, error: countError } = await supabase
      .from('user_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json({ error: 'No se pudo validar tu API key actual' }, { status: 500 })
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Solo puedes tener 1 API key. Revoca/reactiva la actual.' },
        { status: 409 }
      )
    }

    const { plain, prefix } = buildApiKey()
    const keyHash = hashApiKey(plain)

    const { data, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        name: botName,
        key_hash: keyHash,
        key_prefix: prefix,
        is_active: true,
      })
      .select('id, name, key_prefix, is_active, created_at, last_used_at, revoked_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo crear la API key' }, { status: 500 })
    }

    return NextResponse.json(
      {
        key: {
          ...data,
          plain,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating api key:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    const isActive = Boolean(body?.is_active)

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const updatePayload: {
      is_active: boolean
      revoked_at: string | null
      updated_at: string
    } = {
      is_active: isActive,
      revoked_at: isActive ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, name, key_prefix, is_active, created_at, last_used_at, revoked_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar la API key' }, { status: 500 })
    }

    return NextResponse.json({ key: data })
  } catch (error) {
    console.error('Error updating api key:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
