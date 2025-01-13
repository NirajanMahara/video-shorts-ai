# Use multi-stage build for smaller final image
FROM node:18-slim AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Python base image with FFmpeg
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt setup.py ./
COPY README.md ./

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Copy Python source
COPY src/python ./src/python

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./

# Install production node modules
RUN npm install --production

# Expose ports
EXPOSE 3000 8000

# Copy start script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONPATH=/app

# Start both frontend and backend
ENTRYPOINT ["./docker-entrypoint.sh"] 