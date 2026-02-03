const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG del logo de KodingVibes
const svg192 = `<svg width="192" height="192" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="8" fill="url(#bg)"/>
  <circle cx="20" cy="20" r="16" stroke="white" stroke-width="2" fill="none"/>
  <path d="M14 14L10 20L14 26" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M26 14L30 20L26 26" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 28L22 12" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

const svg512 = `<svg width="512" height="512" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="8" fill="url(#bg)"/>
  <circle cx="20" cy="20" r="16" stroke="white" stroke-width="2" fill="none"/>
  <path d="M14 14L10 20L14 26" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M26 14L30 20L26 26" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 28L22 12" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  try {
    // Generar icon-192x192.png
    await sharp(Buffer.from(svg192))
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('✓ Generado icon-192x192.png');

    // Generar icon-512x512.png
    await sharp(Buffer.from(svg512))
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('✓ Generado icon-512x512.png');

    console.log('\n✅ Iconos PWA generados exitosamente');
  } catch (error) {
    console.error('❌ Error generando iconos:', error.message);
    process.exit(1);
  }
}

generateIcons();
