# Compresión de Imágenes en KodingVibes

Este documento explica cómo funciona el sistema de compresión de imágenes implementado en el proyecto.

## 🎯 Objetivo

Reducir el espacio utilizado en el bucket de Supabase Storage mediante:
1. Compresión automática de imágenes al subirlas (lado del cliente)
2. Script para comprimir imágenes existentes (lado del servidor)

## 📦 Compresión Automática (Nuevas Imágenes)

### Cómo Funciona

Todas las imágenes nuevas que se suben a través de:
- Crear un nuevo post
- Editar un post existente
- Pegar imágenes desde el portapapeles

Son automáticamente comprimidas **antes** de subirlas al bucket usando la librería `browser-image-compression`.

### Configuración de Compresión

La función `compressImage` en `src/lib/utils.ts` aplica las siguientes configuraciones:

- **Tamaño máximo**: 1 MB
- **Dimensiones máximas**: 1920px (ancho o alto)
- **Formato**: WebP (mejor compresión con calidad)
- **Compresión**: Web Worker activado (no bloquea la UI)

### Ajustar la Compresión

Para modificar los parámetros de compresión, edita `src/lib/utils.ts`:

```typescript
const defaultOptions = {
  maxSizeMB: 1,           // Cambiar tamaño máximo en MB
  maxWidthOrHeight: 1920, // Cambiar dimensiones máximas
  useWebWorker: true,
  fileType: 'image/webp', // Cambiar formato de salida
};
```

## 🔄 Comprimir Imágenes Existentes

### Script de Compresión Masiva

El script `scripts/compress-existing-images.js` permite comprimir todas las imágenes ya existentes en el bucket.

### Requisitos Previos

1. Asegúrate de tener un archivo `.env.local` con:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

2. El Service Role Key se encuentra en:
   - Dashboard de Supabase → Settings → API → Service Role Key
   - ⚠️ **Nunca** expongas esta clave en código del cliente

### Ejecutar el Script

```bash
npm run images:compress
```

### ¿Qué Hace el Script?

1. **Lista** todas las imágenes del bucket `images/posts/`
2. **Descarga** cada imagen
3. **Comprime** usando sharp:
   - Redimensiona a máximo 1920px
   - Ajusta calidad al 80%
   - Convierte a WebP (excepto GIFs y PNGs con transparencia)
4. **Reemplaza** la imagen original solo si el ahorro es mayor al 5%
5. **Reporta** estadísticas de ahorro

### Configuración del Script

Edita `scripts/compress-existing-images.js`:

```javascript
const MAX_WIDTH = 1920;    // Ancho máximo en píxeles
const QUALITY = 80;        // Calidad de compresión (0-100)
const BUCKET_NAME = 'images'; // Nombre del bucket
```

### Ejemplo de Salida

```
🚀 Iniciando compresión de imágenes existentes...

📊 Encontradas 45 imágenes en el bucket

[1/45]
📸 Procesando: posts/image-123.jpg
  📦 Tamaño original: 2.5 MB
  📦 Tamaño comprimido: 450 KB
  💾 Ahorro: 82%
  ✅ Comprimida exitosamente

...

============================================================
📈 RESUMEN DE COMPRESIÓN
============================================================
Total de imágenes: 45
Procesadas: 45
Omitidas (sin ahorro): 3
Fallidas: 0

Tamaño total original: 112.3 MB
Tamaño total comprimido: 23.7 MB

💾 Ahorro total: 88.6 MB (78.89%)
============================================================
```

## 🔒 Seguridad

### Validación de Archivos

Antes de comprimir, todas las imágenes pasan por validación en `src/lib/security/validation.ts`:

- **Tipos permitidos**: JPEG, PNG, GIF, WebP
- **Tamaño máximo original**: 5 MB
- **Tamaño máximo comprimido**: 2 MB (en upload)

### Service Role Key

- ⚠️ El script de compresión masiva usa el Service Role Key
- Solo ejecuta este script en tu máquina local o servidor seguro
- **Nunca** incluyas el Service Role Key en código del cliente
- **Nunca** lo commits a Git (debe estar en `.env.local` que está en `.gitignore`)

## 🎨 Formatos Soportados

### Compresión del Cliente (browser-image-compression)
- ✅ JPEG → WebP
- ✅ PNG → WebP (si no tiene transparencia) o PNG optimizado
- ✅ GIF → WebP (frames estáticos)
- ✅ WebP → WebP optimizado

### Compresión del Servidor (sharp)
- ✅ JPEG → JPEG optimizado
- ✅ PNG con transparencia → PNG optimizado
- ✅ PNG sin transparencia → WebP
- ✅ WebP → WebP optimizado
- ⚠️ GIF animado → Se mantiene sin cambios (sharp no soporta GIFs animados)

## 📊 Beneficios

### Reducción de Costos
- Menor uso de storage en Supabase
- Menor uso de ancho de banda
- Tiempos de carga más rápidos

### Mejor Experiencia de Usuario
- Carga más rápida de imágenes
- Menor consumo de datos móviles
- Mejor rendimiento en redes lentas

## 🛠️ Solución de Problemas

### Error: "Sharp no está instalado"
```bash
npm install sharp --save-dev
```

### Error: "dotenv no está instalado"
```bash
npm install dotenv --save-dev
```

### Error: "Missing Supabase environment variables"
Verifica que `.env.local` contenga:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error al procesar imágenes
- Verifica que el bucket `images` exista
- Verifica que el Service Role Key tenga permisos de lectura/escritura
- Revisa los logs de Supabase Dashboard → Storage → Logs

## 📝 Notas Adicionales

- Las imágenes se comprimen **antes** de subirlas, no después
- El script puede tardar dependiendo del número de imágenes
- Se recomienda hacer un backup antes de ejecutar el script de compresión masiva
- El script incluye una pausa de 500ms entre cada imagen para no sobrecargar la API

## 🔗 Referencias

- [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
- [sharp](https://sharp.pixelplumbing.com/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
