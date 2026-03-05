const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib')
const fs = require('fs')

/**
 * Add a text watermark to every page of a PDF.
 * @param {string} filePath
 * @param {{ text: string, opacity: number, position: string }} opts
 * @returns {Promise<Buffer>}
 */
module.exports = async function watermark(filePath, opts = {}) {
  const { text = 'CONFIDENTIAL', opacity = 30, position = 'diagonal' } = opts

  if (!text.trim()) throw new Error('Watermark text cannot be empty.')

  const bytes = fs.readFileSync(filePath)
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()

  const opacityDecimal = Math.min(1, Math.max(0, opacity / 100))

  pages.forEach(page => {
    const { width, height } = page.getSize()

    // Scale font size relative to page width
    const fontSize = Math.max(20, Math.min(80, width * 0.07))
    const textWidth = font.widthOfTextAtSize(text, fontSize)

    let x, y, rotate

    switch (position) {
      case 'diagonal':
        x = (width - textWidth * Math.cos(Math.PI / 4)) / 2
        y = height / 2
        rotate = degrees(45)
        break
      case 'center':
        x = (width - textWidth) / 2
        y = height / 2 - fontSize / 2
        rotate = degrees(0)
        break
      case 'top':
        x = (width - textWidth) / 2
        y = height - fontSize * 2
        rotate = degrees(0)
        break
      case 'bottom':
        x = (width - textWidth) / 2
        y = fontSize
        rotate = degrees(0)
        break
      default:
        x = (width - textWidth) / 2
        y = height / 2
        rotate = degrees(45)
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: opacityDecimal,
      rotate,
    })
  })

  const result = await doc.save()
  return Buffer.from(result)
}
