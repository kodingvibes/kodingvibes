/**
 * Catch-all cleanup script.
 *
 * 1) Re-compresses the two big PNGs left over from compress-existing-images.js
 *    that stayed over 1MB because they have alpha (the previous script kept
 *    them as PNG). This pass forces a WebP conversion with alpha + reduces
 *    dimensions to 1280px max.
 *
 * 2) Downloads every users.avatar_url that points at googleusercontent.com
 *    (Google OAuth avatars), recompresses to WebP @ 512px, uploads to the
 *    bucket under avatars/<userId>/, and rewrites users.avatar_url.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Usage:    node scripts/compress-remaining.js
 */

const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs').promises

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const BUCKET = 'images'

function formatBytes(b) {
  if (b === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return Math.round((b / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

async function reProcessBigPngs() {
  const targets = [
    'posts/1770046220547-m9mmf.png',
    'posts/1772291804970-pn6x1v.png',
  ]
  console.log('--- Re-procesando PNGs grandes ---')
  for (const path of targets) {
    const { data: dl, error } = await supabase.storage.from(BUCKET).download(path)
    if (error || !dl) {
      console.log(`  ${path}: skip (${error?.message || 'no existe, ya convertido'})`)
      continue
    }
    const buf = Buffer.from(await dl.arrayBuffer())
    const before = buf.length
    const newBuf = await sharp(buf)
      .resize(1280, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 75, effort: 4 })
      .toBuffer()
    const newName = path.replace(/\.png$/, '.webp')
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(newName, newBuf, { contentType: 'image/webp', upsert: true })
    if (upErr) {
      console.log(`  ${path}: upload error ${upErr.message}`)
      continue
    }
    if (newName !== path) {
      await supabase.storage.from(BUCKET).remove([path])
    }
    // Update DB rows referencing the old .png url, if any
    const { data: rows } = await supabase
      .from('posts')
      .select('id, image_url')
      .like('image_url', `%${path.split('/').pop()}`)
    for (const r of rows || []) {
      const newUrl = r.image_url.replace(/\.png$/, '.webp')
      await supabase.from('posts').update({ image_url: newUrl }).eq('id', r.id)
    }
    console.log(`  ${path}: ${formatBytes(before)} -> ${formatBytes(newBuf.length)} (-${Math.round((1 - newBuf.length / before) * 100)}%) [-> ${newName}]`)
  }
}

async function migrateGoogleAvatars() {
  console.log('\n--- Migrando avatares de Google ---')

  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .or('avatar_url.ilike.%googleusercontent%,avatar_url.ilike.%googleapis%')

  if (error) {
    console.error('  query error:', error.message)
    return
  }
  if (!users || users.length === 0) {
    console.log('  no hay avatares de Google')
    return
  }
  console.log(`  ${users.length} avatares a migrar`)

  for (const u of users) {
    let lastErr = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(u.avatar_url, {
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
        })
        if (!r.ok) {
          lastErr = `HTTP ${r.status}`
          await new Promise((res) => setTimeout(res, 1000 * attempt))
          continue
        }
        const ab = await r.arrayBuffer()
        const buf = Buffer.from(ab)
        const out = await sharp(buf)
          .resize(512, 512, { withoutEnlargement: true, fit: 'cover' })
          .webp({ quality: 80, effort: 4 })
          .toBuffer()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`
        const filePath = `avatars/${u.id}/${fileName}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, out, { contentType: 'image/webp', upsert: false })
        if (upErr) {
          lastErr = `upload: ${upErr.message}`
          await new Promise((res) => setTimeout(res, 1000 * attempt))
          continue
        }
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
        const { error: upDbErr } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl })
          .eq('id', u.id)
        if (upDbErr) {
          lastErr = `db: ${upDbErr.message}`
          await new Promise((res) => setTimeout(res, 1000 * attempt))
          continue
        }
        console.log(`  ${u.username}: ${formatBytes(buf.length)} -> ${formatBytes(out.length)}`)
        lastErr = null
        break
      } catch (e) {
        lastErr = e.message
        await new Promise((res) => setTimeout(res, 1000 * attempt))
      }
    }
    if (lastErr) console.log(`  ${u.username}: FAIL (${lastErr})`)
    await new Promise((res) => setTimeout(res, 800))
  }
}

async function main() {
  await reProcessBigPngs()
  await migrateGoogleAvatars()
  console.log('\nListo.')
}

main().catch((e) => { console.error(e); process.exit(1) })
