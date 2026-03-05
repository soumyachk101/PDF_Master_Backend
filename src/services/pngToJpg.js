const sharp = require('sharp')
const archiver = require('archiver')

/**
 * Convert PNG images to JPG using sharp.
 * @param {string[]} filePaths
 * @param {number} quality - JPEG quality 1-100
 * @returns {Promise<Buffer>} ZIP containing all converted JPGs
 */
module.exports = async function pngToJpg(filePaths, quality = 90) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } })
        const chunks = []

        archive.on('data', chunk => chunks.push(chunk))
        archive.on('end', () => resolve(Buffer.concat(chunks)))
        archive.on('error', reject)

        const conversions = filePaths.map(async (filePath, i) => {
            const jpgBuf = await sharp(filePath)
                .flatten({ background: { r: 255, g: 255, b: 255 } }) // Fill transparency with white
                .jpeg({ quality })
                .toBuffer()
            const filename = `image-${String(i + 1).padStart(3, '0')}.jpg`
            archive.append(jpgBuf, { name: filename })
        })

        Promise.all(conversions)
            .then(() => archive.finalize())
            .catch(reject)
    })
}
