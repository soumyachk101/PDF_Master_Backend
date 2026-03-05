const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')

/**
 * Convert a DOCX/DOC file to PDF.
 * 
 * Requires LibreOffice to be installed for headless conversion.
 * Install: apt-get install libreoffice (Ubuntu/Debian)
 *          brew install libreoffice (macOS, via Cask)
 * 
 * @param {string} filePath - Path to .doc or .docx file
 * @returns {Promise<Buffer>} PDF as Buffer
 */
module.exports = async function wordToPdf(filePath) {
  const { TEMP_DIR } = require('../config/paths')

  try {
    // Try LibreOffice headless conversion
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    await execAsync(
      `libreoffice --headless --convert-to pdf --outdir "${TEMP_DIR}" "${filePath}"`,
      { timeout: 60000 }
    )

    // Find the generated PDF
    const baseName = path.basename(filePath, path.extname(filePath))
    const outputPath = path.join(TEMP_DIR, `${baseName}.pdf`)

    if (!fs.existsSync(outputPath)) {
      throw new Error('LibreOffice did not produce a PDF output.')
    }

    const buffer = fs.readFileSync(outputPath)
    // Cleanup the intermediate PDF
    try { fs.unlinkSync(outputPath) } catch { }
    return buffer
  } catch (err) {
    if (err.message.includes('libreoffice') || err.message.includes('not found')) {
      // Fallback: Try libreoffice-convert npm package
      try {
        const libreConvert = require('libreoffice-convert')
        const { promisify } = require('util')
        const convertAsync = promisify(libreConvert.convert)
        const docBytes = fs.readFileSync(filePath)
        const pdfBytes = await convertAsync(docBytes, '.pdf', undefined)
        return Buffer.from(pdfBytes)
      } catch (e2) {
        throw new Error(
          'Word to PDF conversion requires LibreOffice. ' +
          'Install with: apt-get install libreoffice'
        )
      }
    }
    throw err
  }
}
