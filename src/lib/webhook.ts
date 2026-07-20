import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.CHAT_BRIDGE_WEBHOOK_SECRET || ''

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!SECRET) {
    // In dev mode without secret configured, allow all
    return process.env.NODE_ENV !== 'production'
  }
  if (!signature) return false

  const expected = createHmac('sha256', SECRET).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature, 'utf8')
  const expBuf = Buffer.from(expected, 'utf8')
  if (sigBuf.length !== expBuf.length) return false
  try {
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

export function signWebhookBody(rawBody: string): string {
  return createHmac('sha256', SECRET).update(rawBody).digest('hex')
}
