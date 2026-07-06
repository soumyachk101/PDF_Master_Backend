const { PDFDocument, StandardFonts, degrees, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Helper to get the correct Ghostscript command for the OS
const getGsCommand = () => {
    return os.platform() === 'win32' ? 'gswin64c' : 'gs';
};

// Helper for QPDF
const getQpdfCommand = () => 'qpdf';

exports.mergePdfs = async (filePaths) => {
    const mergedPdf = await PDFDocument.create();

    for (const filePath of filePaths) {
        const fileContent = await fs.readFile(filePath);
        let pdfDoc;
        try {
            // Some PDFs are encrypted (password-protected). We choose to attempt loading them
            // so we can provide a better UX for "owner-locked" files that still allow page extraction.
            pdfDoc = await PDFDocument.load(fileContent, { ignoreEncryption: true });
        } catch (err) {
            // Provide a clear, user-facing error message while keeping the original error for logs.
            const message = (err && err.message) ? String(err.message) : '';
            if (message.toLowerCase().includes('encrypted')) {
                throw new Error('One of the PDFs is password-protected/encrypted. Please unlock it first (use the Unlock PDF tool) and then try merging again.');
            }
            throw err;
        }

        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
};

exports.splitPdf = async (filePath, ranges) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();
    const JSZip = require('jszip');
    const zip = new JSZip();

    let rangesToProcess = [];
    if (ranges && typeof ranges === 'string' && ranges.trim()) {
        const parts = ranges.split(',');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                rangesToProcess.push({ start: start - 1, end: end - 1 });
            } else {
                const i = Number(part);
                if (i > 0 && i <= totalPages) rangesToProcess.push({ start: i - 1, end: i - 1 });
            }
        }
    } else {
        // Default: split every page
        for (let i = 0; i < totalPages; i++) {
            rangesToProcess.push({ start: i, end: i });
        }
    }

    if (rangesToProcess.length === 0) {
        for (let i = 0; i < totalPages; i++) {
            rangesToProcess.push({ start: i, end: i });
        }
    }

    for (let idx = 0; idx < rangesToProcess.length; idx++) {
        const range = rangesToProcess[idx];
        const newPdf = await PDFDocument.create();
        const pagesToCopy = [];
        for (let i = range.start; i <= range.end; i++) {
            if (i >= 0 && i < totalPages) pagesToCopy.push(i);
        }

        if (pagesToCopy.length > 0) {
            const copiedPages = await newPdf.copyPages(pdfDoc, pagesToCopy);
            copiedPages.forEach((page) => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            const fileName = range.start === range.end ?
                `page-${range.start + 1}.pdf` :
                `pages-${range.start + 1}-to-${range.end + 1}.pdf`;
            zip.file(fileName, pdfBytes);
        }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return zipBuffer;
};

exports.extractPdf = async (filePath, ranges) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();
    const newPdf = await PDFDocument.create();

    let indicesToCopy = [];
    if (ranges && typeof ranges === 'string' && ranges.trim()) {
        const parts = ranges.split(',');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= totalPages) indicesToCopy.push(i - 1);
                }
            } else {
                const i = Number(part);
                if (i > 0 && i <= totalPages) indicesToCopy.push(i - 1);
            }
        }
    }

    if (indicesToCopy.length === 0) indicesToCopy = [0];
    indicesToCopy = [...new Set(indicesToCopy)].sort((a, b) => a - b);

    const copiedPages = await newPdf.copyPages(pdfDoc, indicesToCopy);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
};

exports.compressPdf = async (filePath) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-compressed.pdf`);
    try {
        const gs = getGsCommand();
        const command = `${gs} -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputFile}" "${filePath}"`;
        await execPromise(command);
        const compressedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(compressedBuffer);
    } catch (error) {
        console.error('Compression error:', error);
        throw new Error('Failed to compress PDF. Internal Error.');
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.repairPdf = async (filePath) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-repaired.pdf`);
    try {
        const gs = getGsCommand();
        const command = `${gs} -o "${tempOutputFile}" -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress "${filePath}"`;
        await execPromise(command);
        const repairedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(repairedBuffer);
    } catch (error) {
        console.error('Repair error:', error);
        throw new Error('Failed to repair PDF. It might be too heavily corrupted.');
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.flattenPdf = async (filePath) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const form = pdfDoc.getForm();
    form.flatten();
    const flattenedBytes = await pdfDoc.save();
    return Buffer.from(flattenedBytes);
};

exports.ocrPdf = async (filePath, lang = 'eng') => {
    const { pdfToPng } = require('pdf-to-png-converter');
    const Tesseract = require('tesseract.js');

    const MAX_OCR_PAGES = 30;
    const pdfBuffer = await fs.readFile(filePath);

    let pngPages;
    try {
        pngPages = await pdfToPng(pdfBuffer, {
            viewportScale: 2.0,
            pagesToProcess: Array.from({ length: MAX_OCR_PAGES }, (_, i) => i + 1),
            strictPagesToProcess: false,
        });
    } catch (e) {
        console.error('OCR render error:', e);
        throw new Error('Failed to render PDF pages for OCR. The file may be corrupted or encrypted.');
    }

    if (!pngPages || pngPages.length === 0) {
        throw new Error('No pages could be rendered from this PDF for OCR.');
    }

    const worker = await Tesseract.createWorker(lang);
    try {
        let fullText = '';
        for (let i = 0; i < pngPages.length; i++) {
            const { data } = await worker.recognize(pngPages[i].content);
            fullText += `--- Page ${i + 1} ---\n${data.text.trim()}\n\n`;
        }
        return Buffer.from(fullText);
    } catch (e) {
        console.error('OCR recognition error:', e);
        throw new Error('OCR recognition failed. ' + e.message);
    } finally {
        await worker.terminate();
    }
};

exports.translatePdf = async (filePath, sourceLang, targetLang) => {
    const fs = require('fs').promises;
    const axios = require('axios');
    const pdfParse = require('pdf-parse');

    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        const textData = data.text;

        // Chunk text to avoid hitting URL length limits for GET requests
        const chunks = textData.match(/.{1,450}(\s|$)/g) || [];

        let translatedText = '';
        const apiUrl = process.env.TRANSLATE_URL || 'https://api.mymemory.translated.net/get';
        const langpair = `${sourceLang}|${targetLang}`;
        const apiKey = process.env.TRANSLATE_API_KEY || '';

        for (const chunk of chunks) {
            if (!chunk.trim()) {
                translatedText += chunk;
                continue;
            }
            try {
                const response = await axios.get(apiUrl, {
                    params: {
                        q: chunk.trim(),
                        langpair: langpair,
                        key: apiKey
                    }
                });
                if (response.data && response.data.responseData && response.data.responseData.translatedText) {
                    translatedText += response.data.responseData.translatedText + ' ';
                } else {
                    translatedText += chunk + ' ';
                }
            } catch (err) {
                console.error('Translation error for chunk:', err.message);
                translatedText += chunk + ' ';
            }
        }

        return Buffer.from(translatedText);
    } catch (e) {
        throw new Error('Failed to translate PDF. ' + e.message);
    }
};

exports.jpgToPdf = async (filePaths) => {
    const sharp = require('sharp');
    const newPdf = await PDFDocument.create();

    for (const imgPath of filePaths) {
        const imgBuffer = await sharp(imgPath).jpeg().toBuffer();
        const image = await newPdf.embedJpg(imgBuffer);
        const page = newPdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
};

exports.wordToPdf = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvertWithOptions = util.promisify(libre.convertWithOptions);
    const { execSync } = require('child_process');
    const fileContent = await fs.readFile(filePath);
    try {
        let dynamicSofficePath = '';
        try {
            const searchCmd = os.platform() === 'win32' ? 'where soffice' : 'which soffice';
            dynamicSofficePath = execSync(searchCmd).toString().trim().split('\r\n')[0];
        } catch (err) {
            console.error('Could not find soffice via OS search command', err);
        }

        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
                '/run/current-system/sw/bin/soffice',
                '/run/current-system/sw/bin/libreoffice',
                '/usr/bin/soffice',
                '/usr/bin/libreoffice'
            ].filter(Boolean),
            tmpOptions: { dir: require('os').tmpdir() },
            sofficeAdditionalArgs: ['--norestore', '--nologo']
        };
        const pdfBuffer = await libreConvertWithOptions(fileContent, '.pdf', undefined, options);
        return pdfBuffer;
    } catch (e) {
        console.error('LibreOffice convert error:', e);
        throw new Error(`Failed to convert Word to PDF. If deployed, LibreOffice path may be missing or file might be corrupted. Error: ${e.message}`);
    }
};

exports.powerpointToPdf = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvertWithOptions = util.promisify(libre.convertWithOptions);
    const { execSync } = require('child_process');
    const fileContent = await fs.readFile(filePath);
    try {
        let dynamicSofficePath = '';
        try {
            const searchCmd = os.platform() === 'win32' ? 'where soffice' : 'which soffice';
            dynamicSofficePath = execSync(searchCmd).toString().trim().split('\r\n')[0];
        } catch (err) {
            console.error('Could not find soffice via OS search command', err);
        }

        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
                '/run/current-system/sw/bin/soffice',
                '/run/current-system/sw/bin/libreoffice',
                '/usr/bin/soffice',
                '/usr/bin/libreoffice'
            ].filter(Boolean),
            tmpOptions: { dir: require('os').tmpdir() },
            sofficeAdditionalArgs: ['--norestore', '--nologo']
        };
        const pdfBuffer = await libreConvertWithOptions(fileContent, '.pdf', undefined, options);
        return pdfBuffer;
    } catch (e) {
        console.error('LibreOffice convert error:', e);
        throw new Error(`Failed to convert Powerpoint to PDF. If deployed, LibreOffice path may be missing. Error: ${e.message}`);
    }
};

exports.pdfToJpg = async (filePath, format = 'jpg') => {
    const tempDir = os.tmpdir();
    const baseName = uuidv4();
    const outputPrefix = path.join(tempDir, `${baseName}-page-%03d.jpg`);

    const targetFormat = ['png', 'webp', 'jpg'].includes(String(format).replace('.', '').toLowerCase())
        ? String(format).replace('.', '').toLowerCase()
        : 'jpg';

    try {
        const gs = getGsCommand();
        const command = `${gs} -dNOPAUSE -dBATCH -sDEVICE=jpeg -r150 -dJPEGQ=85 -sOutputFile="${outputPrefix}" "${filePath}"`;
        await execPromise(command);

        // Find all generated images
        const files = await fs.readdir(tempDir);
        const generatedImages = files.filter(f => f.startsWith(`${baseName}-page-`) && f.endsWith('.jpg')).sort();

        if (generatedImages.length === 0) {
            throw new Error("No images generated");
        }

        const sharp = require('sharp');
        const convertBuffer = async (jpgBuffer) => {
            if (targetFormat === 'png') return sharp(jpgBuffer).png().toBuffer();
            if (targetFormat === 'webp') return sharp(jpgBuffer).webp({ quality: 85 }).toBuffer();
            return jpgBuffer;
        };

        if (generatedImages.length === 1) {
            const imgPath = path.join(tempDir, generatedImages[0]);
            const imgBuffer = await convertBuffer(await fs.readFile(imgPath));
            try { await fs.unlink(imgPath); } catch (e) { }
            return { buffer: imgBuffer, format: targetFormat };
        }

        // Multiple pages -> zip them
        const JSZip = require('jszip');
        const zip = new JSZip();

        for (let i = 0; i < generatedImages.length; i++) {
            const imgPath = path.join(tempDir, generatedImages[i]);
            const imgBuffer = await convertBuffer(await fs.readFile(imgPath));
            zip.file(`page-${i + 1}.${targetFormat}`, imgBuffer);
            try { await fs.unlink(imgPath); } catch (e) { }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        return { buffer: zipBuffer, format: targetFormat };
    } catch (error) {
        console.error('PDF to image error:', error);
        throw new Error('Failed to convert PDF to images. ' + error.message);
    }
};

exports.pdfToWord = async (filePath) => {
    const os = require('os');
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const fs = require('fs').promises;
    const { v4: uuidv4 } = require('uuid');
    const execPromise = util.promisify(exec);

    const tempId = uuidv4();
    const tempOutputFile = path.join(os.tmpdir(), `${tempId}-converted.docx`);
    const scriptPath = path.join(os.tmpdir(), `${tempId}-pdf2docx.py`);

    const pythonScriptContent = `
import sys
import os
from pdf2docx import Converter

def convert_pdf_to_docx(pdf_path, docx_path):
    try:
        if not os.path.exists(pdf_path):
            print(f"Error: PDF file not found at {pdf_path}")
            sys.exit(1)
            
        cv = Converter(pdf_path)
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        print(f"Success: {docx_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input.pdf> <output.docx>")
        sys.exit(1)
        
    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]
    
    convert_pdf_to_docx(input_pdf, output_docx)
`;

    try {
        await fs.writeFile(scriptPath, pythonScriptContent);

        // Fallback to native python commands but inject PYTHONPATH so it finds our custom local dependencies
        const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
        const command = `${pythonCmd} "${scriptPath}" "${filePath}" "${tempOutputFile}"`;
        
        const envOptions = {
            env: {
                ...process.env,
                PYTHONPATH: [
                    path.join(process.cwd(), '.python_deps'),
                    process.env.PYTHONPATH
                ].filter(Boolean).join(path.delimiter)
            }
        };

        await execPromise(command, envOptions);

        const docxBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(docxBuffer);
    } catch (e) {
        console.error('PDF to Word (pdf2docx) error:', e);
        throw new Error('Failed to convert PDF to Word natively. ' + e.message);
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
        try { await fs.unlink(scriptPath); } catch (e) { }
    }
};

exports.pdfToExcel = async (filePath) => {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const { v4: uuidv4 } = require('uuid');
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-extracted.txt`);

    try {
        const gs = getGsCommand();
        // Extract text directly using Ghostscript's txtwrite device to avoid all PDF.js "bad Xref" and stream errs
        const command = `${gs} -sDEVICE=txtwrite -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputFile}" "${filePath}"`;
        await execPromise(command);

        const textData = await fs.readFile(tempOutputFile, 'utf-8');

        const rows = textData.split('\n').filter(line => line.trim().length > 0);
        const csvRows = rows.map(row => {
            // Split by 2 or more spaces to guess column structures
            const columns = row.trim().split(/\s{2,}/);
            return columns.map(col => `"${col.replace(/"/g, '""')}"`).join(',');
        });

        return Buffer.from(csvRows.join('\n'));
    } catch (e) {
        throw new Error('Failed to extract text to CSV. ' + e.message);
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.unlockPdf = async (filePath, password) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-unlocked.pdf`);
    try {
        const qpdf = getQpdfCommand();
        const passArg = password ? `--password=${password}` : '';
        const command = `${qpdf} --decrypt ${passArg} "${filePath}" "${tempOutputFile}"`;
        await execPromise(command);
        const unlockedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(unlockedBuffer);
    } catch (e) {
        console.error('Unlock error:', e);
        throw new Error('Failed to unlock PDF. Invalid password or corrupted file.');
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.protectPdf = async (filePath, password) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-protected.pdf`);
    try {
        const qpdf = getQpdfCommand();
        const passStr = password || 'protected';
        // 256-bit encryption, user and owner passwords are the same here
        const command = `${qpdf} --encrypt "${passStr}" "${passStr}" 256 -- "${filePath}" "${tempOutputFile}"`;
        await execPromise(command);
        const protectedBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(protectedBuffer);
    } catch (e) {
        console.error('Protect error:', e);
        throw new Error(`Failed to protect PDF: ${e.message}`);
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.watermarkPdf = async (filePath, text, options = {}) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const watermarkText = text || 'CONFIDENTIAL';
    const position = options.position || 'diagonal'; // diagonal | center | top | bottom
    const opacity = Math.min(1, Math.max(0.05, parseFloat(options.opacity) || 0.3));
    let size = Math.min(200, Math.max(8, parseInt(options.fontSize) || 50));

    for (const page of pages) {
        const { width, height } = page.getSize();

        // Shrink font size so the text never overflows the page
        let textWidth = font.widthOfTextAtSize(watermarkText, size);
        const maxWidth = width * 0.8;
        let effectiveSize = size;
        if (textWidth > maxWidth) {
            effectiveSize = Math.max(8, size * (maxWidth / textWidth));
            textWidth = font.widthOfTextAtSize(watermarkText, effectiveSize);
        }
        const textHeight = font.heightAtSize(effectiveSize);

        let x, y, rotate;
        if (position === 'diagonal') {
            const rad = Math.PI / 4;
            x = width / 2 - (textWidth / 2) * Math.cos(rad);
            y = height / 2 - (textWidth / 2) * Math.sin(rad);
            rotate = degrees(45);
        } else if (position === 'top') {
            x = (width - textWidth) / 2;
            y = height - textHeight - 30;
            rotate = degrees(0);
        } else if (position === 'bottom') {
            x = (width - textWidth) / 2;
            y = 30;
            rotate = degrees(0);
        } else { // center
            x = (width - textWidth) / 2;
            y = (height - textHeight) / 2;
            rotate = degrees(0);
        }

        page.drawText(watermarkText, {
            x, y,
            size: effectiveSize,
            font,
            opacity,
            rotate,
            color: rgb(0.4, 0.4, 0.4),
        });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
};

exports.signPdf = async (filePath, signatureText, options = {}) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);

    // Cursive web fonts aren't embeddable without font files; italic standard
    // fonts are the closest match that keeps the PDF self-contained.
    const FONT_MAP = {
        'font-dancing': StandardFonts.HelveticaOblique,
        'font-greatvibes': StandardFonts.TimesRomanItalic,
        'font-alex': StandardFonts.TimesRomanItalic,
        'font-caveat': StandardFonts.CourierOblique,
    };
    const sigFont = await pdfDoc.embedFont(FONT_MAP[options.font] || StandardFonts.HelveticaOblique);
    const labelFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const text = signatureText || 'Verified User';
    const position = options.position || 'bottom-right'; // bottom-left | bottom-center | bottom-right
    const sigSize = 22;
    const labelSize = 8;

    const pages = pdfDoc.getPages();
    const page = options.allPages === 'true' ? null : pages[pages.length - 1];
    const targets = page ? [page] : pages;

    const dateStr = new Date().toISOString().split('T')[0];

    for (const target of targets) {
        const { width } = target.getSize();
        const sigWidth = sigFont.widthOfTextAtSize(text, sigSize);

        let x;
        if (position === 'bottom-left') x = 40;
        else if (position === 'bottom-center') x = (width - sigWidth) / 2;
        else x = width - sigWidth - 40;

        target.drawText(text, { x, y: 60, size: sigSize, font: sigFont, color: rgb(0.1, 0.1, 0.35) });
        target.drawText(`Digitally signed · ${dateStr}`, { x, y: 46, size: labelSize, font: labelFont, color: rgb(0.4, 0.4, 0.4) });
    }

    const signedBytes = await pdfDoc.save();
    return Buffer.from(signedBytes);
};

exports.rotatePdf = async (filePath, rotationDegrees) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();
    const delta = parseInt(rotationDegrees) || 90;

    for (const page of pages) {
        // Add to the existing rotation instead of overwriting it, so pages
        // that were already rotated (e.g. scanned landscape) stay correct.
        const current = page.getRotation().angle;
        page.setRotation(degrees(((current + delta) % 360 + 360) % 360));
    }

    const rotatedBytes = await pdfDoc.save();
    return Buffer.from(rotatedBytes);
};

exports.addPageNumbers = async (filePath, options = {}) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    const start = Math.max(1, parseInt(options.start) || 1);
    const position = options.position || 'bottom-right'; // {top|bottom}-{left|center|right}
    const format = options.format === 'simple' ? 'simple' : 'full'; // "3" vs "Page 3 of N"
    const size = 10;
    const margin = 20;

    for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNum = start + i;
        const label = format === 'simple' ? String(pageNum) : `Page ${pageNum} of ${start + totalPages - 1}`;
        const textWidth = font.widthOfTextAtSize(label, size);

        let x;
        if (position.endsWith('left')) x = margin;
        else if (position.endsWith('center')) x = (width - textWidth) / 2;
        else x = width - textWidth - margin;

        const y = position.startsWith('top') ? height - margin - size : margin;

        page.drawText(label, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
    }

    const numberedBytes = await pdfDoc.save();
    return Buffer.from(numberedBytes);
};

exports.cropPdf = async (filePath, margins = {}) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();

    const top = Math.max(0, parseFloat(margins.top) || 0);
    const right = Math.max(0, parseFloat(margins.right) || 0);
    const bottom = Math.max(0, parseFloat(margins.bottom) || 0);
    const left = Math.max(0, parseFloat(margins.left) || 0);

    if (top + right + bottom + left === 0) {
        throw new Error('Please specify at least one crop margin greater than zero.');
    }

    for (const page of pages) {
        const { x, y, width, height } = page.getMediaBox();
        const newWidth = width - left - right;
        const newHeight = height - top - bottom;
        if (newWidth < 36 || newHeight < 36) {
            throw new Error('Crop margins are too large — the remaining page area would be smaller than half an inch.');
        }
        page.setCropBox(x + left, y + bottom, newWidth, newHeight);
    }

    const croppedBytes = await pdfDoc.save();
    return Buffer.from(croppedBytes);
};

const extractPdfText = async (filePath) => {
    // pdf-parse first (no external binary); Ghostscript txtwrite as fallback
    // for files its bundled pdf.js build can't read.
    try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(await fs.readFile(filePath));
        return { text: data.text, pages: data.numpages };
    } catch (parseErr) {
        const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-cmp.txt`);
        try {
            const gs = getGsCommand();
            await execPromise(`${gs} -sDEVICE=txtwrite -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputFile}" "${filePath}"`);
            const text = await fs.readFile(tempOutputFile, 'utf-8');
            return { text, pages: null };
        } catch (gsErr) {
            console.error('Compare text extraction failed:', parseErr.message, gsErr.message);
            throw new Error('Failed to extract text for comparison. One of the PDFs may be scanned or encrypted — run OCR PDF first.');
        } finally {
            try { await fs.unlink(tempOutputFile); } catch (e) { }
        }
    }
};

exports.comparePdfs = async (filePathA, filePathB) => {
    const [dataA, dataB] = await Promise.all([extractPdfText(filePathA), extractPdfText(filePathB)]);

    const MAX_LINES = 5000;
    const linesA = dataA.text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, MAX_LINES);
    const linesB = dataB.text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, MAX_LINES);

    // LCS-based line diff
    const n = linesA.length, m = linesB.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = linesA[i] === linesB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const diff = [];
    let i = 0, j = 0, removed = 0, added = 0;
    while (i < n && j < m) {
        if (linesA[i] === linesB[j]) { diff.push(`  ${linesA[i]}`); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { diff.push(`- ${linesA[i]}`); removed++; i++; }
        else { diff.push(`+ ${linesB[j]}`); added++; j++; }
    }
    while (i < n) { diff.push(`- ${linesA[i++]}`); removed++; }
    while (j < m) { diff.push(`+ ${linesB[j++]}`); added++; }

    const identical = removed === 0 && added === 0;
    const header = [
        'PDF COMPARISON REPORT',
        '=====================',
        `Document A: ${dataA.pages != null ? dataA.pages + ' page(s), ' : ''}${linesA.length} text line(s)`,
        `Document B: ${dataB.pages != null ? dataB.pages + ' page(s), ' : ''}${linesB.length} text line(s)`,
        '',
        identical
            ? 'RESULT: The documents have identical text content.'
            : `RESULT: ${removed} line(s) removed, ${added} line(s) added.`,
        '',
        'Legend: lines starting with "-" exist only in Document A,',
        '        lines starting with "+" exist only in Document B.',
        '---------------------------------------------------------',
        '',
    ].join('\n');

    // Identical documents: skip the body, the header says it all
    return Buffer.from(header + (identical ? '' : diff.join('\n')));
};

exports.excelToPdf = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvertWithOptions = util.promisify(libre.convertWithOptions);
    const { execSync } = require('child_process');
    const fileContent = await fs.readFile(filePath);
    try {
        let dynamicSofficePath = '';
        try {
            const searchCmd = os.platform() === 'win32' ? 'where soffice' : 'which soffice';
            dynamicSofficePath = execSync(searchCmd).toString().trim().split('\r\n')[0];
        } catch (err) { }
        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
                '/run/current-system/sw/bin/soffice',
                '/usr/bin/soffice'
            ].filter(Boolean),
            tmpOptions: { dir: require('os').tmpdir() },
            sofficeAdditionalArgs: ['--norestore', '--nologo']
        };
        const pdfBuffer = await libreConvertWithOptions(fileContent, '.pdf', undefined, options);
        return pdfBuffer;
    } catch (e) {
        throw new Error('Failed to convert Excel to PDF. ' + e.message);
    }
};

exports.htmlToPdf = async (url) => {
    const puppeteer = require('puppeteer');
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
        ],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
};

exports.pdfToPptx = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvertWithOptions = util.promisify(libre.convertWithOptions);
    const { execSync } = require('child_process');
    const fileContent = await fs.readFile(filePath);
    try {
        let dynamicSofficePath = '';
        try {
            const searchCmd = os.platform() === 'win32' ? 'where soffice' : 'which soffice';
            dynamicSofficePath = execSync(searchCmd).toString().trim().split('\r\n')[0];
        } catch (err) { }
        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
                '/run/current-system/sw/bin/soffice',
                '/usr/bin/soffice'
            ].filter(Boolean),
            tmpOptions: { dir: require('os').tmpdir() },
            sofficeAdditionalArgs: ['--infilter=impress_pdf_import', '--norestore', '--nologo']
        };
        const pptxBuffer = await libreConvertWithOptions(fileContent, '.pptx', undefined, options);
        return pptxBuffer;
    } catch (e) {
        throw new Error('Failed to convert PDF to PowerPoint. ' + e.message);
    }
};

exports.pdfToPdfa = async (filePath) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-pdfa.pdf`);
    try {
        const command = `gs -dPDFA -dBATCH -dNOPAUSE -sProcessColorModel=DeviceRGB -sDEVICE=pdfwrite -sPDFACompatibilityPolicy=1 -sOutputFile="${tempOutputFile}" "${filePath}"`;
        await execPromise(command);
        const pdfaBuffer = await fs.readFile(tempOutputFile);
        return Buffer.from(pdfaBuffer);
    } catch (e) {
        throw new Error('Failed to convert to PDF/A.');
    } finally {
        try { await fs.unlink(tempOutputFile); } catch (e) { }
    }
};

exports.removePages = async (filePath, pagesToRemoveString) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();

    let toRemove = [];
    if (pagesToRemoveString && typeof pagesToRemoveString === 'string') {
        toRemove = pagesToRemoveString.split(',').map(Number).filter(n => !isNaN(n)).map(n => n - 1);
    }

    toRemove = [...new Set(toRemove)].sort((a, b) => b - a);

    for (const index of toRemove) {
        if (index >= 0 && index < totalPages) {
            pdfDoc.removePage(index);
        }
    }

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
};
