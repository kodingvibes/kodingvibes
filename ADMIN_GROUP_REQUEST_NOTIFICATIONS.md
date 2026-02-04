# Notificaciones de Solicitudes de Canal para Administradores

## Descripción

Cuando un usuario solicita crear un nuevo canal, todos los administradores globales reciben automáticamente una notificación.

## Características

- ✅ Notificación automática a todos los admins globales
- ✅ Incluye detalles del canal solicitado (nombre, slug, descripción)
- ✅ Muestra quién solicitó el canal
- ✅ Se integra con el sistema de notificaciones existente

## Aplicar la Migración

### Opción A: Dashboard de Supabase (Recomendado)

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Copia y pega el contenido de:
   ```
   supabase/migrations/20260204000011_notify_admins_group_requests.sql
   ```
5. Ejecuta la query

### Opción B: CLI de Supabase

```bash
supabase db push
```

## Cómo Funciona

### Trigger Automático

Cuando se inserta un nuevo registro en `group_creation_requests` con status `pending`:

1. **Se obtiene el nombre del solicitante** del usuario que creó la solicitud
2. **Se buscan todos los administradores globales** (`is_admin = true`)
3. **Se crea una notificación para cada admin** con:
   - Tipo: `group_request`
   - Título: "Nueva solicitud de canal"
   - Mensaje: "{nombre} ha solicitado crear el canal "{nombre del canal}""
   - Metadata incluye: ID de la solicitud, nombre, slug, descripción y visibilidad

### Tipo de Notificación

Se agregó un nuevo tipo `group_request` al constraint de tipos de notificaciones.

Tipos disponibles ahora:
- `upvote`
- `comment`
- `reply`
- `ban`
- `unban`
- `moderation_request`
- `moderation_approved`
- `moderation_rejected`
- `group_request` ← **NUEVO**

## Flujo de Usuario

1. **Usuario normal** solicita crear un canal desde `/groups/create`
2. **Sistema** inserta el registro en `group_creation_requests`
3. **Trigger** se dispara automáticamente
4. **Todos los admins** reciben una notificación instantánea
5. **Admin** puede ver la notificación y hacer clic para ir a `/admin/group-requests`
6. **Admin** revisa y aprueba/rechaza la solicitud

## Metadata de la Notificación

Cada notificación incluye los siguientes datos en el campo `metadata`:

```json
{
  "request_id": "uuid-de-la-solicitud",
  "channel_name": "Nombre del canal",
  "channel_slug": "slug-del-canal",
  "description": "Descripción del canal",
  "is_public": true
}
```

Este metadata puede usarse para:
- Enlazar directamente a la página de revisión
- Mostrar vista previa de la solicitud
- Filtrar notificaciones por tipo de canal

## Archivos Modificados

- `supabase/migrations/20260204000011_notify_admins_group_requests.sql` - Nueva migración

## Próximos Pasos Recomendados

1. **Aplicar la migración** en producción
2. **Actualizar el componente de notificaciones** para manejar el tipo `group_request`
3. **Agregar enlace** desde la notificación a `/admin/group-requests`
4. **Considerar agregar badge** en la campana de notificaciones cuando hay solicitudes pendientes

## Verificación

Después de aplicar la migración, puedes probar:

1. Crear una solicitud de canal como usuario normal
2. Verificar que todos los admins reciban la notificación
3. Comprobar que el metadata contenga todos los datos necesarios

```sql
-- Query para verificar las notificaciones de solicitudes de canal
SELECT 
  n.*,
  u.name as admin_name,
  u.email as admin_email
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'group_request'
ORDER BY n.created_at DESC;
```
