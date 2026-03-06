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
    chromium \
    fonts-liberation \
    fonts-noto \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Puppeteer: skip bundled Chromium, use system-installed one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 4000
CMD ["node", "src/app.js"]
