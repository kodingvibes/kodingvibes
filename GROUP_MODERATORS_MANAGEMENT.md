# Gestión de Moderadores en Canales

## Descripción

Se ha implementado la funcionalidad para que los creadores de canales puedan asignar y gestionar moderadores dentro de la página de administración del canal.

## Cambios Implementados

### 1. Base de Datos (Supabase)

#### Nueva Migración: `20260204000010_allow_group_creator_manage_roles.sql`

Se agregaron tres nuevas políticas RLS:

- **`group_creator_can_update_member_roles`**: Permite al creador del canal actualizar los roles de cualquier miembro
- **`group_creator_can_remove_members`**: Permite al creador del canal eliminar cualquier miembro
- **`group_moderators_can_remove_members`**: Permite a moderadores y admins eliminar miembros (excepto al creador)

### 2. Interfaz de Usuario

#### Archivo: `src/app/group/[slug]/admin/page.tsx`

**Nuevas características:**

1. **Tipos TypeScript**:
   - `GroupMember`: Define la estructura de un miembro con su rol y datos de usuario

2. **Estado Adicional**:
   - `members`: Lista de miembros del canal
   - `isCreator`: Indica si el usuario actual es el creador del canal

3. **Nuevas Funciones**:
   - `handleChangeRole()`: Permite cambiar el rol de un miembro (member, moderator, admin)
   - `handleRemoveMember()`: Permite remover un miembro del canal

4. **Nueva Sección UI**: "Gestión de Moderadores"
   - Solo visible para el creador del canal
   - Muestra lista completa de miembros con sus avatares y nombres
   - Selector de rol para cada miembro (excepto el creador)
   - Botón para remover miembros
   - Indicadores visuales para el creador del canal
   - Información sobre cada rol

## Roles Disponibles

### 1. **Miembro** (`member`)
- Puede ver y crear posts en el canal
- Puede comentar y votar

### 2. **Moderador** (`moderator`)
- Todos los permisos de miembro
- Puede gestionar tags del canal
- Puede acceder a la página de administración

### 3. **Admin** (`admin`)
- Todos los permisos de moderador
- Permisos administrativos adicionales
- No puede cambiar roles (solo el creador)

### 4. **Creador** (implícito)
- Usuario que creó el canal
- Solo puede ser uno
- Puede cambiar roles de cualquier miembro
- Puede remover cualquier miembro
- No puede ser removido del canal

## Reglas de Negocio

1. **Solo el creador puede cambiar roles**: Los moderadores y admins no pueden cambiar roles de otros miembros
2. **El creador no puede ser removido**: El sistema impide remover al creador del canal
3. **Moderadores pueden remover miembros comunes**: Pero no pueden remover al creador ni cambiar roles
4. **Permisos de edición de tags**: Tanto moderadores como admins pueden gestionar los tags del canal

## Uso

### Para el Creador del Canal

1. Navega a `/group/[slug]/admin`
2. Desplázate hasta la sección "Gestión de Moderadores"
3. **Buscar miembros**: Usa el campo de búsqueda para filtrar por nombre o usuario
4. **Navegar páginas**: Usa los botones de navegación si hay más de 10 miembros
5. **Cambiar rol**: Usa el selector desplegable para cambiar el rol de un miembro
6. **Remover miembro**: Usa el botón de papelera para remover un miembro del canal

### Confirmaciones

- Al remover un miembro, se solicita confirmación
- Los cambios se reflejan inmediatamente en la interfaz
- Se muestran mensajes de éxito o error según corresponda

## Seguridad

- Todas las operaciones están protegidas por RLS en Supabase
- Solo el creador del canal puede actualizar roles (verificación en BD)
- Los moderadores pueden remover miembros pero no cambiar roles
- El creador del canal no puede ser removido (verificación en BD y frontend)

## Características de UI/UX

- **Buscador**: Campo de búsqueda para filtrar miembros por nombre o usuario
- **Paginación**: Listado paginado mostrando 10 miembros por página
- **Contador de resultados**: Muestra el total de miembros y el rango actual
- **Badges de roles**: Indicadores visuales de colores para cada rol:
  - 🔴 Admin (rojo)
  - 🔵 Moderador (azul)
  - ⚪ Miembro (gris)
- **Avatares**: Muestra el avatar del usuario o un gradiente con su inicial
- **Badge "Creador"**: Amarillo para identificar al propietario del canal
- **Estados de carga**: Botones deshabilitados durante operaciones
- **Feedback visual**: Mensajes de éxito y error
- **Responsive**: Diseño adaptable a diferentes tamaños de pantalla
- **Dark mode**: Soporte completo para modo oscuro
- **Hover effects**: Efectos visuales al pasar el mouse sobre elementos interactivos

## Migración de Base de Datos

Para aplicar esta funcionalidad en producción:

```bash
# Aplicar la nueva migración en Supabase
supabase db push
```

O desde el panel de Supabase, ejecuta manualmente el contenido de:
`supabase/migrations/20260204000010_allow_group_creator_manage_roles.sql`

## Testing Recomendado

1. **Como creador del canal**:
   - ✓ Buscar miembros por nombre de usuario
   - ✓ Navegar entre páginas con más de 10 miembros
   - ✓ Cambiar rol de un miembro a moderador
   - ✓ Cambiar rol de un moderador a admin
   - ✓ Degradar un admin a miembro
   - ✓ Remover un miembro del canal
   - ✓ Intentar removerse a sí mismo (debería fallar)
   - ✓ Verificar que los badges de roles se muestren correctamente

2. **Como moderador**:
   - ✓ Acceder a la página de admin
   - ✓ No ver la sección de gestión de moderadores
   - ✓ Poder gestionar tags

3. **Como miembro regular**:
   - ✓ No poder acceder a `/group/[slug]/admin`
   - ✓ Ser redirigido al canal principal

## Notas Adicionales

- La funcionalidad está completamente integrada con el sistema de permisos existente
- Los cambios son persistentes y se reflejan inmediatamente
- El contador de miembros se actualiza automáticamente mediante triggers
- Compatible con el sistema de notificaciones existente
