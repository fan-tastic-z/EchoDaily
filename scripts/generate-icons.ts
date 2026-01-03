/**
 * Generate PNG icons from SVG for Tauri
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { renderAsync } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const publicDir = join(rootDir, 'public')
const iconsDir = join(rootDir, 'src-tauri', 'icons')

// Icon sizes to generate
const iconSizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 1024 },
]

// Windows Store logo sizes
const squareSizes = [
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
]

async function generateIcon(svgPath, outputPath, size) {
  try {
    // Read SVG
    const svg = readFileSync(svgPath, 'utf-8')

    // Render SVG to PNG
    const img = await renderAsync(svg, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    })

    // RenderedImage has asPng() method that returns Uint8Array
    const pngData = img.asPng()

    // Write to file
    writeFileSync(outputPath, pngData)

    console.log(`✓ Generated ${outputPath}`)
  } catch (error) {
    console.error(`✗ Error generating ${outputPath}:`, error.message)
    if (error.stack) console.error(error.stack)
  }
}

async function generateICO() {
  try {
    const svgPath = join(publicDir, 'app-icon-simple.svg')
    const svg = readFileSync(svgPath, 'utf-8')
    const img = await renderAsync(svg, {
      fitTo: { mode: 'width', value: 256 },
    })

    // Write as .ico (PNG format)
    const icoPath = join(iconsDir, 'icon.ico')
    writeFileSync(icoPath, img.asPng())

    console.log(`✓ Generated ${icoPath}`)
  } catch (error) {
    console.error(`✗ Error generating ICO:`, error.message)
  }
}

async function generateICNS() {
  // For ICNS (macOS), we'd need iconutil or a specialized library
  // For now, we'll create a high-res PNG that can be converted manually
  const icnsPngPath = join(iconsDir, 'icon_512x512.png')
  await generateIcon(join(publicDir, 'app-icon-simple.svg'), icnsPngPath, 512)

  console.log('\n📝 Note: To create icon.icns for macOS, run:')
  console.log(`   mkdir -p icon.iconset && cp ${iconsDir}/icon_*.png icon.iconset/`)
  console.log('   iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns')
}

async function main() {
  console.log('🎨 Generating Echo Daily icons...\n')

  // Ensure icons directory exists
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }

  const svgSource = join(publicDir, 'app-icon-simple.svg')

  // Generate standard icon sizes
  console.log('📦 Standard icons:')
  for (const { name, size } of iconSizes) {
    await generateIcon(svgSource, join(iconsDir, name), size)
  }

  // Generate Windows Store logos
  console.log('\n📦 Windows Store logos:')
  for (const { name, size } of squareSizes) {
    await generateIcon(svgSource, join(iconsDir, name), size)
  }

  // Generate ICO
  console.log('\n📦 ICO file:')
  await generateICO()

  // Generate ICNS placeholder
  console.log('\n📦 ICNS preparation:')
  await generateICNS()

  console.log('\n✨ Icon generation complete!')
  console.log('\n📁 Icons generated in: src-tauri/icons/')
}

main().catch(console.error)
