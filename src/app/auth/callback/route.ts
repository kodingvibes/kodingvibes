import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // Use environment variable for base URL, fallback to request origin for local dev
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                  new URL(request.url).origin
  
  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
      }
      
      return NextResponse.redirect(`${baseUrl}${next}`)
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=unexpected`)
    }
  }

  console.error('No code provided in callback')
  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=no-code`)
}
