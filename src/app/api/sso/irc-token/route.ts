import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kodingvibes.com'}?auth=required`
    )
  }

  const secret = process.env.SSO_BRIDGE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SSO misconfigured' }, { status: 500 })
  }

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: (user.user_metadata as any)?.name || user.email,
    avatar: (user.user_metadata as any)?.avatar_url,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .setIssuer('kodingvibes.com')
    .setAudience('late.sh')
    .sign(new TextEncoder().encode(secret))

  return NextResponse.redirect(`https://late.kodingvibes.com/irc?token=${token}`)
}
