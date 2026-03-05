const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const os = require('os')
const { promisify } = require('util')
const { v4: uuid } = require('uuid')
const PptxGenJS = require('pptxgenjs')
const JSZip = require('jszip')

const execAsync = promisify(exec)
const TEMP_DIR = path.join(__dirname, '../../temp')

/**
 * Convert a PDF to a PPTX file.
 * Strategy: convert each page to a PNG image, then embed as slides.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function pdfToPpt(filePath) {
    const jobId = uuid()
    const outputPrefix = path.join(TEMP_DIR, `ppt_${jobId}`)

    try {
        // Convert PDF pages to PNG images at medium quality
        await execAsync(
            `pdftoppm -png -r 150 "${filePath}" "${outputPrefix}"`,
            { timeout: 120000 }
        )

        const files = fs.readdirSync(TEMP_DIR)
            .filter(f => f.startsWith(`ppt_${jobId}`) && f.endsWith('.png'))
            .sort()

        if (files.length === 0) {
            throw new Error('Could not extract pages from PDF.')
        }

        // Build a PPTX with one image slide per page
        const pptx = new PptxGenJS()
        pptx.layout = 'LAYOUT_WIDE' // 16:9

        for (const file of files) {
            const imgPath = path.join(TEMP_DIR, file)
            const imgData = fs.readFileSync(imgPath).toString('base64')
            const slide = pptx.addSlide()
            slide.addImage({
                data: `image/png;base64,${imgData}`,
                x: 0, y: 0,
                w: '100%', h: '100%',
            })
            try { fs.unlinkSync(imgPath) } catch { }
        }

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' })
        return pptxBuffer
    } catch (err) {
        // Cleanup partial files
        fs.readdirSync(TEMP_DIR)
            .filter(f => f.startsWith(`ppt_${jobId}`))
            .forEach(f => { try { fs.unlinkSync(path.join(TEMP_DIR, f)) } catch { } })
        throw err
    }
}
