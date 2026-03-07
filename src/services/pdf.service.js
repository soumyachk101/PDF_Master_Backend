const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

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
    const newPdf = await PDFDocument.create();

    let indicesToCopy = [0];

    if (ranges && typeof ranges === 'string' && ranges.trim()) {
        indicesToCopy = [];
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
        if (indicesToCopy.length === 0) indicesToCopy = [0];
    }

    const copiedPages = await newPdf.copyPages(pdfDoc, indicesToCopy);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const newPdfBytes = await newPdf.save();
    return Buffer.from(newPdfBytes);
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
        const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputFile}" "${filePath}"`;
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
        const command = `gs -o "${tempOutputFile}" -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress "${filePath}"`;
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
            dynamicSofficePath = execSync('which soffice').toString().trim();
        } catch (err) {
            console.error('Could not find soffice via which command', err);
        }

        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
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
        throw new Error(`Failed to convert Word to PDF. If deployed, LibreOffice path may be missing. Error: ${e.message}`);
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
            dynamicSofficePath = execSync('which soffice').toString().trim();
        } catch (err) {
            console.error('Could not find soffice via which command', err);
        }

        const options = {
            sofficeBinaryPaths: [
                dynamicSofficePath,
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
    const { fromPath } = require('pdf2pic');
    const tempDir = os.tmpdir();
    const baseName = uuidv4();

    const converter = fromPath(filePath, {
        density: 150,
        saveFilename: baseName,
        savePath: tempDir,
        format: 'jpeg',
        width: 1240,
        height: 1754,
    });

    // Get page count first
    const fileContent = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileContent);
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 1) {
        const result = await converter(1);
        const imgBuffer = await fs.readFile(result.path);
        try { await fs.unlink(result.path); } catch (e) { }
        return imgBuffer;
    }

    // Multiple pages -> zip them
    const JSZip = require('jszip');
    const zip = new JSZip();

    for (let i = 1; i <= totalPages; i++) {
        const result = await converter(i);
        const imgBuffer = await fs.readFile(result.path);
        zip.file(`page-${i}.jpg`, imgBuffer);
        try { await fs.unlink(result.path); } catch (e) { }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return zipBuffer;
};

exports.pdfToWord = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvert = util.promisify(libre.convert);
    const fileContent = await fs.readFile(filePath);
    try {
        const docxBuffer = await libreConvert(fileContent, '.docx', undefined);
        return docxBuffer;
    } catch (e) {
        console.error('LibreOffice error:', e);
        throw new Error('Failed to convert PDF to Word.');
    }
};

exports.pdfToExcel = async (filePath) => {
    const libre = require('libreoffice-convert');
    const libreConvert = util.promisify(libre.convert);
    const fileContent = await fs.readFile(filePath);
    try {
        const xlsxBuffer = await libreConvert(fileContent, '.xlsx', undefined);
        return xlsxBuffer;
    } catch (e) {
        throw new Error('Failed to convert PDF to Excel.');
    }
};

exports.unlockPdf = async (filePath, password) => {
    const tempOutputFile = path.join(os.tmpdir(), `${uuidv4()}-unlocked.pdf`);
    try {
        const passArg = password ? `--password=${password}` : '';
        const command = `qpdf --decrypt ${passArg} "${filePath}" "${tempOutputFile}"`;
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
        const passStr = password || 'protected';
        // 256-bit encryption, user and owner passwords are the same here
        const command = `qpdf --encrypt "${passStr}" "${passStr}" 256 -- "${filePath}" "${tempOutputFile}"`;
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
    const libreConvert = util.promisify(libre.convert);
    const fileContent = await fs.readFile(filePath);
    try {
        const pdfBuffer = await libreConvert(fileContent, '.pdf', undefined);
        return pdfBuffer;
    } catch (e) {
        throw new Error('Failed to convert Excel to PDF.');
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
    const libreConvert = util.promisify(libre.convert);
    const fileContent = await fs.readFile(filePath);
    try {
        const pptxBuffer = await libreConvert(fileContent, '.pptx', undefined);
        return pptxBuffer;
    } catch (e) {
        throw new Error('Failed to convert PDF to PowerPoint.');
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
