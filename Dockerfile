# Railway Dockerfile for EPQ with wkhtmltopdf support
FROM python:3.11-slim

# Install system dependencies including wkhtmltopdf
RUN apt-get update && apt-get install -y \
    wget \
    xvfb \
    fontconfig \
    libjpeg62-turbo \
    libxrender1 \
    xfonts-75dpi \
    xfonts-base \
    && wget -q https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && dpkg -i wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && rm wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set wkhtmltopdf path for Railway environment  
ENV WKHTMLTOPDF_PATH="/usr/bin/wkhtmltopdf"

# Create app directory
WORKDIR /app

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data reports uploads downloads

# Set environment variables for production
ENV ENVIRONMENT=production
ENV PYTHONPATH=/app

# Expose the port Railway expects
EXPOSE $PORT

# Use uvicorn to run the FastAPI app
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT