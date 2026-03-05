const fs = require('fs')

/**
 * Cleanup utility to safely delete temporary files
 */
function cleanup(...filePaths) {
    for (const p of filePaths) {
        try {
            if (p && fs.existsSync(p)) {
                fs.unlinkSync(p)
            }
        } catch (err) {
            console.warn(`Failed to cleanup: ${p}`, err.message)
        }
    }
}

/**
 * Cleanup files from multer request
 */
function cleanupRequest(req) {
    if (req.files && Array.isArray(req.files)) {
        cleanup(...req.files.map((f) => f.path))
    } else if (req.file) {
        cleanup(req.file.path)
    }
}

module.exports = { cleanup, cleanupRequest }
