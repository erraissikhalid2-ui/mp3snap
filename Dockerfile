FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

RUN ffmpeg -version | head -1 && yt-dlp --version

WORKDIR /app

# Install ALL deps first (esbuild, tsx, tailwindcss needed for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Verify build output exists
RUN ls -la dist/ && ls -la public/

# Prune dev deps after build
RUN npm prune --omit=dev

# Temp storage for downloads
RUN mkdir -p /app/storage/temp

EXPOSE 3000
CMD ["node", "dist/server.js"]
