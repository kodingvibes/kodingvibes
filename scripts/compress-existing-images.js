/**
 * Compress + convert all images in the Supabase storage bucket to WebP.
 *
 * - Max width 1280px (smaller for 3G clients, no visible loss at typical sizes).
 * - WebP quality 75. PNGs with alpha keep PNG (browsers can't render alpha in WebP
 *   lossless without bigger files; the savings aren't worth it). Other PNGs go WebP.
 * - GIFs are skipped (sharp doesn't handle animated GIFs well).
 * - The output filename is `originalBaseName.webp` (or kept as PNG if it had alpha).
 * - The original is deleted on success.
 * - A mapping file (rename-map.json) is written with old URL -> new URL so
 *   scripts/rewrite-image-urls.js can update the DB.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Usage: node scripts/compress-existing-images.js
 */

const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'images'
const MAX_WIDTH = 1280
const QUALITY = 75
const SAVINGS_THRESHOLD = 5
const PAGE_SIZE = 100
const MAP_PATH = path.join(__dirname, '../rename-map.json')

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function compressImage(buffer) {
  // Detect if it has alpha. PNG and WebP can; JPEG never does.
  const meta = await sharp(buffer).metadata()
  const hasAlpha = Boolean(meta.hasAlpha)

  let s = sharp(buffer).resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })

  if (hasAlpha) {
    // Keep lossless-ish PNG. Quality doesn't really apply to PNG; compressionLevel does.
    s = s.png({ compressionLevel: 9 })
  } else {
    s = s.webp({ quality: QUALITY })
  }

  return { buffer: await s.toBuffer(), hasAlpha }
}

function buildNewName(oldName, hasAlpha) {
  const ext = path.extname(oldName).toLowerCase()
  if (ext === '.gif') return null // skip gifs
  const base = oldName.slice(0, -ext.length)
  return hasAlpha ? `${base}.png` : `${base}.webp`
}

async function listAllFiles(prefix) {
  const files = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) { console.error('  list error:', error.message); return files }
    if (!data || data.length === 0) break
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) files.push(...(await listAllFiles(full)))
      else files.push(full)
    }
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return files
}

async function processFile(filename) {
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filename)
  if (downloadError || !downloadData) return { success: false, error: downloadError?.message || 'download null' }

  const originalBuffer = Buffer.from(await downloadData.arrayBuffer())
  const originalSize = originalBuffer.length

  const ext = path.extname(filename).toLowerCase()
  if (ext === '.gif') return { success: true, skipped: true, reason: 'gif' }

  const { buffer: newBuffer, hasAlpha } = await compressImage(originalBuffer)
  const newName = buildNewName(filename, hasAlpha)
  const newSize = newBuffer.length
  const savings = originalSize === 0 ? 0 : ((originalSize - newSize) / originalSize) * 100

  if (newName === filename && savings < SAVINGS_THRESHOLD) {
    return { success: true, skipped: true, originalSize, compressedSize: newSize, reason: 'no rename + <5%' }
  }

  // Upload new
  const { error: upErr } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(newName, newBuffer, { contentType: hasAlpha ? 'image/png' : 'image/webp', upsert: true })
  if (upErr) return { success: false, error: `upload: ${upErr.message}` }

  // Delete old (skip if same name)
  if (newName !== filename) {
    const { error: delErr } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filename])
    if (delErr) {
      // Don't roll back — new file is fine, old one is orphan we can clean later
      console.warn(`    warn: no se pudo borrar el original: ${delErr.message}`)
    }
  }

  return { success: true, newName, originalSize, compressedSize: newSize, savings }
}

function publicUrlFor(name) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${name}`
}

async function main() {
  console.log(`Comprimiendo bucket '${BUCKET_NAME}' -> max ${MAX_WIDTH}px, WebP q${QUALITY}\n`)

  const files = await listAllFiles('')
  console.log(`Encontrados ${files.length} archivos\n`)

  const stats = { total: files.length, processed: 0, skipped: 0, failed: 0, original: 0, compressed: 0 }
  const renameMap = {}

  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    process.stdout.write(`[${i + 1}/${files.length}] ${filename} ... `)

    const r = await processFile(filename)

    if (!r.success) {
      stats.failed++
      console.log(`FAIL (${r.error})`)
      continue
    }

    if (r.skipped) {
      stats.skipped++
      console.log(`skip (${r.reason})`)
      continue
    }

    stats.processed++
    stats.original += r.originalSize
    stats.compressed += r.compressedSize

    if (r.newName && r.newName !== filename) {
      const oldUrl = publicUrlFor(filename)
      const newUrl = publicUrlFor(r.newName)
      renameMap[oldUrl] = newUrl
      console.log(`${formatBytes(r.originalSize)} -> ${formatBytes(r.compressedSize)} (-${r.savings.toFixed(1)}%) [renamed]`)
    } else {
      console.log(`${formatBytes(r.originalSize)} -> ${formatBytes(r.compressedSize)} (-${r.savings.toFixed(1)}%)`)
    }

    await new Promise((res) => setTimeout(res, 150))
  }

  await fs.writeFile(MAP_PATH, JSON.stringify(renameMap, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('RESUMEN')
  console.log('='.repeat(60))
  console.log(`Total: ${stats.total}`)
  console.log(`Procesados: ${stats.processed}`)
  console.log(`Omitidos: ${stats.skipped}`)
  console.log(`Fallidos: ${stats.failed}`)
  if (stats.original > 0) {
    const saved = stats.original - stats.compressed
    const pct = ((saved / stats.original) * 100).toFixed(2)
    console.log(`\nOriginal: ${formatBytes(stats.original)}`)
    console.log(`Comprimido: ${formatBytes(stats.compressed)}`)
    console.log(`Ahorro: ${formatBytes(saved)} (${pct}%)`)
  }
  console.log(`\nMapa de renombres: ${MAP_PATH} (${Object.keys(renameMap).length} URLs)`)
}

try { require.resolve('sharp') } catch { console.error('Instala sharp'); process.exit(1) }
try { require.resolve('dotenv') } catch { console.error('Instala dotenv'); process.exit(1) }

main().catch((e) => { console.error(e); process.exit(1) })
