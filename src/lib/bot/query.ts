const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const readRateLimitMap = new Map<string, { count: number; resetTime: number }>()

export const BOT_MAX_PER_PAGE = 10

export interface BotPaginationInput {
  page: number
  perPage: number
  from: number
  to: number
}

export interface BotPaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
  hasNext: boolean
}

export function parseBooleanQueryParam(
  value: string | null,
  defaultValue: boolean
): { value: boolean; error?: string } {
  if (value === null || value.trim() === '') return { value: defaultValue }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return { value: true }
  if (normalized === 'false' || normalized === '0') return { value: false }

  return { value: defaultValue, error: 'Parámetro booleano inválido. Usa true o false.' }
}

export function parseUuidQueryParam(value: string | null): { value: string | null; error?: string } {
  if (!value || !value.trim()) return { value: null }
  const trimmed = value.trim()

  if (!UUID_REGEX.test(trimmed)) {
    return { value: null, error: 'UUID inválido en query params' }
  }

  return { value: trimmed }
}

export function parseBotPagination(searchParams: URLSearchParams): {
  pagination?: BotPaginationInput
  error?: string
} {
  const pageRaw = searchParams.get('page')
  const perPageRaw = searchParams.get('perPage')

  let page = 1
  if (pageRaw && pageRaw.trim() !== '') {
    page = Number.parseInt(pageRaw, 10)
    if (!Number.isInteger(page) || page < 1) {
      return { error: 'page debe ser un entero mayor o igual a 1' }
    }
  }

  let perPage = BOT_MAX_PER_PAGE
  if (perPageRaw && perPageRaw.trim() !== '') {
    perPage = Number.parseInt(perPageRaw, 10)
    if (!Number.isInteger(perPage) || perPage < 1) {
      return { error: 'perPage debe ser un entero mayor o igual a 1' }
    }
  }

  perPage = Math.min(perPage, BOT_MAX_PER_PAGE)

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  return {
    pagination: {
      page,
      perPage,
      from,
      to,
    },
  }
}

export function buildPaginationMeta(page: number, perPage: number, total: number): BotPaginationMeta {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / perPage)

  return {
    page,
    perPage,
    total: safeTotal,
    totalPages,
    hasNext: page * perPage < safeTotal,
  }
}

export function checkBotReadRateLimit(
  apiKeyId: string,
  action: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `${apiKeyId}:${action}`
  const now = Date.now()
  const record = readRateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    readRateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  record.count += 1
  return { allowed: true }
}
