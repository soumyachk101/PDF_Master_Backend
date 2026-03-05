const app = require('../src/app');

module.exports = app;

// Disable Vercel's default body parser so multer can handle multipart/form-data
module.exports.config = {
    api: {
        bodyParser: false,
    },
};
