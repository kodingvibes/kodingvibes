import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { createMockClient } from './mock'

const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')

export async function createClient() {
  if (isMockMode) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
    }
  )
}
