const multer = require('multer')
const path = require('path')
const { v4: uuid } = require('uuid')
const fs = require('fs')

const TEMP_DIR = path.join(__dirname, '../../temp')
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024

// Allowed MIME types per file extension
const ALLOWED_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream', // some browsers send this for .docx
  ],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure temp dir exists
    try {
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true })
      }
      cb(null, TEMP_DIR)
    } catch (err) {
      cb(new Error('Failed to create temp directory: ' + err.message))
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // Use UUID to avoid filename collisions and path traversal attacks
    cb(null, `${uuid()}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const allowedMimes = ALLOWED_TYPES[ext]

  if (!allowedMimes) {
    return cb(new Error(`File type "${ext}" is not supported.`))
  }

  // Also check MIME type (secondary validation)
  const mimeOk = allowedMimes.some(m =>
    file.mimetype.includes(m) || m.includes(file.mimetype)
  )

  if (!mimeOk && file.mimetype !== 'application/octet-stream') {
    return cb(new Error(`MIME type mismatch for ${file.originalname}`))
  }

  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20,                  // max 20 files per request
    fields: 15,                 // max 15 non-file fields
  },
})

module.exports = upload

// ─── Cleanup helper: delete specific files ───────────────────────────────────
module.exports.cleanupFiles = function (...filePaths) {
  filePaths.forEach(p => {
    if (p && fs.existsSync(p)) {
      try { fs.unlinkSync(p) } catch { /* already deleted */ }
    }
  })
}
