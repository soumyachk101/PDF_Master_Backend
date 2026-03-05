const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const { v4: uuid } = require('uuid')

const execAsync = promisify(exec)
const { TEMP_DIR } = require('../config/paths')

/**
 * Convert an Excel (.xlsx/.xls) file to PDF using LibreOffice.
 * LibreOffice must be installed on server.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function excelToPdf(filePath) {
    const ext = path.extname(filePath)
    const basename = path.basename(filePath, ext)

    try {
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
            throw new Error('Excel to PDF requires LibreOffice. Install with: apt-get install libreoffice')
        }
        throw err
    }
}
