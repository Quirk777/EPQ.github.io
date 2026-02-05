FROM python:3.11-slim

# System deps for wkhtmltopdf + fonts
RUN apt-get update && apt-get install -y \
    wget \
    fontconfig \
    libjpeg62-turbo \
    libxrender1 \
    xfonts-75dpi \
    xfonts-base \
    && wget -q https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && apt-get install -y ./wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && rm -f wkhtmltox_0.12.6.1-3.bookworm_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV WKHTMLTOPDF_PATH="/usr/bin/wkhtmltopdf"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV ENVIRONMENT=production

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify critical deps (correct import names)
RUN python -c "import multipart; print('✅ python-multipart OK')"
RUN python -c "import email_validator; print('✅ email-validator OK')"

COPY . .

RUN mkdir -p data reports uploads downloads

# Railway provides PORT; EXPOSE is optional but keep a sensible default
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]