import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Minimal session probe for client components that only need to know *who* is
 * signed in (to decide whether to show owner/admin affordances). Reading it
 * here keeps the Supabase browser SDK out of the public bundle and, more
 * importantly, lets the surrounding page stay a Server Component instead of
 * being forced into a client-side rendering bailout by `useSearchParams()`.
 *
 * Lives under /api so the locale middleware passes it through untouched.
 * Returns `{ user: null }` for anonymous visitors — never an error, so callers
 * can treat any failure as "anonymous" without special cases.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ user: null })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        is_admin: Boolean(profile?.is_admin),
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
