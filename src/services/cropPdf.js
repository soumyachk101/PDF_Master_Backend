const { PDFDocument } = require('pdf-lib')
const fs = require('fs')

/**
 * Crop (trim margins from) all pages in a PDF by adjusting the MediaBox.
 * @param {string} filePath
 * @param {{ top: number, bottom: number, left: number, right: number }} margins - in points
 * @returns {Promise<Buffer>}
 */
module.exports = async function cropPdf(filePath, margins = {}) {
    const { top = 20, bottom = 20, left = 20, right = 20 } = margins
    const bytes = fs.readFileSync(filePath)
    const doc = await PDFDocument.load(bytes)

    const pages = doc.getPages()
    pages.forEach(page => {
        const { width, height } = page.getSize()
        // Trim the visible area
        page.setMediaBox(
            left,                // x (left crop)
            bottom,              // y (bottom crop)
            width - left - right, // new width
            height - top - bottom // new height
        )
        // Also update CropBox to match
        page.setCropBox(
            left,
            bottom,
            width - left - right,
            height - top - bottom
        )
    })

    const saved = await doc.save()
    return Buffer.from(saved)
}
