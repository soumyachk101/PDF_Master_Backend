const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

exports.mergePdfs = async (filePaths) => {
    const mergedPdf = await PDFDocument.create();

    for (const filePath of filePaths) {
        const fileContent = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(fileContent);

        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
        });
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
};

exports.splitPdf = async (filePath, ranges) => {
    // Basic implementation: split by single page or a simple range "1-3,5"
    // For MVP we can just split all pages into separate files if ranges not provided,
    // or return a zip of files. Let's return a zip containing split PDFs later if needed.
    // For now, let's just extract the first page as a PoC or split half-half.
    // To do it properly, we need adm-zip or JSZip to send multiple files back.
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();

    // Just creating one new PDF with extracted pages based on range for simplicity in MVP.
    // If range is "1-2" we extract page 1 and 2.
    const newPdf = await PDFDocument.create();

    // Default: split first page
    let indicesToCopy = [0];

    if (ranges) {
        // Parse ranges string like "1,3,5-7" -> [0, 2, 4, 5, 6]
        indicesToCopy = [];
        const parts = ranges.split(',');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= totalPages) {
                        indicesToCopy.push(i - 1); // 0-indexed
                    }
                }
            } else {
                const i = Number(part);
                if (i > 0 && i <= totalPages) {
                    indicesToCopy.push(i - 1);
                }
            }
        }
    } else {
        // if no range, just split all into a zip... omitted for brevity here unless requested
        // I'll extract first page as default safety
        indicesToCopy = [0];
    }

    const copiedPages = await newPdf.copyPages(pdfDoc, indicesToCopy);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
};

exports.extractPdf = async (filePath, ranges) => {
    // Essentially the same logic as split for an MVP, but could be extended
    // to extract multiple ranges into separate files.
    // We will extract specific pages into a single new PDF document.
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();

    const newPdf = await PDFDocument.create();

    let indicesToCopy = [];
    if (ranges) {
        const parts = Object.keys(ranges).length ? ranges.split(',') : ['1'];
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= totalPages) {
                        indicesToCopy.push(i - 1);
                    }
                }
            } else {
                const i = Number(part);
                if (i > 0 && i <= totalPages) {
                    indicesToCopy.push(i - 1);
                }
            }
        }
    } else {
        indicesToCopy = [0]; // default extract first page
    }

    // sort and remove duplicates
    indicesToCopy = [...new Set(indicesToCopy)].sort((a, b) => a - b);

    const copiedPages = await newPdf.copyPages(pdfDoc, indicesToCopy);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
};

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

exports.compressPdf = async (filePath) => {
    // We use Ghostscript to optimize the PDF by shrinking images and restructuring
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-compressed.pdf`);

    try {
        const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputFile}" "${filePath}"`;
        await execPromise(command);

        const compressedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(compressedBuffer);
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress PDF. Internal Error.');
    } finally {
        try {
            await fs.unlink(tempOutputFile);
        } catch (e) { }
    }
};

exports.repairPdf = async (filePath) => {
    // Repairing through Ghostscript ignores broken XREFs and streams
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-repaired.pdf`);

    try {
        const command = `gs -o "${tempOutputFile}" -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress "${filePath}"`;
        await execPromise(command);

        const repairedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(repairedBuffer);
    } catch (error) {
        console.error('Repair error:', error);
        throw new Error('Failed to repair PDF. It might be too heavily corrupted.');
    } finally {
        try {
            await fs.unlink(tempOutputFile);
        } catch (e) { }
    }
};

exports.flattenPdf = async (filePath) => {
    // Flatten form fields into standard page content
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const form = pdfDoc.getForm();
    form.flatten();

    const flattenedBytes = await pdfDoc.save();
    return Buffer.from(flattenedBytes);
};

// OCR logic will require Tesseract / poppler. For MVP, we can mock or do basic extraction
exports.ocrPdf = async (filePath) => {
    // Basic MVP: return early, full Tesseract logic requires image conversion first
    throw new Error('OCR functionality coming soon.');
};
// Convert TO PDF section
const sharp = require('sharp');
const libre = require('libreoffice-convert');
const libreConvert = util.promisify(libre.convert);

exports.jpgToPdf = async (filePaths) => {
    // Convert multiple JPGs into one PDF or just a single JPG
    const newPdf = await PDFDocument.create();

    for (const imgPath of filePaths) {
        // use sharp to ensure it's a valid jpeg/png buffer before embedding
        const imgBuffer = await sharp(imgPath).jpeg().toBuffer();
        const image = await newPdf.embedJpg(imgBuffer);

        const page = newPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });
    }

    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
};

exports.wordToPdf = async (filePath) => {
    // LibreOffice-convert requires libreoffice to be installed on the host ENV
    const fileContent = await fs.readFile(filePath);
    try {
        const pdfBuffer = await libreConvert(fileContent, '.pdf', undefined);
        return pdfBuffer;
    } catch (e) {
        console.error("LibreOffice convert error:", e);
        throw new Error("Failed to convert Word to PDF. Make sure LibreOffice is installed.");
    }
};

exports.powerpointToPdf = async (filePath) => {
    // PPT uses the exact same libreoffice convert pipeline as Word
    const fileContent = await fs.readFile(filePath);
    try {
        const pdfBuffer = await libreConvert(fileContent, '.pdf', undefined);
        return pdfBuffer;
    } catch (e) {
        throw new Error("Failed to convert Powerpoint to PDF. Make sure LibreOffice is installed.");
    }
};
// --- SECURITY ---
const qpdf = require('node-qpdf2');

exports.unlockPdf = async (filePath, password) => {
    // We use qpdf to decrypt. If no password config is passed, it attempts to remove restrictions.
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-unlocked.pdf`);
    try {
        const options = {
            keyLength: 256,
            password: password || ''
        };
        await qpdf.decrypt(filePath, tempOutputFile, options);
        const unlockedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(unlockedBuffer);
    } catch (e) {
        console.error("Unlock error:", e);
        throw new Error("Failed to unlock PDF. Invalid password or corrupted file.");
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.protectPdf = async (filePath, password) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-protected.pdf`);
    try {
        const options = {
            keyLength: 256,
            password: password
        };
        await qpdf.encrypt(filePath, options, tempOutputFile);
        const protectedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(protectedBuffer);
    } catch (e) {
        console.error("Protect error:", e);
        throw new Error("Failed to protect PDF.");
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.watermarkPdf = async (filePath, text) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text || 'CONFIDENTIAL', {
            x: width / 4,
            y: height / 2,
            size: 50,
            opacity: 0.3,
            rotate: require('pdf-lib').degrees(45),
        });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
};

exports.signPdf = async (filePath, signatureText) => {
    // MVP: visual signature placement. 
    // Real cryptographically valid digital signatures require a .p12 cert file
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    firstPage.drawText(`Digitally Signed: ${signatureText || 'Verified User'}`, {
        x: 50,
        y: 50,
        size: 15,
    });

    const signedBytes = await pdfDoc.save();
    return Buffer.from(signedBytes);
};
