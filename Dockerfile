# ── Build stage ────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install system dependencies needed by some npm packages (sharp etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Production stage ──────────────────────────────────────────
FROM node:20-slim

# Install LibreOffice (Word/Excel/PPT → PDF), Ghostscript (compress/repair),
# and QPDF (unlock/protect) – these are only available in a real container
RUN apt-get update && apt-get install -y \
    libreoffice \
    ghostscript \
    qpdf \
    fonts-liberation \
    fonts-noto \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Puppeteer: skip bundled Chromium download (too large for Docker layers)
# We use the system-installed Chromium if available, otherwise puppeteer-core
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 4000
CMD ["node", "src/app.js"]
