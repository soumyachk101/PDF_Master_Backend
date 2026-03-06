const multer = require('multer');
const path = require('path');
const uuid = require('uuid');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads')); // Assuming an uploads folder exists
    },
    filename: (req, file, cb) => {
        cb(null, `${uuid.v4()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024 }
});

module.exports = { upload };
