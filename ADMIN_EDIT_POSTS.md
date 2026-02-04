# Migración: Admins Globales Pueden Editar Cualquier Publicación

## Descripción
Esta migración otorga a los administradores globales (usuarios con `is_admin = true`) la capacidad de editar cualquier publicación sin límite de tiempo, además de poder eliminarlas.

## Cambios Implementados

### 1. Base de Datos - Política RLS Actualizada

**Archivo**: `supabase/migrations/20260204000007_admin_can_edit_any_post.sql`

Se actualizó la política de `UPDATE` en la tabla `posts` para permitir que:
- Los usuarios puedan editar sus propios posts (comportamiento existente)
- Los administradores globales puedan editar cualquier post (nuevo)

```sql
CREATE POLICY "Users can update own posts or admins can update any post" ON posts
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

### 2. Página de Edición de Posts

**Archivo**: `src/app/post/[id]/edit/page.tsx`

**Cambios**:
- ✅ Los admins pueden acceder a editar cualquier post (no solo los propios)
- ✅ Los admins no tienen límite de tiempo para editar (los usuarios normales tienen 15 minutos)
- ✅ Badge distintivo "Sin límite de tiempo (Admin)" para administradores
- ✅ Validaciones ajustadas para admins

**Características para Admins**:
- Acceso a la página de edición de cualquier post
- Sin temporizador de cuenta regresiva
- Indicador visual de privilegios de admin

### 3. Componente PostActions

**Archivo**: `src/components/PostActions.tsx`

**Cambios**:
- ✅ Verificación automática de si el usuario es admin
- ✅ Los admins ven el menú de acciones en todos los posts
- ✅ Icono de escudo (`Shield`) para indicar privilegios de admin
- ✅ Los admins pueden eliminar cualquier post

**Interfaz**:
- Botón de editar visible para admins en todos los posts
- Icono púrpura de escudo junto al botón "Editar" para admins
- Sin contador de tiempo para admins

### 4. Componente PostActionsClient

**Archivo**: `src/components/PostActionsClient.tsx`

**Cambios**:
- ✅ Mismas capacidades que `PostActions` pero para la página individual del post
- ✅ Carga dinámica del estado de admin del usuario
- ✅ Interfaz consistente con badges de admin

## Instrucciones de Aplicación

### Opción 1: Dashboard de Supabase (Recomendado)
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a "SQL Editor"
4. Copiar y pegar el contenido de `supabase/migrations/20260204000007_admin_can_edit_any_post.sql`
5. Ejecutar la query

### Opción 2: CLI de Supabase
```bash
supabase db push
```

## Funcionalidades para Administradores Globales

### ✨ Nuevos Poderes de Admin

1. **Editar Cualquier Post**
   - Sin límite de tiempo (los usuarios normales tienen 15 minutos)
   - Acceso a través del menú de 3 puntos en cualquier post
   - Badge distintivo en la interfaz

2. **Eliminar Cualquier Post**
   - Opción de eliminar visible en el menú de acciones
   - Soft delete (marca como eliminado, no borra datos)

3. **Indicadores Visuales**
   - Icono de escudo púrpura en el menú de edición
   - Badge "Sin límite de tiempo (Admin)" en la página de edición
   - Menú de acciones visible en posts de otros usuarios

## Validaciones y Seguridad

- ✅ Verificación de `is_admin` en base de datos (RLS)
- ✅ Verificación de `is_admin` en el frontend
- ✅ Solo usuarios autenticados pueden editar
- ✅ Las políticas RLS previenen acceso no autorizado
- ✅ Los cambios requieren sesión activa

## Interfaz de Usuario

### Para Usuarios Normales
- Pueden editar sus propios posts durante 15 minutos
- Ven un contador regresivo
- No ven opciones en posts de otros usuarios

### Para Administradores
- Ven menú de acciones en todos los posts
- Sin contador de tiempo
- Badge morado con icono de escudo
- Indicador "Sin límite de tiempo (Admin)" en página de edición

## Rollback

Si necesitas revertir esta migración:

```sql
-- Restaurar política original
DROP POLICY IF EXISTS "Users can update own posts or admins can update any post" ON posts;

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id);
```

## Archivos Modificados

1. `supabase/migrations/20260204000007_admin_can_edit_any_post.sql` - Nueva migración
2. `src/app/post/[id]/edit/page.tsx` - Lógica de edición actualizada
3. `src/components/PostActions.tsx` - Menú de acciones con soporte admin
4. `src/components/PostActionsClient.tsx` - Versión cliente del menú de acciones

## Testing

Para probar esta funcionalidad:

1. **Como usuario normal**:
   - Crear un post
   - Verificar que solo puedes editarlo durante 15 minutos
   - Verificar que no ves opciones en posts de otros

2. **Como admin** (`is_admin = true` en tabla users):
   - Crear un post de otro usuario
   - Verificar que ves el menú de 3 puntos
   - Click en "Editar" y verificar el badge de admin
   - Editar el post sin límite de tiempo
   - Verificar que puedes eliminar posts de otros

## Notas Importantes

- Los administradores globales deben tener `is_admin = true` en la tabla `users`
- Esta funcionalidad es independiente de los roles de moderador en grupos
- Los cambios son auditables (se guarda `edited_at` timestamp)
- Las eliminaciones son soft deletes (recuperables desde la base de datos)
