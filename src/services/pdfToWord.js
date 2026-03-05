const fs = require('fs')
const path = require('path')
const { PDFDocument } = require('pdf-lib')
const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx')

/**
 * Convert a PDF to a DOCX file.
 * 
 * NOTE: Accurate PDF→Word conversion requires OCR or PDF parsing libraries.
 * This implementation extracts text content using pdf-lib and creates a
 * structured DOCX. For production-grade conversion, use an API service
 * like Adobe PDF Services, or run LibreOffice headlessly.
 * 
 * @param {string} filePath
 * @returns {Promise<Buffer>} DOCX file as Buffer
 */
module.exports = async function pdfToWord(filePath) {
  const bytes = fs.readFileSync(filePath)
  
  // Try pdf-parse for text extraction
  let pages = []
  try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(bytes)
    // Split by page
    pages = data.text
      .split(/\f/)
      .map(p => p.trim())
      .filter(Boolean)
  } catch {
    pages = ['[PDF text extraction requires pdf-parse library.\n\nInstall with: npm install pdf-parse]']
  }

  // Build DOCX
  const docPages = pages.map((pageText, i) => {
    const lines = pageText.split('\n').filter(l => l.trim())
    const paragraphs = []

    if (pages.length > 1) {
      paragraphs.push(
        new Paragraph({
          text: `Page ${i + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      )
    }

    lines.forEach(line => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24,         // 12pt
              font: 'Calibri',
            }),
          ],
          spacing: { after: 120 },
        })
      )
    })

    return paragraphs
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Converted from PDF',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),
          ...docPages.flat(),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}
