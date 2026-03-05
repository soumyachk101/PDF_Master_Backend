const fs = require('fs')
const pdf = require('pdf-parse')

/**
 * Extract all text from a PDF and return as a plain .txt Buffer.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function pdfToText(filePath) {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    return Buffer.from(data.text, 'utf-8')
}
