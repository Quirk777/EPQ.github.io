FROM python:3.11-slim

# System deps for wkhtmltopdf + fonts
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    fontconfig \
    libjpeg62-turbo \
    libxext6 \
    libxrender1 \
    libfreetype6 \
    libfontconfig1 \
    libglib2.0-0 \
    libsm6 \
    xfonts-75dpi \
    xfonts-base \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV WKHTMLTOPDF_PATH="/usr/bin/wkhtmltopdf"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV ENVIRONMENT=production

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data reports uploads downloads

EXPOSE 8001

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8001 --proxy-headers --forwarded-allow-ips='*'"]