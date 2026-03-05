const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const JSZip = require('jszip')
const { v4: uuid } = require('uuid')

const execAsync = promisify(exec)
const TEMP_DIR = path.join(__dirname, '../../temp')

/**
 * Convert each page of a PDF to a PNG image.
 * Requires pdftoppm (poppler-utils) installed on the server.
 * @param {string} filePath
 * @param {number} dpi - Resolution (72 | 150 | 300)
 * @returns {Promise<Buffer>} ZIP of PNG images
 */
module.exports = async function pdfToPng(filePath, dpi = 150) {
    const jobId = uuid()
    const outputPrefix = path.join(TEMP_DIR, `png_${jobId}`)

    try {
        // Use pdftoppm to convert PDF pages to PNG
        await execAsync(
            `pdftoppm -png -r ${dpi} "${filePath}" "${outputPrefix}"`,
            { timeout: 60000 }
        )

        const dir = TEMP_DIR
        const files = fs.readdirSync(dir)
            .filter(f => f.startsWith(`png_${jobId}`) && f.endsWith('.png'))
            .sort()

        if (files.length === 0) {
            throw new Error('No images were generated. The PDF may be empty or corrupted.')
        }

        const zip = new JSZip()
        const imagesFolder = zip.folder('pdf-pages')

        files.forEach((file, i) => {
            const imgPath = path.join(TEMP_DIR, file)
            const imgBytes = fs.readFileSync(imgPath)
            imagesFolder.file(`page-${String(i + 1).padStart(3, '0')}.png`, imgBytes)
            try { fs.unlinkSync(imgPath) } catch { /* ignore */ }
        })

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 4 },
        })

        return zipBuffer
    } catch (err) {
        const dir = TEMP_DIR
        fs.readdirSync(dir)
            .filter(f => f.startsWith(`png_${jobId}`))
            .forEach(f => { try { fs.unlinkSync(path.join(dir, f)) } catch { } })

        if (err.message.includes('pdftoppm')) {
            throw new Error(
                'PDF to PNG conversion requires poppler-utils. ' +
                'Install with: apt-get install poppler-utils'
            )
        }
        throw err
    }
}
