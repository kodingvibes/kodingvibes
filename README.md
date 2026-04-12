# KodingVibes

Una comunidad estilo Reddit para desarrolladores. Comparte conocimiento, código y experiencias.

## Características

- 🔐 Autenticación con Google OAuth (Supabase Auth)
- 📝 Crear posts con texto e imágenes
- 👍 Sistema de votación (upvotes/downvotes)
- 💬 Comentarios anidados
- 🎨 Diseño moderno con modo oscuro/claro toggle
- 📱 Totalmente responsive
- 🚀 Optimizado para Vercel + Supabase
- 🎯 Logo SVG personalizado

## Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Vercel
- **Autenticación:** Google OAuth via Supabase
- **Tipografía:** Inter (Google Fonts)

## Configuración Local

### 1. Clonar e instalar dependencias

```bash
cd kodingvibes
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `supabase/schema.sql` en el SQL Editor de Supabase
3. Configura el Authentication:
   - Ve a Authentication > Providers
   - Activa Google OAuth
   - Configura tus credenciales de Google Cloud Console
4. Crea un bucket llamado `images` en Storage (público)

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Despliegue en Vercel

### 1. Preparar el proyecto

```bash
# Asegúrate de que todo esté funcionando localmente
npm run build
```

### 2. Desplegar en Vercel

Opción A: CLI de Vercel
```bash
npm i -g vercel
vercel
```

Opción B: GitHub Integration
1. Sube el código a GitHub
2. Conecta tu repo en [Vercel Dashboard](https://vercel.com)
3. Configura las variables de entorno en Vercel
4. Deploy automático en cada push

### 3. Variables de entorno en Vercel

Configura estas variables en tu proyecto de Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (tu dominio de Vercel)

### 4. Configurar OAuth en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea credenciales OAuth 2.0
3. Agrega los URIs autorizados:
   - Local: `http://localhost:3000/auth/callback`
   - Producción: `https://www.kodingvibes.com/auth/callback`
4. Actualiza las credenciales en Supabase

## Estructura del Proyecto

```
kodingvibes/
├── src/
│   ├── app/                    # Rutas de Next.js App Router
│   │   ├── auth/callback/      # Callback de OAuth
│   │   ├── post/[id]/          # Página de post individual
│   │   ├── submit/             # Crear nuevo post
│   │   ├── globals.css         # Estilos globales
│   │   ├── layout.tsx          # Layout raíz
│   │   └── page.tsx            # Página principal
│   ├── components/             # Componentes React
│   │   ├── CommentSection.tsx  # Sistema de comentarios
│   │   ├── Header.tsx          # Header con navegación
│   │   ├── PostCard.tsx        # Tarjeta de post
│   │   ├── VoteButtons.tsx     # Botones de votación
│   │   └── icons/
│   │       └── Logo.tsx        # Logo SVG del sitio
│   ├── lib/
│   │   └── supabase/           # Clientes de Supabase
│   ├── providers/
│   │   └── theme-provider.tsx  # Proveedor de tema oscuro
│   └── types/
│       └── database.ts         # Tipos de Supabase
├── supabase/
│   └── schema.sql              # Esquema de base de datos
├── .env.local.example          # Variables de entorno de ejemplo
├── next.config.mjs             # Configuración de Next.js
├── tailwind.config.ts          # Configuración de Tailwind
└── package.json
```

## Características de Diseño

### Modo Oscuro
- Toggle en el header para cambiar entre modo claro/oscuro
- Persistencia en localStorage
- Transiciones suaves entre temas
- Iconos de sol/luna que cambian según el tema

### Paleta de Colores
- **Primario:** Indigo/Púrpura gradiente
- **Fondo claro:** Slate-50
- **Fondo oscuro:** Slate-900
- **Acentos:** Amarillo (hero), Indigo (botones)

### Tipografía
- **Fuente:** Inter (Google Fonts)
- **Pesos:** 300, 400, 500, 600, 700, 800
- **Optimización:** Font feature settings para mejor legibilidad

### Logo SVG
- Diseño personalizado con elementos de código (< > /)
- Colores que se adaptan al tema actual
- Animación suave al hover

## API Endpoints

Los datos se manejan directamente via Supabase:

- **Posts:** Tabla `posts` con RLS
- **Comentarios:** Tabla `comments` con relaciones recursivas
- **Votos:** Tabla `votes` con constraint unique
- **Usuarios:** Tabla `users` sincronizada con Auth

## Límites del Plan Gratuito

### Supabase (Free Tier)
- Base de datos: 500MB
- Storage: 1GB
- Ancho de banda: 2GB/mes
- Auth: Ilimitado

### Vercel (Hobby)
- Builds: Ilimitado
- Ancho de banda: 100GB/mes
- Funciones serverless: 10s timeout

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## Licencia

MIT License - Libre para usar y modificar.

## Soporte

Para problemas o preguntas, abre un issue en GitHub.

---

Hecho con ❤️ para la comunidad de desarrolladores.
