require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')
const cron = require('node-cron')
const pdfRoutes = require('./routes/pdf.routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 4000

// ─── Ensure temp directory exists ───────────────────────────────────────────
const TEMP_DIR = path.join(__dirname, '../temp')
try {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
    console.log('[startup] Created temp directory')
  }
} catch (err) {
  console.error('[startup] Failed to create temp directory:', err.message)
}

// ─── Security middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://www.pdfkit.fun',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

// Log allowed origins for debugging
console.log('[cors] Allowed origins:', allowedOrigins.filter(Boolean).join(', '))

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman)
    if (!origin) return callback(null, true)
    
    // Allow all origins in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_ALL_CORS === 'true') {
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.warn('[cors] Blocked origin:', origin)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'x-filename', 'x-filesize'],
  credentials: false,
}))

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// ─── Rate limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 60,                      // 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => process.env.NODE_ENV === 'development',
})
app.use('/api/', limiter)

// ─── Health check & Root ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the PDFKit API',
    status: 'running',
    docs: process.env.FRONTEND_URL || 'https://www.pdfkit.fun'
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  })
})

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/pdf', pdfRoutes)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Auto-cleanup: delete temp files older than TTL ──────────────────────────
const TTL_MINUTES = parseInt(process.env.TEMP_FILE_TTL_MINUTES || '30', 10)

function cleanupTempFiles() {
  try {
    const files = fs.readdirSync(TEMP_DIR)
    const now = Date.now()
    let deleted = 0

    files.forEach(file => {
      if (file === '.gitkeep') return
      const filePath = path.join(TEMP_DIR, file)
      try {
        const stat = fs.statSync(filePath)
        const ageMinutes = (now - stat.mtimeMs) / 1000 / 60
        if (ageMinutes > TTL_MINUTES) {
          fs.unlinkSync(filePath)
          deleted++
        }
      } catch { /* file already deleted */ }
    })

    if (deleted > 0) {
      console.log(`[cleanup] Deleted ${deleted} old temp file(s)`)
    }
  } catch (err) {
    console.error('[cleanup] Error:', err.message)
  }
}

// Run cleanup every 10 minutes
cron.schedule('*/10 * * * *', cleanupTempFiles)
// Also run once at startup
cleanupTempFiles()

// ─── Start server ────────────────────────────────────────────────────────────
const port = parseInt(PORT, 10) || 4000

// Add slight delay to ensure filesystem is ready (Railway-specific)
const STARTUP_DELAY = process.env.RAILWAY ? 2000 : 500

setTimeout(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════╗
  ║   PDFKit API — Running on :${port}  ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(13)} ║
  ╚══════════════════════════════════╝
  `)
    
    // Log environment info for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('[startup] Production mode detected')
      if (process.env.RAILWAY) {
        console.log('[startup] Running on Railway platform')
      }
    }
  })
}, STARTUP_DELAY)

module.exports = app
