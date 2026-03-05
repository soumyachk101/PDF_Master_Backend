const path = require('path')
const { cleanupFiles } = require('../middleware/upload')

// Import all services
const mergeSvc = require('../services/merge')
const splitSvc = require('../services/split')
const compressSvc = require('../services/compress')
const rotateSvc = require('../services/rotate')
const watermarkSvc = require('../services/watermark')
const pageNumbersSvc = require('../services/pageNumbers')
const lockSvc = require('../services/lock')
const unlockSvc = require('../services/unlock')
const pdfToJpgSvc = require('../services/pdfToJpg')
const jpgToPdfSvc = require('../services/jpgToPdf')
const pdfToWordSvc = require('../services/pdfToWord')
const wordToPdfSvc = require('../services/wordToPdf')

// ─── Helper: send file and cleanup ───────────────────────────────────────────
function sendFile(res, buffer, filename, mime, uploadedPaths = []) {
  res.set({
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'x-filename': filename,
    'x-filesize': buffer.length,
    'Content-Length': buffer.length,
  })
  res.end(buffer)
  // Cleanup uploaded inputs
  cleanupFiles(...uploadedPaths)
}

// ─── Helper: validate file count ─────────────────────────────────────────────
function requireFiles(req, res, min = 1, max = 20) {
  const files = req.files || []
  if (files.length < min) {
    cleanupFiles(...files.map(f => f.path))
    res.status(400).json({
      error: 'Not enough files',
      message: `This tool requires at least ${min} file(s). Got ${files.length}.`,
    })
    return false
  }
  if (files.length > max) {
    cleanupFiles(...files.map(f => f.path))
    res.status(400).json({ error: 'Too many files', message: `Max ${max} files.` })
    return false
  }
  return true
}

// ─── Controllers ─────────────────────────────────────────────────────────────

exports.merge = async (req, res, next) => {
  if (!requireFiles(req, res, 2)) return
  const paths = req.files.map(f => f.path)
  try {
    const buf = await mergeSvc(paths)
    sendFile(res, buf, 'merged.pdf', 'application/pdf', paths)
  } catch (err) {
    cleanupFiles(...paths)
    next(err)
  }
}

exports.split = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const { splitMode = 'all', pageRange } = req.body
  try {
    const buf = await splitSvc(filePath, { splitMode, pageRange })
    sendFile(res, buf, 'split-pages.zip', 'application/zip', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.compress = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const quality = req.body.quality || 'medium'
  try {
    const buf = await compressSvc(filePath, quality)
    sendFile(res, buf, 'compressed.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.rotate = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const degrees = parseInt(req.body.degrees || '90', 10)
  try {
    const buf = await rotateSvc(filePath, degrees)
    sendFile(res, buf, 'rotated.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.watermark = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const { watermarkText, opacity = '30', position = 'diagonal' } = req.body
  if (!watermarkText?.trim()) {
    cleanupFiles(filePath)
    return res.status(400).json({ error: 'Watermark text is required' })
  }
  try {
    const buf = await watermarkSvc(filePath, {
      text: watermarkText,
      opacity: parseInt(opacity, 10),
      position,
    })
    sendFile(res, buf, 'watermarked.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.addPageNumbers = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const { position = 'bottom-center', startNumber = '1' } = req.body
  try {
    const buf = await pageNumbersSvc(filePath, {
      position,
      startNumber: parseInt(startNumber, 10),
    })
    sendFile(res, buf, 'numbered.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.lock = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const { password, confirmPassword } = req.body
  if (!password) {
    cleanupFiles(filePath)
    return res.status(400).json({ error: 'Password is required' })
  }
  if (password !== confirmPassword) {
    cleanupFiles(filePath)
    return res.status(400).json({ error: 'Passwords do not match' })
  }
  if (password.length < 4) {
    cleanupFiles(filePath)
    return res.status(400).json({ error: 'Password must be at least 4 characters' })
  }
  try {
    const buf = await lockSvc(filePath, password)
    sendFile(res, buf, 'protected.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.unlock = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const { password } = req.body
  if (!password) {
    cleanupFiles(filePath)
    return res.status(400).json({ error: 'Password is required' })
  }
  try {
    const buf = await unlockSvc(filePath, password)
    sendFile(res, buf, 'unlocked.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.pdfToJpg = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  const dpi = parseInt(req.body.dpi || '150', 10)
  try {
    const buf = await pdfToJpgSvc(filePath, dpi)
    sendFile(res, buf, 'pdf-pages.zip', 'application/zip', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.jpgToPdf = async (req, res, next) => {
  if (!requireFiles(req, res, 1)) return
  const paths = req.files.map(f => f.path)
  const { orientation = 'portrait', margin = 'none' } = req.body
  try {
    const buf = await jpgToPdfSvc(paths, { orientation, margin })
    sendFile(res, buf, 'images.pdf', 'application/pdf', paths)
  } catch (err) {
    cleanupFiles(...paths)
    next(err)
  }
}

exports.pdfToWord = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  try {
    const buf = await pdfToWordSvc(filePath)
    sendFile(
      res, buf,
      'converted.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [filePath]
    )
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}

exports.wordToPdf = async (req, res, next) => {
  if (!requireFiles(req, res, 1, 1)) return
  const filePath = req.files[0].path
  try {
    const buf = await wordToPdfSvc(filePath)
    sendFile(res, buf, 'converted.pdf', 'application/pdf', [filePath])
  } catch (err) {
    cleanupFiles(filePath)
    next(err)
  }
}
