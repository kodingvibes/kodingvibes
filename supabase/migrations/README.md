# Migración de Tags para Supabase

## Si tienes una base de datos existente

Para agregar la columna `tags` a tu tabla `posts` existente, ejecuta el siguiente SQL en el **SQL Editor de Supabase**:

```sql
-- Add tags column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for tags (for efficient filtering/searching)
CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING gin(tags);
```

## Si estás creando la base de datos desde cero

Usa el archivo `schema.sql` completo que ya incluye la columna `tags`.

## Verificación

Después de ejecutar la migración, puedes verificar que la columna se agregó correctamente:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'tags';
```

Deberías ver:
- `column_name`: tags
- `data_type`: ARRAY
- `column_default`: '{}'

## Notas

- La columna es un array de texto (`text[]`)
- Valor por defecto: array vacío `{}`
- Se crea un índice GIN para búsquedas eficientes por tags
