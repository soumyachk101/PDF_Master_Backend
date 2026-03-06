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
