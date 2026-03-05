const { cleanupFiles } = require('./upload')

module.exports = function errorHandler(err, req, res, next) {
  // Clean up any uploaded files if an error occurs
  if (req.files?.length) {
    cleanupFiles(...req.files.map(f => f.path))
  } else if (req.file?.path) {
    cleanupFiles(req.file.path)
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || 100}MB`,
    })
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      message: 'Maximum 20 files per request',
    })
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: err.message,
    })
  }

  // Custom upload errors
  if (err.message?.startsWith('File type') || err.message?.startsWith('MIME')) {
    return res.status(415).json({
      error: 'Unsupported file type',
      message: err.message,
    })
  }

  // CORS errors
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: 'CORS error', message: err.message })
  }

  // Generic
  console.error('[error]', err.message)
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'An internal error occurred. Please try again.',
  })
}
