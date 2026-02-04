# Sistema de Moderación y Bans de Usuarios

## Descripción
Este sistema implementa una gestión completa de moderación y control de usuarios, permitiendo a los moderadores solicitar eliminación de posts y a los administradores globales gestionar suspensiones de usuarios.

## Nuevas Tablas en la Base de Datos

### 1. `moderation_requests`
Almacena las peticiones de moderadores para eliminar posts.

**Columnas:**
- `id`: UUID, clave primaria
- `post_id`: UUID, referencia al post
- `group_id`: UUID, referencia al grupo
- `requested_by`: UUID, moderador que solicita
- `reason`: TEXT, motivo de la solicitud
- `status`: VARCHAR(20), estado (pending, approved, rejected)
- `reviewed_by`: UUID, admin que revisó
- `reviewed_at`: TIMESTAMP, fecha de revisión
- `admin_notes`: TEXT, notas del admin
- `created_at`, `updated_at`: TIMESTAMP

### 2. `user_bans`
Registro de suspensiones de usuarios.

**Columnas:**
- `id`: UUID, clave primaria
- `user_id`: UUID, usuario suspendido
- `banned_by`: UUID, admin que suspendió
- `reason`: TEXT, motivo de la suspensión
- `ban_type`: VARCHAR(20), tipo (permanent, temporary)
- `expires_at`: TIMESTAMP, fecha de expiración (solo temporal)
- `is_active`: BOOLEAN, si está activo
- `unbanned_at`: TIMESTAMP, fecha de remoción
- `unbanned_by`: UUID, admin que removió
- `unban_reason`: TEXT, motivo de remoción
- `created_at`, `updated_at`: TIMESTAMP

## Nuevos Tipos de Notificaciones

Se agregaron los siguientes tipos:
- `ban` - Usuario ha sido suspendido
- `unban` - Suspensión removida
- `moderation_request` - Nueva petición de moderación (para admins)
- `moderation_approved` - Petición aprobada
- `moderation_rejected` - Petición rechazada

## Funciones de Base de Datos

### `approve_moderation_request(request_id, admin_id, notes?)`
Aprueba una petición de moderación y elimina el post.
- Marca el post como eliminado
- Actualiza la petición a "approved"
- Notifica al moderador que solicitó

### `reject_moderation_request(request_id, admin_id, notes)`
Rechaza una petición de moderación.
- Actualiza la petición a "rejected"
- Notifica al moderador con las notas del admin

### `ban_user(target_user_id, admin_id, ban_reason, ban_type, expires_at?)`
Suspende a un usuario.
- Desactiva bans anteriores
- Crea nuevo ban (permanente o temporal)
- Notifica al usuario sobre la suspensión
- Retorna el ID del ban creado

### `unban_user(target_user_id, admin_id, unban_reason?)`
Remueve la suspensión de un usuario.
- Marca bans activos como inactivos
- Registra quien removió y cuándo
- Notifica al usuario

### `is_user_banned(check_user_id)`
Verifica si un usuario está actualmente suspendido.
- Valida bans permanentes
- Verifica si bans temporales han expirado
- Auto-desactiva bans expirados
- Retorna boolean

## Panel de Administración

### Nueva Página: `/admin`

**URL**: `/admin/page.tsx`
**Acceso**: Solo administradores globales

#### Secciones:

**1. Peticiones de Moderación**
- Lista de peticiones pendientes
- Información del moderador solicitante
- Motivo de la solicitud
- Enlace al post en cuestión
- Botones para aprobar/rechazar con notas

**2. Suspensiones Activas**
- Lista de usuarios suspendidos
- Tipo de ban (permanente/temporal)
- Fecha de expiración (si aplica)
- Motivo de la suspensión
- Botón para remover suspensión

**3. Gestión de Usuarios**
- Búsqueda de usuarios por email, username o nombre
- Información detallada de usuarios
- Botón para suspender usuarios
- Indicador de usuarios admin

### Modal de Suspensión

Permite configurar:
- **Tipo**: Permanente o Temporal
- **Duración**: 1, 3, 7, 14 o 30 días (para temporales)
- **Motivo**: Campo requerido con explicación

## Instrucciones de Aplicación

### 1. Aplicar la Migración

**Opción A: Dashboard de Supabase (Recomendado)**
```
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a "SQL Editor"
4. Copiar y pegar el contenido de:
   supabase/migrations/20260204000008_add_moderation_and_bans.sql
5. Ejecutar la query
```

**Opción B: CLI de Supabase**
```bash
supabase db push
```

### 2. Verificar Políticas RLS

Asegúrate de que las políticas RLS estén habilitadas para:
- `moderation_requests`
- `user_bans`

## Flujo de Trabajo

### Moderadores de Grupo
1. Identifican un post problemático
2. Crean una petición de moderación con motivo
3. Reciben notificación cuando el admin aprueba/rechaza

### Administradores Globales
1. Acceden a `/admin`
2. Ven peticiones pendientes en orden cronológico
3. Revisan el post y el motivo
4. Aprueban (elimina post) o rechazan (con notas)
5. Gestionan suspensiones de usuarios si es necesario

### Suspensiones
- **Temporales**: Se desactivan automáticamente al expirar
- **Permanentes**: Requieren intervención manual para remover
- **Notificaciones**: Usuario recibe notificación al ser suspendido/desbaneado

## Características de Seguridad

### Políticas RLS

**`moderation_requests`:**
- SELECT: Admins globales, moderadores del grupo, o creador de la petición
- INSERT: Solo moderadores/admins del grupo
- UPDATE: Solo admins globales

**`user_bans`:**
- SELECT: Usuario afectado o admins globales
- INSERT/UPDATE: Solo admins globales

### Validaciones

- Admins no pueden banearse a sí mismos
- Solo un ban activo por usuario (bans anteriores se desactivan)
- Bans temporales expirados se marcan automáticamente como inactivos
- Las peticiones de moderación requieren estar en un grupo con permisos

## Interfaz de Usuario

### Indicadores Visuales

**Peticiones:**
- Badge con nombre del grupo
- Timestamp de creación
- Nombre del moderador solicitante
- Botones de acción con colores distintivos

**Bans:**
- Badge de tipo (rojo para permanente, naranja para temporal)
- Contador de tiempo hasta expiración
- Información del admin que suspendió
- Estado visual claro

**Usuarios:**
- Badge púrpura para admins
- Información completa del perfil
- Botón de suspensión (no disponible para admins)

## Archivos Modificados/Creados

### Migración
1. `supabase/migrations/20260204000008_add_moderation_and_bans.sql` - Nueva migración completa

### Types
2. `src/types/database.ts` - Tipos para nuevas tablas y funciones
3. `src/types/notifications.ts` - Nuevos tipos de notificaciones

### Páginas
4. `src/app/admin/page.tsx` - Nueva página de administración

## Testing

### Como Moderador de Grupo
1. Ir a un post en tu grupo
2. Solicitar eliminación con motivo
3. Verificar notificación de aprobación/rechazo

### Como Admin Global
1. Acceder a `/admin`
2. Ver peticiones pendientes
3. Aprobar/rechazar con notas
4. Buscar usuario
5. Suspender usuario (temporal o permanente)
6. Verificar notificaciones enviadas
7. Remover suspensión

### Verificar Notificaciones
- Usuario suspendido recibe notificación con tipo y motivo
- Usuario desbaneado recibe notificación
- Moderador recibe notificación de aprobación/rechazo

## Próximos Pasos

1. **Agregar botón de reporte en PostCard** para que moderadores puedan solicitar eliminación fácilmente
2. **Dashboard de moderador** para ver sus propias peticiones
3. **Historial de bans** para cada usuario
4. **Estadísticas de moderación** (posts eliminados, usuarios suspendidos, etc.)
5. **Sistema de apelaciones** para usuarios suspendidos

## Notas Importantes

- Las suspensiones no borran los datos del usuario, solo restringen acceso
- Los posts "eliminados" son soft deletes (recuperables)
- Todas las acciones son auditables con timestamps y user_ids
- Las notificaciones se envían automáticamente a través de funciones de PostgreSQL
- Los bans temporales se auto-desactivan al expirar (verificación en `is_user_banned`)

## Rollback

Si necesitas revertir esta migración:

```sql
-- Eliminar funciones
DROP FUNCTION IF EXISTS unban_user(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS ban_user(UUID, UUID, TEXT, VARCHAR, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS reject_moderation_request(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS approve_moderation_request(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS is_user_banned(UUID);

-- Eliminar tablas
DROP TABLE IF EXISTS user_bans;
DROP TABLE IF EXISTS moderation_requests;

-- Restaurar constraint de notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('upvote', 'comment', 'reply'));
```
