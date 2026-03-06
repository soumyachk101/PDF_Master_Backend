const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const pdfController = require('../controllers/pdf.controller');

// Organize
router.post('/merge-pdf', upload.array('files', 20), pdfController.mergePdf);
router.post('/split-pdf', upload.single('files'), pdfController.splitPdf);

// Placeholder for the rest of the 30 routes...
// We will fully implement the services as requested next.

module.exports = router;
