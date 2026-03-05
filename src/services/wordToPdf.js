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
    // Try LibreOffice headless conversion (only if not on Vercel)
    if (!process.env.VERCEL) {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      await execAsync(
        `libreoffice --headless --convert-to pdf --outdir "${TEMP_DIR}" "${filePath}"`,
        { timeout: 60000 }
      )

      const baseName = path.basename(filePath, path.extname(filePath))
      const outputPath = path.join(TEMP_DIR, `${baseName}.pdf`)

      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath)
        try { fs.unlinkSync(outputPath) } catch { }
        return buffer
      }
    }

    // Fallback: Use ConvertAPI if VERCEL or LibreOffice fails
    if (process.env.CONVERT_API_SECRET) {
      console.log('[wordToPdf] Using ConvertAPI fallback')
      const axios = require('axios')
      const formData = new (require('form-data'))()
      formData.append('File', fs.createReadStream(filePath))

      const response = await axios.post(
        `https://v2.convertapi.com/convert/doc/to/pdf?Secret=${process.env.CONVERT_API_SECRET}`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer'
        }
      )
      return Buffer.from(response.data)
    }

    // Last resort fallback: Try libreoffice-convert npm package
    const libreConvert = require('libreoffice-convert')
    const { promisify } = require('util')
    const convertAsync = promisify(libreConvert.convert)
    const docBytes = fs.readFileSync(filePath)
    const pdfBytes = await convertAsync(docBytes, '.pdf', undefined)
    return Buffer.from(pdfBytes)
  } catch (err) {
    console.error('[wordToPdf] Error:', err.message)
    throw new Error(
      'Word to PDF conversion failed. On Vercel, please provide CONVERT_API_SECRET.'
    )
  }
}
