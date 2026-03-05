const { PDFDocument } = require('pdf-lib')
const sharp = require('sharp')
const fs = require('fs')

const MARGIN_MAP = {
  none: 0,
  small: 20,
  big: 50,
}

/**
 * Convert one or more images (JPG/PNG) into a single PDF.
 * @param {string[]} filePaths - Array of image file paths
 * @param {{ orientation: 'portrait' | 'landscape', margin: 'none' | 'small' | 'big' }} opts
 * @returns {Promise<Buffer>}
 */
module.exports = async function jpgToPdf(filePaths, opts = {}) {
  const { orientation = 'portrait', margin = 'none' } = opts
  const marginPx = MARGIN_MAP[margin] ?? 0

  const doc = await PDFDocument.create()

  for (const imgPath of filePaths) {
    const ext = imgPath.slice(imgPath.lastIndexOf('.')).toLowerCase()

    // Normalize image to JPEG using sharp
    let imgBytes
    try {
      imgBytes = await sharp(imgPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency
        .jpeg({ quality: 90 })
        .toBuffer()
    } catch (err) {
      throw new Error(`Could not process image "${imgPath}": ${err.message}`)
    }

    const image = await doc.embedJpg(imgBytes)
    const { width: imgW, height: imgH } = image

    // Determine page dimensions
    let pageW, pageH
    if (orientation === 'landscape') {
      pageW = Math.max(imgW + marginPx * 2, 842) // A4 landscape width in points
      pageH = Math.min(imgH + marginPx * 2, 595) // A4 landscape height
    } else {
      pageW = Math.min(imgW + marginPx * 2, 595) // A4 portrait width
      pageH = Math.max(imgH + marginPx * 2, 842) // A4 portrait height
    }

    const page = doc.addPage([pageW, pageH])

    // Scale image to fit within page margins
    const maxW = pageW - marginPx * 2
    const maxH = pageH - marginPx * 2
    const scale = Math.min(maxW / imgW, maxH / imgH, 1)
    const drawW = imgW * scale
    const drawH = imgH * scale

    // Center the image
    const x = marginPx + (maxW - drawW) / 2
    const y = marginPx + (maxH - drawH) / 2

    page.drawImage(image, { x, y, width: drawW, height: drawH })
  }

  doc.setTitle('Images to PDF')
  doc.setCreator('PDFKit')
  doc.setCreationDate(new Date())

  const result = await doc.save()
  return Buffer.from(result)
}
