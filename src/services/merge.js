const { PDFDocument } = require('pdf-lib')
const fs = require('fs')

/**
 * Merge multiple PDF files into one.
 * @param {string[]} filePaths - Array of absolute paths to PDF files
 * @returns {Promise<Buffer>} Merged PDF as a Buffer
 */
module.exports = async function merge(filePaths) {
  if (!filePaths || filePaths.length < 2) {
    throw new Error('At least 2 PDF files are required to merge.')
  }

  const merged = await PDFDocument.create()

  for (const filePath of filePaths) {
    const bytes = fs.readFileSync(filePath)
    let doc

    try {
      doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
    } catch (err) {
      throw new Error(`Could not read file "${filePath}": ${err.message}`)
    }

    const pageIndices = doc.getPageIndices()
    const copiedPages = await merged.copyPages(doc, pageIndices)
    copiedPages.forEach(page => merged.addPage(page))
  }

  merged.setTitle('Merged PDF')
  merged.setCreator('PDFKit')
  merged.setCreationDate(new Date())

  const bytes = await merged.save({ useObjectStreams: true })
  return Buffer.from(bytes)
}
