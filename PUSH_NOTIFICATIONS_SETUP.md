# Guía de Configuración de Notificaciones Push

## 1. Resumen de lo Implementado

Se ha implementado un sistema completo de notificaciones push para la aplicación con los siguientes componentes:

### Componentes Principales

- **Configuración VAPID** (`src/config/push-notifications.ts`)
  - Clave pública VAPID configurada para el cliente
  - Validación de la configuración

- **Librería del Cliente** (`src/lib/push-notifications.ts`)
  - `isPushNotificationSupported()` - Verifica soporte del navegador
  - `subscribeToPushNotifications()` - Suscribe al usuario
  - `savePushSubscription()` - Guarda suscripción en Supabase
  - `unsubscribeFromPushNotifications()` - Cancela suscripción
  - `checkPushSubscriptionStatus()` - Verifica estado de la suscripción
  - `initializePushNotifications()` - Inicializa automáticamente

- **Edge Function** (`supabase/functions/push-notification/index.ts`)
  - Envía notificaciones push a usuarios específicos
  - Soporte VAPID para autenticación con servidores push
  - Manejo de suscripciones expiradas

- **Migración SQL** (`supabase/migrations/20250202230000_add_push_subscriptions.sql`)
  - Tabla `push_subscriptions` para almacenar suscripciones
  - Políticas RLS para seguridad

## 2. Configuración en Supabase

### 2.1 Variables de Entorno

Ve al Dashboard de Supabase → Tu proyecto → Settings → Edge Functions y agrega estas variables:

```
VAPID_PUBLIC_KEY=BDZ34ZBsjmXXHeepfII91XOvh99mt2dwjlJup73EvRX74jA2A2XrBadmp5eea1fUh1u5YwckXtmWZBK1meZ-WxA
VAPID_PRIVATE_KEY=TU_CLAVE_PRIVADA_AQUI
VAPID_SUBJECT=mailto:admin@kodingvibes.com
```

**Nota importante**: La clave privada VAPID ya debe estar configurada. Si no la tienes, necesitas:
1. Ir a un generador de VAPID keys (como https://vapidkeys.com/)
2. Copiar la clave privada
3. Pegarla en las variables de entorno de Supabase

### 2.2 Políticas de CORS

Las Edge Functions ya tienen CORS configurado en el código, pero verifica que tu dominio esté permitido en Supabase Dashboard → Auth → URL Configuration.

## 3. Configuración de VAPID Keys

### Clave Pública (Ya configurada)

Ubicación: `src/config/push-notifications.ts`

```typescript
export const VAPID_PUBLIC_KEY = 'BDZ34ZBsjmXXHeepfII91XOvh99mt2dwjlJup73EvRX74jA2A2XrBadmp5eea1fUh1u5YwckXtmWZBK1meZ-WxA';
```

Esta clave es pública y segura de exponer en el código cliente.

### Clave Privada (Configurar en Supabase)

1. Ve a Supabase Dashboard → Edge Functions → Environment Variables
2. Agrega `VAPID_PRIVATE_KEY` con tu clave privada
3. Nunca compartas ni guardes esta clave en el código

### Subject

El subject identifica al remitente de las notificaciones. Puede ser:
- `mailto:tu-email@ejemplo.com`
- `https://tudominio.com`

## 4. Migraciones SQL

### Ejecutar la Migración

```bash
# Usando CLI de Supabase
supabase db push

# O manualmente desde el Dashboard SQL Editor
```

### Contenido de la Migración

```sql
-- Crear tabla para suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_is_active ON push_subscriptions(is_active);

-- Políticas de seguridad
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuarios solo pueden ver sus propias suscripciones
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios solo pueden insertar sus propias suscripciones
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios solo pueden actualizar sus propias suscripciones
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 5. Despliegue de Edge Functions

### Usando CLI de Supabase

```bash
# Verificar que tienes la CLI instalada
supabase --version

# Desplegar la función específica
supabase functions deploy push-notification

# Desplegar todas las funciones
supabase functions deploy
```

### Verificar el Despliegue

```bash
# Listar funciones desplegadas
supabase functions list
```

### URL de la Edge Function

Después del despliegue, la URL será:
```
https://[PROJECT-REF].supabase.co/functions/v1/push-notification
```

## 6. Pruebas

### 6.1 Test Manual en el Navegador

Abre la consola del navegador en tu app y ejecuta:

```javascript
import { 
  isPushNotificationSupported,
  checkPushSubscriptionStatus,
  subscribeToPushNotifications,
  savePushSubscription
} from '@/lib/push-notifications';
import { VAPID_PUBLIC_KEY } from '@/config/push-notifications';

// 1. Verificar soporte
console.log('Soportado:', isPushNotificationSupported());

// 2. Verificar estado actual
const status = await checkPushSubscriptionStatus(VAPID_PUBLIC_KEY);
console.log('Estado:', status);

// 3. Suscribirse (si no está suscrito)
if (!status.subscribed && status.permission === 'default') {
  const subscription = await subscribeToPushNotifications(VAPID_PUBLIC_KEY);
  await savePushSubscription(subscription);
  console.log('Suscrito:', subscription);
}
```

### 6.2 Test de la Edge Function

```bash
# Usando curl (reemplaza con tus valores)
curl -X POST https://[PROJECT-REF].supabase.co/functions/v1/push-notification \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "[USER_ID]",
    "title": "Test Notification",
    "body": "¡Hola! Esta es una notificación de prueba",
    "url": "/dashboard"
  }'
```

### 6.3 Verificar en Supabase

1. Ve a Table Editor → push_subscriptions
2. Deberías ver registros con:
   - `user_id`: ID del usuario
   - `subscription`: Objeto JSON con endpoint y keys
   - `is_active`: true
   - `device_info`: User agent del navegador

### 6.4 Flujo Completo de Prueba

1. **Usuario se suscribe**:
   - Navega a la app
   - Acepta permisos de notificación
   - La suscripción se guarda en Supabase

2. **Enviar notificación**:
   - Llama a la Edge Function con el user_id
   - La función busca suscripciones activas
   - Envía notificación a través del servidor push del navegador
   - El Service Worker recibe y muestra la notificación

3. **Verificar recepción**:
   - La notificación aparece en el sistema operativo
   - Al hacer clic, redirige a la URL especificada

## Notas Importantes

- Las notificaciones push solo funcionan en:
  - HTTPS (excepto localhost)
  - Navegadores modernos que soportan Push API
  - El usuario debe haber aceptado los permisos

- En iOS (Safari), las notificaciones push requieren:
  - iOS 16.4 o superior
  - PWA instalada en la pantalla de inicio
  - Configuración especial en Settings → Notifications

- Las suscripciones pueden expirar, el sistema maneja esto automáticamente marcándolas como inactivas.
