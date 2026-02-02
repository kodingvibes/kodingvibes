import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  console.log('Auth callback received:', { code: code ? 'present' : 'missing', origin, next })

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }
      
      console.log('Session exchanged successfully, redirecting to:', next)
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected`)
    }
  }

  console.error('No code provided in callback')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no-code`)
}
