const { PDFDocument } = require('pdf-lib')
const fs = require('fs')

/**
 * Compress a PDF file using pdf-lib's object stream optimization.
 * For deep compression (image downsampling), Ghostscript would be needed.
 * @param {string} filePath
 * @param {'low' | 'medium' | 'high'} quality
 * @returns {Promise<Buffer>}
 */
module.exports = async function compress(filePath, quality = 'medium') {
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

  // For 'high' quality compression, we also remove embedded thumbnails
  if (quality === 'high') {
    try {
      const pages = doc.getPages()
      pages.forEach(page => {
        const dict = page.node
        // Attempt to remove thumbnail XObject if present
        if (dict.has('Thumb')) dict.delete('Thumb')
      })
    } catch { /* non-critical */ }
  }

  const compressed = await doc.save(saveOptions)
  return Buffer.from(compressed)
}
