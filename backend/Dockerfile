# Use Node.js 20 LTS as base image (has better File API support)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Playwright requirements
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    postgresql-client \
    # Playwright browser dependencies
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for development)
RUN npm ci

# Install Playwright browsers after npm install
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/receipts uploads/surat_jalan uploads/surat_jalan_photos

# Set proper permissions
RUN chmod -R 755 uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "start"]
