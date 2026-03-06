const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const pdfController = require('../controllers/pdf.controller');

// Organize
router.post('/merge-pdf', upload.array('files', 20), pdfController.mergePdf);
router.post('/split-pdf', upload.single('files'), pdfController.splitPdf);
router.post('/extract-pdf', upload.single('files'), pdfController.extractPdf);

// Optimize
router.post('/compress-pdf', upload.single('files'), pdfController.compressPdf);
router.post('/repair-pdf', upload.single('files'), pdfController.repairPdf);
router.post('/flatten-pdf', upload.single('files'), pdfController.flattenPdf);
router.post('/ocr-pdf', upload.single('files'), pdfController.ocrPdf);

// Convert TO PDF
router.post('/jpg-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);
router.post('/word-to-pdf', upload.single('files'), pdfController.wordToPdf);
router.post('/powerpoint-to-pdf', upload.single('files'), pdfController.powerpointToPdf);

// Convert TO PDF
router.post('/jpg-to-pdf', upload.array('files', 50), pdfController.jpgToPdf);
router.post('/word-to-pdf', upload.single('files'), pdfController.wordToPdf);
router.post('/powerpoint-to-pdf', upload.single('files'), pdfController.powerpointToPdf);

// Convert FROM PDF
router.post('/pdf-to-jpg', upload.single('files'), pdfController.pdfToJpg);
router.post('/pdf-to-word', upload.single('files'), pdfController.pdfToWord);
router.post('/pdf-to-excel', upload.single('files'), pdfController.pdfToExcel);

// Placeholder for the rest of the remaining routes...
module.exports = router;
