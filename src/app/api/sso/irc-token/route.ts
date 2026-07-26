import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kodingvibes.com'}?auth_required=1&next=${encodeURIComponent('/api/sso/irc-token')}`
    )
  }

  const secret = process.env.SSO_BRIDGE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SSO misconfigured' }, { status: 500 })
  }

  const meta = user.user_metadata as Record<string, string | undefined>

  // ponytail: late-auth-service reads `user_metadata.avatar_url`
  // (Supabase convention) out of the JWT payload to seed the
  // shell avatar on first login. We forward the metadata as a
  // nested object so future fields (full_name, etc.) travel too
  // without touching the bridge.
  const userMetadata: Record<string, string | undefined> = {}
  if (meta?.avatar_url) userMetadata.avatar_url = meta.avatar_url
  if (meta?.name) userMetadata.name = meta.name

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: meta?.name || user.email || '',
    user_metadata: userMetadata,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .setIssuer('kodingvibes.com')
    .setAudience('late.kodingvibes.com')
    .sign(new TextEncoder().encode(secret))

  return NextResponse.redirect(`https://late.kodingvibes.com/irc?token=${token}`)
}
