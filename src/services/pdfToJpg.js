const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const JSZip = require('jszip')
const { v4: uuid } = require('uuid')

const execAsync = promisify(exec)
const { TEMP_DIR } = require('../config/paths')

/**
 * Convert each page of a PDF to a JPG image.
 * Requires pdftoppm (poppler-utils) installed on the server.
 * Install: apt-get install poppler-utils (Ubuntu/Debian)
 *          brew install poppler (macOS)
 * 
 * @param {string} filePath
 * @param {number} dpi - Resolution (72 | 150 | 300)
 * @returns {Promise<Buffer>} ZIP of JPG images
 */
module.exports = async function pdfToJpg(filePath, dpi = 150) {
  const jobId = uuid()
  const outputPrefix = path.join(TEMP_DIR, `jpg_${jobId}`)

  try {
    // Use pdftoppm to convert PDF pages to images
    await execAsync(
      `pdftoppm -jpeg -r ${dpi} "${filePath}" "${outputPrefix}"`,
      { timeout: 60000 }
    )

    // Collect all generated JPG files
    const dir = TEMP_DIR
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith(`jpg_${jobId}`) && f.endsWith('.jpg'))
      .sort()

    if (files.length === 0) {
      throw new Error('No images were generated. The PDF may be empty or corrupted.')
    }

    // Zip all images
    const zip = new JSZip()
    const imagesFolder = zip.folder('pdf-pages')

    files.forEach((file, i) => {
      const imgPath = path.join(TEMP_DIR, file)
      const imgBytes = fs.readFileSync(imgPath)
      imagesFolder.file(`page-${String(i + 1).padStart(3, '0')}.jpg`, imgBytes)
      // Cleanup individual image files
      try { fs.unlinkSync(imgPath) } catch { /* ignore */ }
    })

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 4 },
    })

    return zipBuffer
  } catch (err) {
    // Cleanup any partial output files
    const dir = TEMP_DIR
    fs.readdirSync(dir)
      .filter(f => f.startsWith(`jpg_${jobId}`))
      .forEach(f => { try { fs.unlinkSync(path.join(dir, f)) } catch { } })

    if (err.message.includes('pdftoppm')) {
      throw new Error(
        'PDF to JPG conversion requires poppler-utils. ' +
        'Install with: apt-get install poppler-utils'
      )
    }
    throw err
  }
}
