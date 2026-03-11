require('dotenv').config()

const express = require('express')
const compression = require('compression')
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

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression())

// ─── Trust proxy for Railway (required for rate limiting) ─────────────────────
// Trust all proxies behind Railway/Vercel load balancers
app.set('trust proxy', 1)

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
const corsOptions = {
  origin: process.env.ALLOW_ALL_CORS === 'true'
    ? '*'
    : [
        process.env.FRONTEND_URL,
        'https://www.pdfkit.fun',
        'https://pdfkit.fun',
        'https://api.pdfkit.fun',
        'https://www.docshift.tech',
        'https://docshift.tech',
        'https://api.docshift.tech'
      ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// ─── Rate limiting ───────────────────────────────────────────────────────────
const limiter= rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
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

cron.schedule('*/10 * * * *', cleanupTempFiles)
cleanupTempFiles()

// ─── Set Puppeteer executable path for Railway (chromium from nix) ───────────
if (!process.env.PUPPETEER_EXECUTABLE_PATH && process.env.RAILWAY) {
  // Railway/Nixpacks puts chromium here when nixPkg 'chromium' is installed
  process.env.PUPPETEER_EXECUTABLE_PATH = '/run/current-system/sw/bin/chromium'
}
// On Windows/Local development, we typically omit executablePath to use bundled chromium,
// or the user can set it in their .env for their specific installation.

// ─── Start server ────────────────────────────────────────────────────────────
const port = parseInt(PORT, 10) || 4000

app.listen(port, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   PDFKit API — Running on :${port}  ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(13)} ║
  ╚══════════════════════════════════╝
  `)

  if (process.env.NODE_ENV === 'production') {
   console.log('[startup] Production mode detected')
   if (process.env.RAILWAY) {
     console.log('[startup] Running on Railway platform')
    }
  }
})

module.exports = app
