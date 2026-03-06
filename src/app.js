require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pdfRoutes = require('./routes/pdf.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// Only listen when running directly (local dev), not on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`PDFKit Backend running on port ${PORT}`);
    });
}

module.exports = app;
