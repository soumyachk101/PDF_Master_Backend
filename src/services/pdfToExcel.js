const fs = require('fs')
const pdf = require('pdf-parse')
const ExcelJS = require('exceljs')

/**
 * Extract text from a PDF and write it to an XLSX file.
 * Each line of text becomes a row in column A.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
module.exports = async function pdfToExcel(filePath) {
    // 1. Extract text
    const dataBuffer = fs.readFileSync(filePath)
    const pdfData = await pdf(dataBuffer)
    const lines = pdfData.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)

    // 2. Build workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'PDFKit'
    const worksheet = workbook.addWorksheet('Extracted Data')

    // Header
    worksheet.getCell('A1').value = 'Extracted Text'
    worksheet.getCell('A1').font = { bold: true, size: 12 }
    worksheet.getColumn('A').width = 100

    // Data rows
    lines.forEach((line, i) => {
        worksheet.getCell(`A${i + 2}`).value = line
    })

    // Return as buffer
    const buf = await workbook.xlsx.writeBuffer()
    return buf
}
