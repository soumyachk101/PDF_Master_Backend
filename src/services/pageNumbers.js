const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')
const fs = require('fs')

/**
 * Add page numbers to a PDF.
 * @param {string} filePath
 * @param {{ position: string, startNumber: number }} opts
 * @returns {Promise<Buffer>}
 */
module.exports = async function addPageNumbers(filePath, opts = {}) {
  const { position = 'bottom-center', startNumber = 1 } = opts

  const bytes = fs.readFileSync(filePath)
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length

  const fontSize = 11
  const margin = 28
  const color = rgb(0.3, 0.3, 0.3)

  pages.forEach((page, i) => {
    const { width, height } = page.getSize()
    const pageNum = startNumber + i
    const label = `${pageNum}`
    const textWidth = font.widthOfTextAtSize(label, fontSize)

    const [vAlign, hAlign] = position.split('-') // e.g. 'bottom-center'

    let x, y

    // Vertical position
    if (vAlign === 'top') {
      y = height - margin - fontSize
    } else {
      y = margin
    }

    // Horizontal position
    if (hAlign === 'left') {
      x = margin
    } else if (hAlign === 'right') {
      x = width - margin - textWidth
    } else {
      // center
      x = (width - textWidth) / 2
    }

    page.drawText(label, { x, y, size: fontSize, font, color })
  })

  const result = await doc.save()
  return Buffer.from(result)
}
