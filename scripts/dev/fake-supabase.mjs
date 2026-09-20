// Minimal stand-in for the Supabase REST endpoint, used only to verify that
// the server-rendered pages actually put rows into the initial HTML.
// Run: node scripts/dev/fake-supabase.mjs
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 54321)

const now = Date.now()
const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString()

const groups = [
  {
    id: 'g-1', name: 'Comunidad', slug: 'comunidad', description: 'Canal principal de la comunidad',
    is_public: true, is_active: true, is_default: true, created_by: 'u-1',
    created_at: iso(10000), updated_at: iso(100), member_count: 42, post_count: 2,
    event_count: 0, icon_url: null, banner_url: null, color: '#6366f1', post_creation_type: 'all',
  },
  {
    id: 'g-2', name: 'Zephyr', slug: 'zephyr', description: 'Firmware y RTOS',
    is_public: true, is_active: true, is_default: false, created_by: 'u-1',
    created_at: iso(9000), updated_at: iso(100), member_count: 7, post_count: 1,
    event_count: 0, icon_url: null, banner_url: null, color: '#22c55e', post_creation_type: 'all',
  },
]

const users = {
  'u-1': { name: 'Ada Lovelace', username: 'ada', email: 'ada@example.com', avatar_url: null },
}

const posts = [
  {
    id: 'p-1', title: 'Renderizado en servidor para navegadores antiguos',
    content: 'El HTML inicial ya trae el contenido, así que **links** y lectores sin JS lo ven.',
    image_url: null, vote_count: 12, created_at: iso(120), updated_at: iso(120),
    user_id: 'u-1', is_deleted: false, status: 'published', tags: ['ssr', 'legacy'],
    group_id: 'g-1', is_bot_post: false, bot_name: null, video_url: null,
    deleted_at: null, edited_at: null, api_key_id: null, comments: [{ count: 3 }],
  },
  {
    id: 'p-2', title: 'Soporte i386 en el build',
    content: 'browserslist baja el bundle a ES5.',
    image_url: null, vote_count: 5, created_at: iso(600), updated_at: iso(600),
    user_id: 'u-1', is_deleted: false, status: 'published', tags: null,
    group_id: 'g-2', is_bot_post: false, bot_name: null, video_url: null,
    deleted_at: null, edited_at: null, api_key_id: null, comments: [{ count: 1 }],
  },
]

const groupTags = [
  { group_id: 'g-1', name: 'ssr', color: '#0ea5e9' },
]

function withEmbeds(row, select) {
  const out = { ...row }
  if (select?.includes('users:user_id')) out.users = users[row.user_id] ?? null
  if (select?.includes('groups:group_id')) {
    const g = groups.find((x) => x.id === row.group_id)
    out.groups = g ? { name: g.name, slug: g.slug, color: g.color } : null
  }
  if (!select?.includes('comments:comments')) delete out.comments
  return out
}

function applyFilters(rows, params) {
  let out = [...rows]
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue
    const [op, ...rest] = raw.split('.')
    const value = rest.join('.')
    out = out.filter((row) => {
      const actual = row[key]
      switch (op) {
        case 'eq': return String(actual) === value
        case 'neq': return String(actual) !== value
        case 'gte': return key === 'created_at' ? actual >= value : Number(actual) >= Number(value)
        case 'lte': return key === 'created_at' ? actual <= value : Number(actual) <= Number(value)
        case 'gt': return Number(actual) > Number(value)
        case 'in': return value.replace(/[()]/g, '').split(',').map((v) => v.replace(/"/g, '')).includes(String(actual))
        default: return true
      }
    })
  }
  return out
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const table = url.pathname.replace('/rest/v1/', '')
  res.setHeader('Content-Type', 'application/json')

  if (!url.pathname.startsWith('/rest/v1/')) {
    res.writeHead(404).end('[]')
    return
  }

  const select = url.searchParams.get('select') ?? ''
  const source = table === 'posts' ? posts : table === 'groups' ? groups : table === 'group_tags' ? groupTags : []
  let rows = applyFilters(source, url.searchParams.entries())

  const order = url.searchParams.get('order')
  if (order) {
    const [field, dir] = order.split('.')
    rows.sort((a, b) => {
      const av = a[field], bv = b[field]
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return dir === 'desc' || dir === 'desc.nullslast' ? -cmp : cmp
    })
  }

  const limit = url.searchParams.get('limit')
  if (limit) rows = rows.slice(0, Number(limit))

  const payload = rows.map((row) => withEmbeds(row, select))
  // PostgREST returns a single object when the client asks for one row.
  const wantsSingle = (req.headers.accept || '').includes('vnd.pgrst.object')
  if (wantsSingle) {
    res.writeHead(payload.length ? 200 : 406).end(payload.length ? JSON.stringify(payload[0]) : JSON.stringify({ message: 'no rows' }))
    return
  }
  res.writeHead(200).end(JSON.stringify(payload))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake supabase on http://127.0.0.1:${PORT}`)
})
