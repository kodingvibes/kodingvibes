import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface BotApiKeyRecord {
  id: string
  user_id: string
  name: string
  is_active: boolean
  revoked_at: string | null
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

export async function getValidBotApiKey(apiKey: string): Promise<BotApiKeyRecord | null> {
  if (!apiKey || !apiKey.trim()) return null

  const supabase = createAdminClient()
  const keyHash = hashApiKey(apiKey.trim())

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, name, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate bot API key: ${error.message}`)
  }

  if (!data) return null
  return data
}

export async function touchBotApiKeyUsage(apiKeyId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('user_api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', apiKeyId)
}

export function getBotApiKeyFromRequest(request: Request): string {
  const xApiKey = request.headers.get('x-api-key')?.trim()
  if (xApiKey) return xApiKey

  const authorization = request.headers.get('authorization')?.trim() || ''
  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }

  return ''
}
