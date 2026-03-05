require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')
const pdfRoutes = require('./routes/pdf.routes')
const errorHandler = require('./middleware/errorHandler')
const { TEMP_DIR } = require('./config/paths')

const app = express()
const PORT = process.env.PORT || 4000

// ─── Temp directory configuration is handled in src/config/paths.js ─────────

// ─── Security middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ─── CORS ────────────────────────────────────────────────────────────────────
const rawFrontendUrl = process.env.FRONTEND_URL || 'https://www.pdfkit.fun'
const cleanFrontendUrl = rawFrontendUrl.replace(/\/+$/, '')

const allowedOrigins = [
  cleanFrontendUrl,
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
    docs: cleanFrontendUrl
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

// ─── Start server (only if not running on Vercel) ────────────────────────────
// Note: On Vercel, the app is exported and handled by the platform.
// Background cleanup is removed for serverless compatibility.
if (!process.env.VERCEL) {
  const port = parseInt(PORT, 10) || 4000
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
}

module.exports = app
