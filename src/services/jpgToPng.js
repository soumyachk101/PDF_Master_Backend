const sharp = require('sharp')
const archiver = require('archiver')
const stream = require('stream')
const fs = require('fs')

/**
 * Convert JPG/JPEG images to PNG using sharp.
 * @param {string[]} filePaths
 * @returns {Promise<Buffer>} ZIP containing all converted PNGs
 */
module.exports = async function jpgToPng(filePaths) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } })
        const chunks = []

        archive.on('data', chunk => chunks.push(chunk))
        archive.on('end', () => resolve(Buffer.concat(chunks)))
        archive.on('error', reject)

        const conversions = filePaths.map(async (filePath, i) => {
            const pngBuf = await sharp(filePath).png().toBuffer()
            const filename = `image-${String(i + 1).padStart(3, '0')}.png`
            archive.append(pngBuf, { name: filename })
        })

        Promise.all(conversions)
            .then(() => archive.finalize())
            .catch(reject)
    })
}
