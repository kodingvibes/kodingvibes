import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory rate limiting (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_MAX = 100 // requests
const RATE_LIMIT_WINDOW = 60000 // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  // Rate limiting
  const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Security headers adicionales
  response.headers.set('X-Request-ID', crypto.randomUUID())

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            // Preserve Supabase cookie options but ensure secure defaults
            // Note: @supabase/ssr already sets httpOnly, secure, and sameSite appropriately
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
