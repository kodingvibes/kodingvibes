/**
 * Script para comprimir imágenes existentes en el bucket de Supabase.
 *
 * Itera TODAS las carpetas del bucket (posts/, avatars/, banners/, groups/...),
 * pagina resultados, descarga cada archivo, lo recomprime con sharp
 * (max 1920px ancho, WebP/JPEG/PNG según convenga) y lo reemplaza
 * si el ahorro es > 5%.
 *
 * Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local
 * Uso: node scripts/compress-existing-images.js
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
const MAX_WIDTH = 1920
const QUALITY = 80
const SAVINGS_THRESHOLD = 5
const PAGE_SIZE = 100
const TEMP_DIR = path.join(__dirname, '../.temp-images')

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function compressImage(buffer, filename) {
  const ext = path.extname(filename).toLowerCase()

  if (ext === '.gif') return buffer

  let s = sharp(buffer).resize(MAX_WIDTH, null, {
    withoutEnlargement: true,
    fit: 'inside',
  })

  if (ext === '.webp') {
    s = s.webp({ quality: QUALITY })
  } else if (ext === '.png') {
    const meta = await sharp(buffer).metadata()
    if (meta.hasAlpha) {
      s = s.png({ quality: QUALITY, compressionLevel: 9 })
    } else {
      s = s.webp({ quality: QUALITY })
    }
  } else {
    s = s.jpeg({ quality: QUALITY, progressive: true })
  }

  return s.toBuffer()
}

async function listAllFiles(prefix) {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      console.error(`  Error listando ${prefix || 'raiz'}:`, error.message)
      return files
    }
    if (!data || data.length === 0) break

    for (const item of data) {
      const fullName = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        const nested = await listAllFiles(fullName)
        files.push(...nested)
      } else {
        files.push(fullName)
      }
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

  if (downloadError || !downloadData) {
    return { success: false, error: downloadError?.message || 'download null' }
  }

  const originalBuffer = Buffer.from(await downloadData.arrayBuffer())
  const originalSize = originalBuffer.length

  const compressedBuffer = await compressImage(originalBuffer, filename)
  const compressedSize = compressedBuffer.length
  const savings = originalSize === 0 ? 0 : ((originalSize - compressedSize) / originalSize) * 100

  if (savings < SAVINGS_THRESHOLD) {
    return { success: true, skipped: true, originalSize, compressedSize }
  }

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filename])

  if (deleteError) {
    return { success: false, error: `delete: ${deleteError.message}` }
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, compressedBuffer, {
      contentType: downloadData.type,
      upsert: true,
    })

  if (uploadError) {
    // intento restaurar el original si el upload falla
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, originalBuffer, { contentType: downloadData.type, upsert: true })
    return { success: false, error: `upload: ${uploadError.message}` }
  }

  return { success: true, originalSize, compressedSize, savings }
}

async function main() {
  console.log('Comprimiendo imagenes del bucket', BUCKET_NAME)

  await fs.mkdir(TEMP_DIR, { recursive: true })

  const files = await listAllFiles('')
  console.log(`Encontrados ${files.length} archivos\n`)

  const stats = { total: files.length, processed: 0, skipped: 0, failed: 0, original: 0, compressed: 0 }

  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    process.stdout.write(`[${i + 1}/${files.length}] ${filename} ... `)

    const r = await processFile(filename)

    if (!r.success) {
      stats.failed++
      console.log(`FAIL (${r.error})`)
      continue
    }

    stats.processed++
    if (r.skipped) {
      stats.skipped++
      console.log(`skip (${formatBytes(r.originalSize)} -> ${formatBytes(r.compressedSize)})`)
      continue
    }

    stats.original += r.originalSize
    stats.compressed += r.compressedSize
    console.log(`${formatBytes(r.originalSize)} -> ${formatBytes(r.compressedSize)} (-${r.savings.toFixed(1)}%)`)

    await new Promise((res) => setTimeout(res, 200))
  }

  console.log('\n' + '='.repeat(60))
  console.log('RESUMEN')
  console.log('='.repeat(60))
  console.log(`Total: ${stats.total}`)
  console.log(`Procesados: ${stats.processed}`)
  console.log(`Omitidos (<5% ahorro): ${stats.skipped}`)
  console.log(`Fallidos: ${stats.failed}`)

  if (stats.original > 0) {
    const saved = stats.original - stats.compressed
    const pct = ((saved / stats.original) * 100).toFixed(2)
    console.log(`\nOriginal: ${formatBytes(stats.original)}`)
    console.log(`Comprimido: ${formatBytes(stats.compressed)}`)
    console.log(`Ahorro: ${formatBytes(saved)} (${pct}%)`)
  }

  await fs.rm(TEMP_DIR, { recursive: true, force: true })
}

try { require.resolve('sharp') } catch { console.error('Instala sharp: npm i sharp'); process.exit(1) }
try { require.resolve('dotenv') } catch { console.error('Instala dotenv: npm i dotenv'); process.exit(1) }

main().catch((e) => { console.error(e); process.exit(1) })
