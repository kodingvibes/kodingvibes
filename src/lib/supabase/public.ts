import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createMockClient } from './mock'
import { Database } from '@/types/database'

/**
 * Cookie-less Supabase client for *public* reads.
 *
 * `server.ts` reads cookies to resolve a session, and `cookies()` opts a route
 * out of any caching Next.js could do for it. For data that is identical for
 * every visitor that is pure cost.
 *
 * It is safe here because the rows the public loaders return are public by
 * policy: the `posts` SELECT policy is
 * `is_deleted = false OR auth.uid() = user_id OR is_admin`, and every query
 * built on this client additionally filters
 * `is_deleted = false AND status = 'published'` — so anonymous, signed-in and
 * admin visitors all receive the identical result set. Anything that differs
 * per user (memberships, drafts, owner/admin affordances) must keep using
 * `server.ts`.
 *
 * Falls back to the mock client so a misconfigured env still boots.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isMockMode = !url?.startsWith('http') || url === 'your_supabase_project_url'

export function createPublicClient(): SupabaseClient<Database> {
  if (isMockMode) {
    return createMockClient() as unknown as SupabaseClient<Database>
  }

  return createSupabaseClient<Database>(url!, anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
