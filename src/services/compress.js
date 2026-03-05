const { PDFDocument } = require('pdf-lib')
const fs = require('fs')
const { exec } = require('child_process')
const util = require('util')
const execAsync = util.promisify(exec)

/**
 * Compress a PDF file using Ghostscript for deep image downsampling.
 * Falls back to pdf-lib's object stream optimization if Ghostscript is not installed.
 * @param {string} filePath
 * @param {'low' | 'medium' | 'high'} quality
 * @returns {Promise<Buffer>}
 */
module.exports = async function compress(filePath, quality = 'medium') {
  const outPath = filePath + '_compressed.pdf'

  // Map our UI quality setting to Ghostscript pdfsettings
  // 'low' compression = higher file size (printer)
  // 'medium' compression = medium file size (ebook)
  // 'high' compression = lower file size, lower quality (screen)
  let pdfSettings = '/ebook'
  if (quality === 'high') pdfSettings = '/screen'
  else if (quality === 'low') pdfSettings = '/printer'

  try {
    // Use gswin64c on Windows, gs on Linux/Mac
    const gsCmd = process.platform === 'win32' ? 'gswin64c' : 'gs'

    // Execute Ghostscript to deeply compress images in the PDF
    const cmd = `${gsCmd} -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outPath}" "${filePath}"`

    await execAsync(cmd)

    if (fs.existsSync(outPath)) {
      const buffer = fs.readFileSync(outPath)
      fs.unlinkSync(outPath) // cleanup temp file
      return buffer
    }
  } catch (err) {
    console.log('[Compress] Ghostscript failed or not installed, falling back to pdf-lib.')
  }

  // --- FALLBACK to pdf-lib ---
  // This will simply optimize object streams and strip metadata
  const bytes = fs.readFileSync(filePath)
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })

  // Strip metadata to reduce size
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('PDFKit')
  doc.setCreator('PDFKit')

  const saveOptions = {
    useObjectStreams: true,   // Cross-reference stream compression (best native compression)
    addDefaultPage: false,
    objectsPerTick: quality === 'high' ? 50 : quality === 'medium' ? 20 : 5,
  }

  // Attempt to remove embedded thumbnails for 'high' compression
  if (quality === 'high') {
    try {
      const pages = doc.getPages()
      pages.forEach(page => {
        const dict = page.node
        if (dict.has('Thumb')) dict.delete('Thumb')
      })
    } catch { /* non-critical */ }
  }

  const compressed = await doc.save(saveOptions)
  return Buffer.from(compressed)
}
