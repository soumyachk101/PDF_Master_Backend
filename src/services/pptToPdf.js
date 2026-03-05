const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const { v4: uuid } = require('uuid')

const execAsync = promisify(exec)
const { TEMP_DIR } = require('../config/paths')

/**
 * Convert a PPT/PPTX file to PDF using LibreOffice.
 * LibreOffice must be installed on server.
 * Install: apt-get install libreoffice (Ubuntu/Debian)
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function pptToPdf(filePath) {
    const ext = path.extname(filePath)
    const basename = path.basename(filePath, ext)

    try {
        // LibreOffice converts to PDF in the same directory as the input
        await execAsync(
            `libreoffice --headless --convert-to pdf "${filePath}" --outdir "${TEMP_DIR}"`,
            { timeout: 120000 }
        )

        const outputPath = path.join(TEMP_DIR, `${basename}.pdf`)

        if (!fs.existsSync(outputPath)) {
            throw new Error('Conversion failed. LibreOffice did not produce output.')
        }

        const buffer = fs.readFileSync(outputPath)
        try { fs.unlinkSync(outputPath) } catch { }
        return buffer
    } catch (err) {
        if (err.message.includes('libreoffice')) {
            throw new Error('PPT to PDF requires LibreOffice. Install with: apt-get install libreoffice')
        }
        throw err
    }
}
