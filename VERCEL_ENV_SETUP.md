# Configuración de Variables de Entorno en Vercel

## 🔧 Pasos para configurar el dominio correcto

### 1. Configurar en Vercel Dashboard

1. Ve a tu proyecto en [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **kodingvibes**
3. Ve a la pestaña **Settings** → **Environment Variables**
4. Agrega la siguiente variable:

   **Nombre:** `NEXT_PUBLIC_SITE_URL`
   **Valor:** `https://www.kodingvibes.com`

5. Haz clic en **Save**

### 2. Redeploy del proyecto

Después de agregar la variable:
1. Ve a la pestaña **Deployments**
2. Haz clic en los tres puntos (...) del deploy más reciente
3. Selecciona **Redeploy** → **Use existing Build Cache: No**

### 3. Configuración en Supabase

Asegúrate de que en tu proyecto de Supabase:

1. Ve a **Authentication** → **URL Configuration**
2. En **Site URL**, coloca: `https://www.kodingvibes.com`
3. En **Redirect URLs**, agrega:
   - `https://www.kodingvibes.com/auth/callback`
   - `https://www.kodingvibes.com/**`

### 4. Verificación

Después de redeployar, intenta iniciar sesión nuevamente. El callback debería redirigir a tu dominio en lugar de localhost.

## 📝 Notas

- `NEXT_PUBLIC_SITE_URL` es la variable que el código ahora utiliza para determinar la URL base
- Si estás usando un dominio personalizado en Vercel, usa ese dominio
- Si estás usando el dominio de Vercel (ej: `tuproject.vercel.app`), usa ese
- La variable `VERCEL_URL` se usa automáticamente como fallback si no hay `NEXT_PUBLIC_SITE_URL`

## 🐛 Si sigue sin funcionar

Verifica los logs en Vercel:
1. Ve a la pestaña **Logs** en tu proyecto
2. Busca mensajes de "Auth callback received" para ver qué URL está detectando

Si ves `baseUrl: http://localhost:3000` en los logs, significa que la variable de entorno no está configurada correctamente.
