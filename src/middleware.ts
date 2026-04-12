import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_MAX = 100
const RATE_LIMIT_WINDOW = 60000

const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')

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

function getLocaleFromRequest(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'ja')) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, priority] = lang.trim().split(';q=');
        return {
          locale: locale.split('-')[0].toLowerCase(),
          priority: priority ? parseFloat(priority) : 1
        };
      })
      .sort((a, b) => b.priority - a.priority);

    for (const { locale } of preferredLocales) {
      if (routing.locales.includes(locale as 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'ja')) {
        return locale;
      }
    }
  }

  return routing.defaultLocale;
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  const locale = getLocaleFromRequest(request);
  
  const response = NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );

  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
