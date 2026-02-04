# Migración: Tags Personalizados por Grupo

## Descripción
Esta migración agrega la funcionalidad de tags personalizados por grupo. Cada grupo puede tener hasta 10 tags personalizados que solo los miembros de ese grupo pueden usar.

## Cambios en la Base de Datos

### Nueva Tabla: `group_tags`
Almacena los tags personalizados de cada grupo.

**Columnas:**
- `id`: UUID, clave primaria
- `group_id`: UUID, referencia a la tabla `groups`
- `name`: VARCHAR(50), nombre del tag
- `color`: VARCHAR(7), color hexadecimal del tag (default: #6366f1)
- `created_by`: UUID, referencia al usuario creador
- `created_at`: TIMESTAMP, fecha de creación
- `updated_at`: TIMESTAMP, fecha de actualización

**Restricciones:**
- Máximo 10 tags por grupo (verificado por trigger)
- Combinación única de `group_id` y `name`

### Políticas RLS
- **SELECT**: Visible para miembros del grupo o si el grupo es público
- **INSERT/UPDATE/DELETE**: Solo para creador del grupo o admins/moderadores del grupo

## Instrucciones de Aplicación

### Opción 1: Dashboard de Supabase (Recomendado)
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a "SQL Editor"
4. Copiar y pegar el contenido de `supabase/migrations/20260204000006_add_group_tags.sql`
5. Ejecutar la query

### Opción 2: CLI de Supabase
```bash
# Si tienes el CLI instalado
supabase db push

# O aplicar la migración específica
supabase migration up --version 20260204000006
```

### Opción 3: psql (si tienes PostgreSQL client)
```bash
cat supabase/migrations/20260204000006_add_group_tags.sql | \
  PGPASSWORD=your_password psql \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres
```

## Nuevas Funcionalidades

### 1. Página de Administración de Grupo
- **URL**: `/group/[slug]/admin`
- **Acceso**: Solo para creador del grupo, admins y moderadores
- **Funciones**:
  - Crear tags personalizados (máximo 10)
  - Eliminar tags existentes
  - Personalizar color de cada tag

### 2. Perfil de Usuario Actualizado
- **URL**: `/profile`
- **Nuevas secciones**:
  - Muestra los grupos creados por el usuario
  - Enlace directo a la administración de cada grupo

### 3. Botón de Administración en Grupo
- Visible en `/group/[slug]` para admins
- Acceso rápido a la configuración del grupo

## Validaciones
- Los tags no pueden tener nombres duplicados dentro del mismo grupo
- Un grupo no puede tener más de 10 tags
- Solo usuarios autorizados pueden gestionar tags

## Tipos TypeScript Actualizados
Se agregó la interfaz `group_tags` en `src/types/database.ts` con todas las operaciones CRUD.

## Rollback
Si necesitas revertir esta migración:

```sql
-- Eliminar tabla y triggers
DROP TRIGGER IF EXISTS trigger_check_group_tags_limit ON group_tags;
DROP FUNCTION IF EXISTS check_group_tags_limit();
DROP TABLE IF EXISTS group_tags;
```

## Próximos Pasos
1. Aplicar la migración en producción
2. Los administradores de grupos podrán empezar a crear sus tags personalizados
3. En el futuro, estos tags se podrán usar al crear posts dentro del grupo
