const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')
const ctrl = require('../controllers/pdf.controller')

// All routes accept multipart/form-data with a "files" field
const u = upload.array('files', 20)

// ─── Organize ───────────────────────────────────────────────────────────────
router.post('/merge-pdf', u, ctrl.merge)
router.post('/split-pdf', u, ctrl.split)

// ─── Optimize ───────────────────────────────────────────────────────────────
router.post('/compress-pdf', u, ctrl.compress)

// ─── Convert ────────────────────────────────────────────────────────────────
router.post('/pdf-to-word', u, ctrl.pdfToWord)
router.post('/word-to-pdf', u, ctrl.wordToPdf)
router.post('/pdf-to-jpg', u, ctrl.pdfToJpg)
router.post('/jpg-to-pdf', u, ctrl.jpgToPdf)

// ─── Edit ───────────────────────────────────────────────────────────────────
router.post('/rotate-pdf', u, ctrl.rotate)
router.post('/add-watermark', u, ctrl.watermark)
router.post('/page-numbers', u, ctrl.addPageNumbers)

// ─── Security ───────────────────────────────────────────────────────────────
router.post('/lock-pdf', u, ctrl.lock)
router.post('/unlock-pdf', u, ctrl.unlock)

// ─── New: Convert (Images) ────────────────────────────────────────────────────
router.post('/pdf-to-png', u, ctrl.pdfToPng)
router.post('/jpg-to-png', u, ctrl.jpgToPng)
router.post('/png-to-jpg', u, ctrl.pngToJpg)

// ─── New: Convert (Office) ────────────────────────────────────────────────────
router.post('/pdf-to-ppt', u, ctrl.pdfToPpt)
router.post('/ppt-to-pdf', u, ctrl.pptToPdf)
router.post('/excel-to-pdf', u, ctrl.excelToPdf)
router.post('/pdf-to-excel', u, ctrl.pdfToExcel)
router.post('/pdf-to-text', u, ctrl.pdfToText)

// ─── New: Edit ────────────────────────────────────────────────────────────────
router.post('/crop-pdf', u, ctrl.cropPdf)

module.exports = router
