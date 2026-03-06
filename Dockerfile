FROM node:20-slim

# Install only small system tools — Ghostscript (compress/repair) + QPDF (unlock/protect) + Chromium (html-to-pdf)
# LibreOffice is intentionally excluded (600MB, causes Railway build timeout)
# Word/Excel/PPT conversion tools will show a "not supported on this server" message
RUN apt-get update && apt-get install -y \
    ghostscript \
    qpdf \
    chromium \
    fonts-liberation \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

EXPOSE 4000
CMD ["node", "src/app.js"]
