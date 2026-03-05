const { PDFDocument, degrees } = require('pdf-lib')
const fs = require('fs')

/**
 * Rotate all pages in a PDF.
 * @param {string} filePath
 * @param {90 | 180 | 270} deg - Rotation in degrees (clockwise)
 * @returns {Promise<Buffer>}
 */
module.exports = async function rotate(filePath, deg = 90) {
  const validDegrees = [90, 180, 270]
  if (!validDegrees.includes(Number(deg))) {
    throw new Error(`Invalid rotation. Must be one of: ${validDegrees.join(', ')}`)
  }

  const bytes = fs.readFileSync(filePath)
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  pages.forEach(page => {
    const currentRotation = page.getRotation().angle
    const newRotation = (currentRotation + Number(deg)) % 360
    page.setRotation(degrees(newRotation))
  })

  const rotated = await doc.save()
  return Buffer.from(rotated)
}
