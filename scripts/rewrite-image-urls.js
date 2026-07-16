/**
 * Update DB columns pointing to Supabase storage after the images
 * have been recompressed and renamed by compress-existing-images.js.
 *
 * Reads rename-map.json and rewrites:
 *   posts.image_url
 *   users.avatar_url
 *   users.banner_url
 *   groups.icon_url
 *   groups.banner_url
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Usage: node scripts/rewrite-image-urls.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const MAP_PATH = path.join(__dirname, '../rename-map.json')
const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TABLES = [
  { table: 'posts', column: 'image_url' },
  { table: 'users', column: 'avatar_url' },
  { table: 'users', column: 'banner_url' },
  { table: 'groups', column: 'icon_url' },
  { table: 'groups', column: 'banner_url' },
]

async function updateTable(table, column, map) {
  const oldUrls = Object.keys(map)
  let updated = 0
  let checked = 0

  for (const oldUrl of oldUrls) {
    const newUrl = map[oldUrl]

    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, oldUrl)
      .limit(1)

    if (error) {
      console.error(`  ${table}.${column} read error: ${error.message}`)
      continue
    }

    if (!data || data.length === 0) continue
    checked++

    if (dryRun) continue

    const { error: upErr } = await supabase
      .from(table)
      .update({ [column]: newUrl })
      .eq(column, oldUrl)

    if (upErr) {
      console.error(`  ${table}.${column} update error: ${upErr.message}`)
      continue
    }
    updated++
  }

  return { checked, updated }
}

async function main() {
  if (!fs.existsSync(MAP_PATH)) {
    console.error(`No existe ${MAP_PATH}. Corré primero compress-existing-images.js`)
    process.exit(1)
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
  const total = Object.keys(map).length
  console.log(`Renombres a aplicar: ${total}${dryRun ? ' (DRY RUN)' : ''}\n`)

  let totalUpdated = 0

  for (const { table, column } of TABLES) {
    const { checked, updated } = await updateTable(table, column, map)
    if (checked > 0) {
      console.log(`  ${table}.${column}: ${checked} filas${dryRun ? ' matched' : `, ${updated} actualizadas`}`)
      totalUpdated += dryRun ? checked : updated
    }
  }

  console.log(`\nTotal${dryRun ? ' matched' : ' actualizado'}: ${totalUpdated}`)
  if (dryRun) console.log('Re-corre sin --dry-run para aplicar los cambios.')
}

main().catch((e) => { console.error(e); process.exit(1) })
