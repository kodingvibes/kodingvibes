import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

function isLikelyJwt(value: string | undefined): boolean {
  if (!value) return false
  const token = value.trim()
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_project_url' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') ||
                   !process.env.SUPABASE_SERVICE_ROLE_KEY

export function createAdminClient() {
  if (isMockMode) {
    throw new Error('Supabase admin client is not configured')
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!isLikelyJwt(serviceRoleKey)) {
    throw new Error('Supabase admin client is misconfigured: SUPABASE_SERVICE_ROLE_KEY must be a JWT service role key')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )
}
