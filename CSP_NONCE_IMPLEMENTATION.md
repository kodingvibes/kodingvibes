# 🔒 Implementación de Nonces CSP - Mejora Futura

**Estado actual:** CSP usa `'unsafe-inline'` para scripts debido a que Next.js genera scripts inline dinámicamente.

**Objetivo:** Eliminar `'unsafe-inline'` implementando nonces para mejorar la seguridad CSP.

---

## 📋 ¿Por qué usar Nonces?

Los nonces (number used once) son tokens únicos que se generan por cada request y permiten que solo los scripts con ese nonce específico se ejecuten, bloqueando cualquier script inyectado por un atacante.

**Beneficios:**
- ✅ Elimina la necesidad de `'unsafe-inline'`
- ✅ Protección XSS más robusta
- ✅ Compatible con scripts dinámicos de Next.js
- ✅ No requiere mantenimiento de hashes

---

## 🛠️ Implementación Propuesta

### 1. Middleware para Generar Nonces

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

export function middleware(request: NextRequest) {
  // Generar nonce único para esta request
  const nonce = crypto.randomBytes(16).toString('base64')
  
  // Crear response con nonce en headers
  const response = NextResponse.next()
  
  // Añadir nonce a CSP
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' https://*.supabase.co https://*.googleusercontent.com data: blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim()
  
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)
  
  return response
}
```

### 2. Layout con Nonce

```typescript
// src/app/layout.tsx
import { headers } from 'next/headers'
import Script from 'next/script'

export default async function RootLayout({ children }) {
  const headersList = headers()
  const nonce = headersList.get('x-nonce') || ''
  
  return (
    <html lang="es">
      <head>
        {/* Scripts con nonce */}
        <Script
          id="sw-register"
          strategy="lazyOnload"
          src="/register-sw.js"
          nonce={nonce}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
```

### 3. Scripts Inline con Nonce

```typescript
// Para cualquier script inline necesario
<script nonce={nonce}>
  // Tu código aquí
</script>
```

---

## 🔄 Migración Paso a Paso

### Fase 1: Preparación
1. ✅ Eliminar `dangerouslySetInnerHTML` (COMPLETADO)
2. ✅ Mover scripts inline a archivos externos (COMPLETADO)
3. ⏳ Identificar todos los scripts inline restantes

### Fase 2: Implementación
1. Añadir generación de nonces en middleware
2. Pasar nonce a través de headers
3. Actualizar layout para usar nonce
4. Actualizar todos los componentes con scripts inline

### Fase 3: Testing
1. Probar en desarrollo
2. Verificar que todos los scripts funcionan
3. Validar CSP con herramientas online
4. Deploy a staging

### Fase 4: Producción
1. Deploy gradual con feature flag
2. Monitorear errores CSP
3. Ajustar según necesidad
4. Rollout completo

---

## 📚 Referencias

- [Next.js CSP Documentation](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [MDN: CSP Nonces](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#nonce-source)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)

---

## ⚠️ Consideraciones

1. **strict-dynamic**: Permite que scripts con nonce carguen otros scripts
2. **Compatibilidad**: Funciona en todos los navegadores modernos
3. **Performance**: Impacto mínimo en rendimiento
4. **Mantenimiento**: Requiere asegurar que todos los scripts usen nonce

---

## 🎯 Estado Actual vs Objetivo

### Actual (2026-02-04)
```csp
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
```

### Objetivo
```csp
script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic' https://vercel.live;
```

**Nota:** `'unsafe-eval'` puede ser necesario dependiendo de las dependencias.
Evaluar si se puede eliminar durante la migración.

---

**Próxima revisión:** Al actualizar a Next.js 16.x o cuando se requiera CSP más estricto.
