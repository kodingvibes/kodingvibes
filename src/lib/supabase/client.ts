import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { createMockClient } from './mock'

const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')

export function createClient() {
  if (isMockMode) {
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient<Database>>
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
