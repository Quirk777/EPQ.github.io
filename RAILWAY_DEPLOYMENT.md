# Railway Deployment Instructions for EPQ

## Environment Variables Required

Set these in Railway dashboard (Variables tab):

### Core Configuration
```bash
ENVIRONMENT=production
SESSION_SECRET=your-32-plus-char-random-secret
PUBLIC_BASE_URL=https://your-railway-domain.railway.app
WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf
```

### Email Configuration (Gmail SMTP)
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
GMAIL_FROM_NAME=EPQ Assessment Platform
```

### Optional Configuration
```bash
PYTHONPATH=/app
PORT=8000
```

## Build Settings

Railway will automatically:
1. Detect the Dockerfile and build the container
2. Install wkhtmltopdf via apt-get 
3. Set up Python dependencies from requirements.txt
4. Expose the PORT environment variable

## Verification Commands

After deployment, run these to verify everything works:

### 1. Health Check
```bash
curl https://your-domain.railway.app/health
# Expected: {"ok": true, "environment": "production"}
```

### 2. Email Health Check  
```bash
curl https://your-domain.railway.app/health/email
# Expected: {"ok": true, "email_configured": true, "config": {...}}
```

### 3. PDF Test (from deployment environment)
```bash
python scripts/test-pdf-production.py
```

### 4. Email Test (from deployment environment)
```bash
python scripts/verify-email-production.py
```

## Troubleshooting

### If wkhtmltopdf fails:
- Verify `WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf` is set
- Check Railway build logs for apt-get errors
- Test manually: `which wkhtmltopdf` in Railway console

### If email fails:
- Verify Gmail App Password is 16 characters
- Check Gmail account has 2FA enabled
- Test SMTP connection: `telnet smtp.gmail.com 587`

### If builds fail:
- Check Dockerfile syntax
- Verify requirements.txt has all dependencies
- Check Railway build logs for specific errors