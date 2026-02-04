// OWASP Input Validation & Sanitization Utilities

import DOMPurify from 'isomorphic-dompurify'

// Validación de strings
export function validateString(input: string, options: {
  maxLength?: number
  minLength?: number
  allowHTML?: boolean
} = {}): { valid: boolean; error?: string; sanitized?: string } {
  const { maxLength = 1000, minLength = 1, allowHTML = false } = options
  
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' }
  }
  
  const trimmed = input.trim()
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `Input must be at least ${minLength} characters` }
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Input must not exceed ${maxLength} characters` }
  }
  
  // Sanitizar HTML si no está permitido
  const sanitized = allowHTML ? trimmed : DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] })
  
  return { valid: true, sanitized }
}

// Validación de URLs
export function validateURL(input: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!input) {
    return { valid: false, error: 'URL is required' }
  }
  
  try {
    const url = new URL(input)
    
    // Solo permitir protocolos seguros
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' }
    }
    
    // Bloquear URLs con credenciales
    if (url.username || url.password) {
      return { valid: false, error: 'URLs with credentials are not allowed' }
    }
    
    return { valid: true, sanitized: url.toString() }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

// Validación de IDs (UUID)
export function validateUUID(input: string): { valid: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(input)) {
    return { valid: false, error: 'Invalid UUID format' }
  }
  
  return { valid: true }
}

// Validación de archivos
export function validateFile(file: File, options: {
  maxSizeMB?: number
  allowedTypes?: string[]
} = {}): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } = options
  
  if (!file) {
    return { valid: false, error: 'File is required' }
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must not exceed ${maxSizeMB}MB` }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` }
  }
  
  return { valid: true }
}

// Sanitización de Markdown (prevenir XSS en markdown)
export function sanitizeMarkdown(input: string): string {
  // Remover tags HTML peligrosos
  const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
  const dangerousEvents = /on\w+\s*=/gi
  const javascriptProtocol = /javascript:/gi
  
  const sanitized = input
    .replace(dangerousTags, '')
    .replace(dangerousEvents, '')
    .replace(javascriptProtocol, '')
  
  return sanitized
}

// Validación de rate limiting por usuario
const userActionMap = new Map<string, { count: number; resetTime: number }>()

export function checkUserRateLimit(userId: string, action: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const key = `${userId}:${action}`
  const now = Date.now()
  const record = userActionMap.get(key)
  
  if (!record || now > record.resetTime) {
    userActionMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

// Validación de inputs de búsqueda
export function validateSearchInput(input: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Search query is required' }
  }
  
  const trimmed = input.trim()
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Search query must be at least 2 characters' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Search query must not exceed 100 characters' }
  }
  
  // Remover caracteres especiales de búsqueda peligrosos
  const sanitized = trimmed.replace(/[<>\"']/g, '')
  
  return { valid: true, sanitized }
}

// Validación de Email
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

// Protección contra SQL Injection (verificar patrones sospechosos)
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(')|(--)|(\;)|(\|\|)|(\*)/i,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|iframe)/i,
    /(or\s+\d+\s*=\s*\d+|and\s+\d+\s*=\s*\d+)/i,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

// Validación segura de entrada con detección de SQL injection
export function validateSecureInput(input: string, maxLength: number = 1000): { valid: boolean; error?: string; sanitized?: string } {
  const stringValidation = validateString(input, { maxLength, allowHTML: false })
  
  if (!stringValidation.valid) {
    return stringValidation
  }
  
  if (detectSQLInjection(input)) {
    return { valid: false, error: 'Input contains potentially malicious content' }
  }
  
  return stringValidation
}
