const { PDFDocument } = require('pdf-lib');
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
        const pdfDoc = await PDFDocument.load(fileContent);
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

exports.ocrPdf = async (filePath) => {
    throw new Error('OCR functionality coming soon.');
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

exports.pdfToJpg = async (filePath) => {
    const tempDir = os.tmpdir();
    const baseName = uuidv4();
    const outputPrefix = path.join(tempDir, `${baseName}-page-%03d.jpg`);

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

        if (generatedImages.length === 1) {
            const imgPath = path.join(tempDir, generatedImages[0]);
            const imgBuffer = await fs.readFile(imgPath);
            try { await fs.unlink(imgPath); } catch (e) { }
            return imgBuffer;
        }

        // Multiple pages -> zip them
        const JSZip = require('jszip');
        const zip = new JSZip();

        for (let i = 0; i < generatedImages.length; i++) {
            const imgPath = path.join(tempDir, generatedImages[i]);
            const imgBuffer = await fs.readFile(imgPath);
            zip.file(`page-${i + 1}.jpg`, imgBuffer);
            try { await fs.unlink(imgPath); } catch (e) { }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        return zipBuffer;
    } catch (error) {
        console.error('PDF to JPG error:', error);
        throw new Error('Failed to convert PDF to JPG. ' + error.message);
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

exports.rotatePdf = async (filePath, degrees) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
        page.setRotation(require('pdf-lib').degrees(parseInt(degrees) || 90));
    }

    const rotatedBytes = await pdfDoc.save();
    return Buffer.from(rotatedBytes);
};

exports.addPageNumbers = async (filePath) => {
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        page.drawText(`Page ${i + 1} of ${totalPages}`, {
            x: width - 80,
            y: 20,
            size: 10,
        });
    }

    const numberedBytes = await pdfDoc.save();
    return Buffer.from(numberedBytes);
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
