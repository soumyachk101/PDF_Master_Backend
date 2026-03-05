const fs = require('fs')
const path = require('path')
const { TEMP_DIR } = require('../config/paths')

/**
 * Convert a PPT/PPTX file to PDF using LibreOffice or ConvertAPI fallback.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function pptToPdf(filePath) {
    const ext = path.extname(filePath)
    const basename = path.basename(filePath, ext)

    try {
        // Try LibreOffice headless conversion (only if not on Vercel)
        if (!process.env.VERCEL) {
            const { exec } = require('child_process')
            const { promisify } = require('util')
            const execAsync = promisify(exec)

            await execAsync(
                `libreoffice --headless --convert-to pdf "${filePath}" --outdir "${TEMP_DIR}"`,
                { timeout: 120000 }
            )

            const outputPath = path.join(TEMP_DIR, `${basename}.pdf`)

            if (fs.existsSync(outputPath)) {
                const buffer = fs.readFileSync(outputPath)
                try { fs.unlinkSync(outputPath) } catch { }
                return buffer
            }
        }

        // Fallback: Use ConvertAPI if VERCEL or LibreOffice fails
        if (process.env.CONVERT_API_SECRET) {
            console.log('[pptToPdf] Using ConvertAPI fallback')
            const axios = require('axios')
            const formData = new (require('form-data'))()
            formData.append('File', fs.createReadStream(filePath))

            const response = await axios.post(
                `https://v2.convertapi.com/convert/ppt/to/pdf?Secret=${process.env.CONVERT_API_SECRET}`,
                formData,
                {
                    headers: formData.getHeaders(),
                    responseType: 'arraybuffer'
                }
            )
            return Buffer.from(response.data)
        }

        throw new Error('PPT to PDF conversion failed. On Vercel, please provide CONVERT_API_SECRET.')
    } catch (err) {
        console.error('[pptToPdf] Error:', err.message)
        throw err
    }
}
