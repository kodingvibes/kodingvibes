import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') ||
                   !process.env.SUPABASE_SERVICE_ROLE_KEY

export function createAdminClient() {
  if (isMockMode) {
    throw new Error('Supabase admin client is not configured')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
