const { PDFDocument } = require('pdf-lib')
const fs = require('fs')

/**
 * Remove password protection from a PDF.
 * Uses qpdf if available, falls back to pdf-lib decryption.
 * @param {string} filePath
 * @param {string} password
 * @returns {Promise<Buffer>}
 */
module.exports = async function unlock(filePath, password) {
  if (!password) throw new Error('Password is required to unlock the PDF.')

  // Try pdf-lib with password
  const bytes = fs.readFileSync(filePath)
  let doc

  try {
    doc = await PDFDocument.load(bytes, {
      password,
      ignoreEncryption: false,
    })
  } catch (err) {
    if (err.message?.toLowerCase().includes('password')) {
      throw new Error('Incorrect password. Please check and try again.')
    }
    // Try with qpdf
    try {
      const qpdf = require('node-qpdf2')
      const decryptedBytes = await qpdf.decrypt(filePath, password)
      return Buffer.from(decryptedBytes)
    } catch {
      throw new Error('Could not unlock this PDF. The password may be incorrect.')
    }
  }

  // Re-save without encryption
  const result = await doc.save()
  return Buffer.from(result)
}
