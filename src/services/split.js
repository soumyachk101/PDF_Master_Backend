const { PDFDocument } = require('pdf-lib')
const fs = require('fs')
const JSZip = require('jszip')

/**
 * Split a PDF into multiple files.
 * @param {string} filePath
 * @param {{ splitMode: 'all' | 'range', pageRange?: string }} opts
 * @returns {Promise<Buffer>} ZIP archive containing the split PDFs
 */
module.exports = async function split(filePath, opts = {}) {
  const { splitMode = 'all', pageRange } = opts

  const bytes = fs.readFileSync(filePath)
  const srcDoc = await PDFDocument.load(bytes)
  const totalPages = srcDoc.getPageCount()

  if (totalPages < 2) {
    throw new Error('PDF must have at least 2 pages to split.')
  }

  // Parse which page indices to extract
  let pageIndices = []

  if (splitMode === 'all') {
    pageIndices = srcDoc.getPageIndices() // [0, 1, 2, ...]
  } else if (splitMode === 'range' && pageRange) {
    pageIndices = parsePageRange(pageRange, totalPages)
  } else {
    throw new Error('Invalid split configuration.')
  }

  const zip = new JSZip()

  if (splitMode === 'all') {
    // One PDF per page
    for (let i = 0; i < totalPages; i++) {
      const pageDoc = await PDFDocument.create()
      const [copied] = await pageDoc.copyPages(srcDoc, [i])
      pageDoc.addPage(copied)
      const pageBytes = await pageDoc.save()
      zip.file(`page-${String(i + 1).padStart(3, '0')}.pdf`, pageBytes)
    }
  } else {
    // One PDF with the selected pages
    const rangeDoc = await PDFDocument.create()
    const copied = await rangeDoc.copyPages(srcDoc, pageIndices)
    copied.forEach(p => rangeDoc.addPage(p))
    const rangeBytes = await rangeDoc.save()
    zip.file(`pages-${pageRange.replace(/\s/g, '')}.pdf`, rangeBytes)
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return zipBuffer
}

/**
 * Parse a page range string like "1-3, 5, 7-9" into 0-indexed page numbers.
 */
function parsePageRange(rangeStr, totalPages) {
  const indices = new Set()

  const parts = rangeStr.split(',').map(s => s.trim())
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10))
      if (isNaN(start) || isNaN(end)) continue
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= totalPages) indices.add(i - 1)
      }
    } else {
      const n = parseInt(part, 10)
      if (!isNaN(n) && n >= 1 && n <= totalPages) indices.add(n - 1)
    }
  }

  if (indices.size === 0) {
    throw new Error(`No valid pages found in range "${rangeStr}". PDF has ${totalPages} pages.`)
  }

  return [...indices].sort((a, b) => a - b)
}
