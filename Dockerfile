FROM node:20-slim

# Install system dependencies required for pdf manipulation tools
# Need chromium for puppeteer (html to pdf)
# Need ghostscript, qpdf for pdf conversions
# Need libreoffice for word/excel/ppt to pdf
# Need tesseract-ocr for OCR (if implemented)
# Need python3 and pip for pdf2docx conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    qpdf \
    ghostscript \
    chromium \
   tesseract-ocr \
   tesseract-ocr-eng \
    fonts-liberation \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for puppeteer and libreoffice
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set PYTHONPATH to include our installed Python packages
ENV PYTHONPATH=/app/.python_deps:$PYTHONPATH

WORKDIR /app

# Copy package info and install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Python requirements and install dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --target .python_deps

# Copy application code
COPY src ./src

# Create temp directory
RUN mkdir -p temp && chmod 777 temp

EXPOSE 4000

CMD ["node", "src/app.js"]
