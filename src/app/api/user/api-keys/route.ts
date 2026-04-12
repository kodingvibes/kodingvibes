import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const fallbackName =
      typeof userMetadata.name === 'string' && userMetadata.name.trim().length > 0
        ? userMetadata.name.trim()
        : (user.email?.split('@')[0] ?? 'Usuario')
    const avatarUrl =
      typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim().length > 0
        ? userMetadata.avatar_url.trim()
        : null

    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileFetchError) {
      return NextResponse.json({ error: 'No se pudo validar tu perfil de usuario' }, { status: 500 })
    }

    if (!existingProfile) {
      let ensureProfileError: { code?: string; message?: string } | null = null

      try {
        const adminSupabase = createAdminClient()
        const { error } = await adminSupabase.from('users').insert({
          id: user.id,
          email: user.email ?? '',
          name: fallbackName,
          avatar_url: avatarUrl,
        })
        ensureProfileError = error
      } catch {
        const { error } = await supabase.from('users').insert({
          id: user.id,
          email: user.email ?? '',
          name: fallbackName,
          avatar_url: avatarUrl,
        })
        ensureProfileError = error
      }

      if (ensureProfileError) {
        return NextResponse.json(
          {
            error: 'No se pudo preparar tu perfil para crear la API key',
            code: ensureProfileError.code ?? null,
          },
          { status: 500 }
        )
      }
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
        { error: 'Solo puedes tener 1 API key. Revoca y elimina la actual para crear otra.' },
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
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'No se encontro tu perfil de usuario. Vuelve a iniciar sesion e intenta nuevamente.' },
          { status: 400 }
        )
      }

      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'No tienes permisos para crear la API key. Revisa las politicas RLS en user_api_keys.' },
          { status: 403 }
        )
      }

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

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const requestUrl = new URL(request.url)
    let id = requestUrl.searchParams.get('id')?.trim() || ''

    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = typeof body?.id === 'string' ? body.id.trim() : ''
    }

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data: existingKey, error: existingKeyError } = await supabase
      .from('user_api_keys')
      .select('id, is_active')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingKeyError) {
      return NextResponse.json({ error: 'No se pudo validar la API key' }, { status: 500 })
    }

    if (!existingKey) {
      return NextResponse.json({ error: 'API key no encontrada' }, { status: 404 })
    }

    if (existingKey.is_active) {
      return NextResponse.json(
        { error: 'Debes revocar la API key antes de eliminarla' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar la API key' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true, id })
  } catch (error) {
    console.error('Error deleting api key:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
