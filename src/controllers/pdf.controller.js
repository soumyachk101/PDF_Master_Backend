const pdfService = require('../services/pdf.service');
const path = require('path');
const fs = require('fs');

exports.mergePdf = async (req, res, next) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: { message: 'Please upload at least two PDF files to merge.' } });
        }

        const filePaths = req.files.map(f => f.path);
        const mergedBuffer = await pdfService.mergePdfs(filePaths);

        // Cleanup temp files
        filePaths.forEach(fp => fs.unlinkSync(fp));

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="merged-result.pdf"');
        res.send(mergedBuffer);

    } catch (error) {
        next(error);
    }
};

exports.splitPdf = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'Please upload a PDF file to split.' } });
        }

        const ranges = req.body.ranges; // e.g., "1-3,5"
        const splitBuffer = await pdfService.splitPdf(req.file.path, ranges);

        fs.unlinkSync(req.file.path);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="split-result.pdf"');
        res.send(splitBuffer);
    } catch (error) {
        next(error);
    }
};

exports.extractPdf = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'Please upload a PDF file to extract pages from.' } });
        }

        const ranges = req.body.ranges; // e.g., "1-3,5"
        const extractBuffer = await pdfService.extractPdf(req.file.path, ranges);

        fs.unlinkSync(req.file.path);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="extracted-result.pdf"');
        res.send(extractBuffer);
    } catch (error) {
        next(error);
    }
};


exports.compressPdf = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'Please upload a PDF file to compress.' } });
        }

        const compressedBuffer = await pdfService.compressPdf(req.file.path);

        fs.unlinkSync(req.file.path);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="compressed-result.pdf"');
        res.send(compressedBuffer);
    } catch (error) {
        next(error);
    }
};

exports.repairPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF file to repair.' } });
        const repairedBuffer = await pdfService.repairPdf(req.file.path);
        fs.unlinkSync(req.file.path);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="repaired-result.pdf"');
        res.send(repairedBuffer);
    } catch (error) { next(error); }
};

exports.flattenPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF file to flatten.' } });
        const flatBuffer = await pdfService.flattenPdf(req.file.path);
        fs.unlinkSync(req.file.path);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="flattened-result.pdf"');
        res.send(flatBuffer);
    } catch (error) { next(error); }
};

exports.ocrPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF file for OCR.' } });
        const textBuffer = await pdfService.ocrPdf(req.file.path);
        fs.unlinkSync(req.file.path);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="ocr-result.txt"');
        res.send(textBuffer);
    } catch (error) { next(error); }
};

// --- CONVERT TO PDF ---

exports.jpgToPdf = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: { message: 'Please upload JPG/PNG images.' } });
        const filePaths = req.files.map(f => f.path);
        const pdfBuffer = await pdfService.jpgToPdf(filePaths);
        filePaths.forEach(fp => {
            try { fs.unlinkSync(fp); } catch (e) { }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-images.pdf"');
        res.send(pdfBuffer);
    } catch (error) { next(error); }
};

exports.wordToPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a Word Document.' } });
        const pdfBuffer = await pdfService.wordToPdf(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-word.pdf"');
        res.send(pdfBuffer);
    } catch (error) { next(error); }
};

exports.powerpointToPdf = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PowerPoint Document.' } });
        const pdfBuffer = await pdfService.powerpointToPdf(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-presentation.pdf"');
        res.send(pdfBuffer);
    } catch (error) { next(error); }
};

// --- CONVERT FROM PDF ---

exports.pdfToJpg = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF Document.' } });
        const resultBuffer = await pdfService.pdfToJpg(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (e) { }

        // If it's a zip (multiple pages), it has a magic number signature 'PK' (50 4B)
        const isZip = resultBuffer[0] === 0x50 && resultBuffer[1] === 0x4B;

        if (isZip) {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="converted-images.zip"');
        } else {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="converted-image.jpg"');
        }
        res.send(resultBuffer);
    } catch (error) { next(error); }
};

exports.pdfToWord = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF Document.' } });
        const docxBuffer = await pdfService.pdfToWord(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-word.docx"');
        res.send(docxBuffer);
    } catch (error) { next(error); }
};

exports.pdfToExcel = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: { message: 'Please upload a PDF Document.' } });
        const xlsxBuffer = await pdfService.pdfToExcel(req.file.path);
        try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-excel.xlsx"');
        res.send(xlsxBuffer);
    } catch (error) { next(error); }
};
