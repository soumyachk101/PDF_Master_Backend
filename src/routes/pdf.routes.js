const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const pdfController = require('../controllers/pdf.controller');

// Organize
router.post('/merge-pdf', upload.array('files', 20), pdfController.mergePdf);
router.post('/split-pdf', upload.single('files'), pdfController.splitPdf);
router.post('/extract-pages', upload.single('files'), pdfController.extractPdf);

// Optimize
router.post('/compress-pdf', upload.single('files'), pdfController.compressPdf);
router.post('/repair-pdf', upload.single('files'), pdfController.repairPdf);
router.post('/flatten-pdf', upload.single('files'), pdfController.flattenPdf);
router.post('/ocr-pdf', upload.single('files'), pdfController.ocrPdf);

// Convert TO PDF
router.post('/jpg-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);
router.post('/word-to-pdf', upload.single('files'), pdfController.wordToPdf);
router.post('/pptx-to-pdf', upload.single('files'), pdfController.powerpointToPdf);

// Convert FROM PDF
router.post('/pdf-to-jpg', upload.single('files'), pdfController.pdfToJpg);
router.post('/pdf-to-word', upload.single('files'), pdfController.pdfToWord);
router.post('/pdf-to-excel', upload.single('files'), pdfController.pdfToExcel);

// Security
router.post('/unlock-pdf', upload.single('files'), pdfController.unlockPdf);
router.post('/protect-pdf', upload.single('files'), pdfController.protectPdf);
router.post('/add-watermark', upload.single('files'), pdfController.watermarkPdf);
router.post('/sign-pdf', upload.single('files'), pdfController.signPdf);

// Organize (Misc)
router.post('/rotate-pdf', upload.single('files'), pdfController.rotatePdf);
router.post('/page-numbers', upload.single('files'), pdfController.addPageNumbers);
router.post('/remove-pages', upload.single('files'), pdfController.removePages);

// Additions
router.post('/excel-to-pdf', upload.single('files'), pdfController.excelToPdf);
router.post('/html-to-pdf', upload.none(), pdfController.htmlToPdf);
router.post('/pdf-to-pptx', upload.single('files'), pdfController.pdfToPptx);
router.post('/pdf-to-pdfa', upload.single('files'), pdfController.pdfToPdfa);

// Synonyms mapping to existing functions
router.post('/scan-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);
router.post('/organize-pdf', upload.single('files'), pdfController.rotatePdf); // MVP: Map Organize to Rotate/Merge
router.post('/crop-pdf', upload.single('files'), pdfController.compressPdf); // MVP
router.post('/edit-pdf', upload.single('files'), pdfController.watermarkPdf); // MVP
router.post('/redact-pdf', upload.single('files'), pdfController.protectPdf); // MVP
router.post('/compare-pdf', upload.array('files', 2), pdfController.mergePdf); // MVP
router.post('/translate-pdf', upload.single('files'), pdfController.ocrPdf); // MVP

// Placeholder for the rest of the remaining routes...
module.exports = router;
