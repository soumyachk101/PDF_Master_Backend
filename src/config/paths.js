const path = require('path')
const fs = require('fs')

/**
 * On Vercel, the filesystem is read-only except for /tmp.
 * This helper returns the correct temp directory based on the environment.
 */
const TEMP_DIR = process.env.VERCEL
    ? '/tmp'
    : path.join(__dirname, '../../temp')

// Ensure temp directory exists locally (on Vercel /tmp already exists)
if (!process.env.VERCEL) {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true })
            console.log(`[paths] Created temp directory: ${TEMP_DIR}`)
        }
    } catch (err) {
        console.error(`[paths] Failed to create temp directory: ${err.message}`)
    }
}

module.exports = {
    TEMP_DIR
}
