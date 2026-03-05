# Use an official Node.js image with Debian
FROM node:18-bullseye-slim

# Install necessary system dependencies for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    poppler-utils \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install Node dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the backend source code
COPY . .

# Expose the API port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
