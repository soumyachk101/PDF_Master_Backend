const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pdfRoutes = require('./routes/pdf.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`PDFKit Backend running on port ${PORT}`);
});
