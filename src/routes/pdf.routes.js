const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const pdfController = require('../controllers/pdf.controller');

// ─── ORGANIZE ────────────────────────────────────────────────────────────────
router.post('/merge-pdf', upload.array('files', 20), pdfController.mergePdf);
router.post('/split-pdf', upload.single('files'), pdfController.splitPdf);
router.post('/remove-pages', upload.single('files'), pdfController.removePages);
router.post('/extract-pages', upload.single('files'), pdfController.extractPdf);
router.post('/organize-pdf', upload.single('files'), pdfController.rotatePdf); // MVP: Basic rotate functionality
router.post('/scan-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);

// ─── OPTIMIZE ────────────────────────────────────────────────────────────────
router.post('/compress-pdf', upload.single('files'), pdfController.compressPdf);
router.post('/repair-pdf', upload.single('files'), pdfController.repairPdf);
router.post('/ocr-pdf', upload.single('files'), pdfController.ocrPdf);

// ─── CONVERT TO PDF ──────────────────────────────────────────────────────────
router.post('/jpg-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);
router.post('/jpeg-to-pdf', upload.array('files', 50), pdfController.jpgToPdf); // Alias
router.post('/png-to-pdf', upload.array('files', 50), pdfController.jpgToPdf); // Use same handler
router.post('/word-to-pdf', upload.single('files'), pdfController.wordToPdf);
router.post('/docx-to-pdf', upload.single('files'), pdfController.wordToPdf); // Alias
router.post('/pptx-to-pdf', upload.single('files'), pdfController.powerpointToPdf);
router.post('/ppt-to-pdf', upload.single('files'), pdfController.powerpointToPdf); // Alias
router.post('/excel-to-pdf', upload.single('files'), pdfController.excelToPdf);
router.post('/xlsx-to-pdf', upload.single('files'), pdfController.excelToPdf); // Alias
router.post('/html-to-pdf', upload.none(), pdfController.htmlToPdf);

// ─── CONVERT FROM PDF ────────────────────────────────────────────────────────
router.post('/pdf-to-jpg', upload.single('files'), pdfController.pdfToJpg);
router.post('/pdf-to-png', upload.single('files'), pdfController.pdfToJpg); // Use JPG handler for now
router.post('/pdf-to-word', upload.single('files'), pdfController.pdfToWord);
router.post('/pdf-to-docx', upload.single('files'), pdfController.pdfToWord); // Alias
router.post('/pdf-to-pptx', upload.single('files'), pdfController.pdfToPptx);
router.post('/pdf-to-powerpoint', upload.single('files'), pdfController.pdfToPptx); // Alias
router.post('/pdf-to-excel', upload.single('files'), pdfController.pdfToExcel);
router.post('/pdf-to-xlsx', upload.single('files'), pdfController.pdfToExcel); // Alias
router.post('/pdf-to-pdfa', upload.single('files'), pdfController.pdfToPdfa);

// ─── EDIT ────────────────────────────────────────────────────────────────────
router.post('/rotate-pdf', upload.single('files'), pdfController.rotatePdf);
router.post('/page-numbers', upload.single('files'), pdfController.addPageNumbers);
router.post('/add-watermark', upload.single('files'), pdfController.watermarkPdf);
router.post('/crop-pdf', upload.single('files'), pdfController.compressPdf); // MVP: Use compress as placeholder
router.post('/edit-pdf', upload.single('files'), pdfController.watermarkPdf); // MVP: Use watermark as placeholder

// ─── SECURITY ────────────────────────────────────────────────────────────────
router.post('/unlock-pdf', upload.single('files'), pdfController.unlockPdf);
router.post('/protect-pdf', upload.single('files'), pdfController.protectPdf);
router.post('/lock-pdf', upload.single('files'), pdfController.protectPdf); // Alias
router.post('/sign-pdf', upload.single('files'), pdfController.signPdf);
router.post('/redact-pdf', upload.single('files'), pdfController.protectPdf); // MVP: Use protect as placeholder
router.post('/compare-pdf', upload.array('files', 2), pdfController.mergePdf); // MVP: Use merge as placeholder

// ─── INTELLIGENCE ────────────────────────────────────────────────────────────
router.post('/translate-pdf', upload.single('files'), pdfController.ocrPdf); // MVP: Use OCR as placeholder

module.exports = router;
