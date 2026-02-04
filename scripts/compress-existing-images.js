/**
 * Script para comprimir imágenes existentes en el bucket de Supabase
 * 
 * Este script:
 * 1. Lista todas las imágenes del bucket
 * 2. Descarga cada imagen
 * 3. La comprime usando sharp
 * 4. Reemplaza la imagen original con la versión comprimida
 * 
 * Uso: node scripts/compress-existing-images.js
 */

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'images';
const MAX_WIDTH = 1920;
const QUALITY = 80; // Calidad de compresión (0-100)
const TEMP_DIR = path.join(__dirname, '../.temp-images');

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creando directorio temporal:', error);
  }
}

async function cleanupTempDir() {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error('Error limpiando directorio temporal:', error);
  }
}

async function compressImage(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  let sharpInstance = sharp(buffer)
    .resize(MAX_WIDTH, null, {
      width: MAX_WIDTH,
      withoutEnlargement: true,
      fit: 'inside'
    });

  // Convertir a WebP para mejor compresión
  if (ext === '.webp') {
    sharpInstance = sharpInstance.webp({ quality: QUALITY });
  } else if (ext === '.png') {
    // Mantener PNG si tiene transparencia, sino convertir a WebP
    const metadata = await sharp(buffer).metadata();
    if (metadata.hasAlpha) {
      sharpInstance = sharpInstance.png({ quality: QUALITY, compressionLevel: 9 });
    } else {
      sharpInstance = sharpInstance.webp({ quality: QUALITY });
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality: QUALITY, progressive: true });
  } else if (ext === '.gif') {
    // GIFs se mantienen como están (sharp no soporta bien GIFs animados)
    return buffer;
  }

  return await sharpInstance.toBuffer();
}

async function getFileSize(buffer) {
  return buffer.length;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function processImage(file) {
  const filename = file.name;
  console.log(`\n📸 Procesando: ${filename}`);

  try {
    // Descargar la imagen original
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filename);

    if (downloadError) {
      console.error(`  ❌ Error descargando ${filename}:`, downloadError.message);
      return { success: false, error: downloadError.message };
    }

    const originalBuffer = Buffer.from(await downloadData.arrayBuffer());
    const originalSize = getFileSize(originalBuffer);
    console.log(`  📦 Tamaño original: ${formatBytes(originalSize)}`);

    // Comprimir la imagen
    const compressedBuffer = await compressImage(originalBuffer, filename);
    const compressedSize = getFileSize(compressedBuffer);
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    console.log(`  📦 Tamaño comprimido: ${formatBytes(compressedSize)}`);
    console.log(`  💾 Ahorro: ${savings}%`);

    // Solo actualizar si hay ahorro significativo (más del 5%)
    if (parseFloat(savings) < 5) {
      console.log(`  ⏭️  Ahorro insignificante, omitiendo actualización`);
      return { success: true, skipped: true, originalSize, compressedSize };
    }

    // Guardar temporalmente
    const tempPath = path.join(TEMP_DIR, path.basename(filename));
    await fs.writeFile(tempPath, compressedBuffer);

    // Eliminar la imagen original
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filename]);

    if (deleteError) {
      console.error(`  ❌ Error eliminando original:`, deleteError.message);
      return { success: false, error: deleteError.message };
    }

    // Subir la versión comprimida
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, compressedBuffer, {
        contentType: downloadData.type,
        upsert: true
      });

    if (uploadError) {
      console.error(`  ❌ Error subiendo comprimida:`, uploadError.message);
      return { success: false, error: uploadError.message };
    }

    // Limpiar archivo temporal
    await fs.unlink(tempPath);

    console.log(`  ✅ Comprimida exitosamente`);
    return { success: true, originalSize, compressedSize, savings: parseFloat(savings) };

  } catch (error) {
    console.error(`  ❌ Error procesando ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando compresión de imágenes existentes...\n');

  await ensureTempDir();

  try {
    // Listar todos los archivos del bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('posts', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('❌ Error listando archivos:', listError);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.log('ℹ️  No se encontraron imágenes en el bucket');
      return;
    }

    console.log(`📊 Encontradas ${files.length} imágenes en el bucket\n`);

    let stats = {
      total: files.length,
      processed: 0,
      failed: 0,
      skipped: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0
    };

    // Procesar cada imagen
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = `posts/${file.name}`;

      console.log(`[${i + 1}/${files.length}]`);

      const result = await processImage({ name: filename });

      if (result.success) {
        stats.processed++;
        if (result.skipped) {
          stats.skipped++;
        }
        if (result.originalSize && result.compressedSize) {
          stats.totalOriginalSize += result.originalSize;
          stats.totalCompressedSize += result.compressedSize;
        }
      } else {
        stats.failed++;
      }

      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE COMPRESIÓN');
    console.log('='.repeat(60));
    console.log(`Total de imágenes: ${stats.total}`);
    console.log(`Procesadas: ${stats.processed}`);
    console.log(`Omitidas (sin ahorro): ${stats.skipped}`);
    console.log(`Fallidas: ${stats.failed}`);
    console.log(`\nTamaño total original: ${formatBytes(stats.totalOriginalSize)}`);
    console.log(`Tamaño total comprimido: ${formatBytes(stats.totalCompressedSize)}`);
    
    if (stats.totalOriginalSize > 0) {
      const totalSavings = ((stats.totalOriginalSize - stats.totalCompressedSize) / stats.totalOriginalSize * 100).toFixed(2);
      const savedSpace = stats.totalOriginalSize - stats.totalCompressedSize;
      console.log(`\n💾 Ahorro total: ${formatBytes(savedSpace)} (${totalSavings}%)`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await cleanupTempDir();
  }
}

// Verificar que sharp esté instalado
try {
  require.resolve('sharp');
} catch (e) {
  console.error('❌ Sharp no está instalado. Ejecuta: npm install sharp');
  process.exit(1);
}

// Verificar que dotenv esté instalado
try {
  require.resolve('dotenv');
} catch (e) {
  console.error('❌ dotenv no está instalado. Ejecuta: npm install dotenv');
  process.exit(1);
}

// Ejecutar el script
main().catch(console.error);
