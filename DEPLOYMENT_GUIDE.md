# Production Deployment Guide

This guide walks you through deploying the EPQ Assessment Platform to production.

## Pre-Deployment Checklist

### Phase 0: Production Config Foundation ✅

#### 1. Configure Production Database

```powershell
# Set database path for production
# Edit .env file:
DB_PATH=./data/production.db
```

The database will be automatically created when the server starts.

#### 2. Set Production SESSION_SECRET

**CRITICAL: Never use the default secret in production!**

```powershell
# Generate a secure session secret
python -c "import secrets; print(secrets.token_hex(32))"

# Add to .env:
SESSION_SECRET=<your-generated-secret-here>
```

#### 3. Set Up Email Service

**Option A: Gmail SMTP (Recommended for getting started)**

1. Go to https://myaccount.google.com/apppasswords
2. Create a new app password for "Mail"
3. Add to .env:

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password
GMAIL_FROM_NAME=EPQ Assessment Platform
```

**Option B: SendGrid (Recommended for production)**

1. Sign up at https://sendgrid.com
2. Create an API key
3. Update `app/services/email_service.py` to use SendGrid

#### 4. Quick Setup Script

For convenience, run the automated setup:

```powershell
.\setup-production.ps1
```

This will:
- Generate a secure SESSION_SECRET
- Prompt for email configuration
- Create a production .env file

---

### Phase 1: Critical Auth Completion ✅

All authentication features are now implemented:

- ✅ Email verification on signup
- ✅ Password reset flow
- ✅ Secure cookie flags (HttpOnly, Secure, SameSite)
- ✅ Rate limiting on auth endpoints

**Frontend pages created:**
- `/verify-email` - Email verification page
- `/forgot-password` - Request password reset
- `/reset-password` - Set new password

**Backend endpoints:**
- `POST /auth/register` - Sign up (sends verification email)
- `GET /auth/verify-email?token=...` - Verify email
- `POST /auth/forgot-password` - Request reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/resend-verification` - Resend verification email
- `GET /auth/me` - Get current user info

---

### Phase 2: Required Backend for Real Users

#### Profile Save API

Check your existing employer profile implementation. If it's using mock saves, update it:

```typescript
// Before (mock):
const handleSave = () => {
  console.log('Saved (mock)');
};

// After (real):
const handleSave = async () => {
  const response = await fetch('http://localhost:8000/employer/profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
};
```

---

### Phase 3: Security Hardening

#### 1. Enable HTTPS

**For development/testing:**
Use a reverse proxy like Caddy or nginx with self-signed certs.

**For production:**

**Option A: Cloudflare (Easiest)**
1. Add your domain to Cloudflare
2. Enable "Full" SSL mode
3. Done! Cloudflare handles the certificate

**Option B: Let's Encrypt + Nginx**

```nginx
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Nginx config
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option C: Cloud Platform (AWS, Azure, GCP)**
Most cloud platforms provide automatic HTTPS through their load balancers.

After enabling HTTPS, update .env:
```bash
HTTPS_ONLY_COOKIES=true
PUBLIC_BASE_URL=https://yourdomain.com
```

#### 2. Rate Limiting ✅

Already implemented with SlowAPI:
- Register: 3 requests/hour
- Login: 5 requests/minute
- Forgot password: 3 requests/hour
- Default: 200 requests/day, 50 requests/hour

#### 3. CORS Lockdown ✅

Already configured in `app/main.py`:
- Development: localhost:3000, 3001
- Production: Automatically adds PUBLIC_BASE_URL

To further lock down CORS in production:

```python
# In app/main.py
if IS_PRODUCTION:
    allowed_origins = [
        production_origin,
        production_origin.replace("://", "://www.")
    ]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
```

---

### Phase 4: UX Reliability

#### 1. Custom Error Pages ✅

Already implemented:
- 404 errors return JSON
- 500 errors return JSON (sanitized in production)
- Rate limit errors (429) return JSON

To add HTML error pages for the frontend:

```typescript
// In your Next.js app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">500</h1>
        <h2 className="text-2xl font-semibold mt-4">Something went wrong!</h2>
        <button onClick={reset} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg">
          Try Again
        </button>
      </div>
    </div>
  );
}
```

```typescript
// In your Next.js app/not-found.tsx
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
        <a href="/" className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg">
          Go Home
        </a>
      </div>
    </div>
  );
}
```

#### 2. Loading States

Add loading states to all async operations:

```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await fetch(...);
  } finally {
    setLoading(false);
  }
};

<button disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

---

### Phase 5: Performance + Production Build

#### 1. Install Dependencies

```powershell
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

#### 2. Build Frontend

```powershell
cd frontend
npm run build
```

This creates an optimized production build in `frontend/.next/`

#### 3. Test Production Build Locally

```powershell
# Start frontend in production mode
cd frontend
npm run start

# Start backend
cd ..
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 4. Optimize Images

```powershell
# Install image optimization tools
cd frontend
npm install --save-dev sharp

# Next.js automatically optimizes images if you use next/image
```

Use the Next.js Image component:

```typescript
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="Logo" 
  width={200} 
  height={50}
  priority
/>
```

#### 5. Enable Caching

Next.js automatically sets cache headers for static assets.

For the backend, cache headers are already configured in `app/main.py`:
- Static assets: 1 year cache
- API responses: no cache
- HTML: no cache

---

### Phase 6: Final Testing

#### Desktop Testing Checklist

```
□ Sign up with new email
□ Check verification email arrives
□ Click verification link
□ Log in
□ Create role/assessment
□ Submit EPQ
□ Generate PDF
□ Log out
□ Forgot password flow
□ Reset password
□ Log in with new password
□ Check all pages load
□ Check for console errors
```

#### iPhone Safari Testing Checklist

```
□ All forms work with correct keyboard types
□ Buttons are large enough to tap (44x44px minimum)
□ No horizontal scrolling
□ Input fields don't cause zoom (16px min font)
□ Login persists across sessions
□ Links in emails work
□ Password manager integration works
□ Back button works correctly
```

---

## Deployment Options

### Option 1: Simple VPS (DigitalOcean, Linode, Vultr)

1. Create a VPS with Ubuntu 22.04
2. Install dependencies:

```bash
sudo apt update
sudo apt install python3 python3-pip nodejs npm nginx certbot python3-certbot-nginx

# Clone your repository
git clone <your-repo>
cd <your-project>

# Backend
pip3 install -r requirements.txt

# Frontend
cd frontend
npm install
npm run build
cd ..

# Set up environment
cp .env.example .env
nano .env  # Fill in your values
```

3. Set up systemd service:

```bash
sudo nano /etc/systemd/system/epq.service
```

```ini
[Unit]
Description=EPQ Assessment Platform
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/epq
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable epq
sudo systemctl start epq
```

4. Configure nginx (see HTTPS section above)

5. Get SSL certificate:

```bash
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Platform as a Service (Heroku, Render, Railway)

These platforms handle HTTPS, scaling, and deployments automatically.

**Example: Render.com**

1. Create `render.yaml`:

```yaml
services:
  - type: web
    name: epq-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: DB_PATH
        value: /opt/render/project/src/data/production.db
```

2. Connect your GitHub repo
3. Add environment variables in the Render dashboard
4. Deploy!

### Option 3: Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY .env .env

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: always
```

---

## Post-Deployment

### 1. Set Up Database Backups

Run daily backups:

```powershell
# Windows Task Scheduler
.\backup-database.ps1

# Linux cron
0 2 * * * /path/to/backup-database.sh
```

### 2. Monitor Logs

```bash
# Systemd logs
sudo journalctl -u epq -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 3. Set Up Monitoring

Consider using:
- Uptime monitoring: UptimeRobot, Pingdom
- Error tracking: Sentry
- Analytics: Google Analytics, Plausible

---

## Go/No-Go Launch Checklist

Before going live, verify:

```
□ SESSION_SECRET is secure (not default)
□ Email service is configured and tested
□ HTTPS is enabled
□ HTTPS_ONLY_COOKIES=true in .env
□ Database backups are configured
□ All auth flows work (signup, login, verify, reset)
□ Rate limiting is active
□ CORS is locked down to production domain
□ Frontend is built (npm run build)
□ All tests pass on desktop
□ All tests pass on iPhone Safari
□ Error pages work
□ No console errors in production
□ .env is not committed to git
□ Domain is configured and resolving
```

Run the automated validator:

```powershell
.\validate-production.ps1
```

If all checks pass, you're ready to launch! 🚀

---

## Troubleshooting

### Emails not sending

Check:
- GMAIL_USER and GMAIL_APP_PASSWORD are correct
- Gmail app password is valid (not regular password)
- Check server logs for email errors

### Session not persisting

Check:
- Cookies are enabled in browser
- HTTPS_ONLY_COOKIES matches your protocol (true for HTTPS)
- SESSION_SECRET hasn't changed
- SameSite is set to 'lax'

### CORS errors

Check:
- PUBLIC_BASE_URL matches your frontend URL
- Frontend is making requests with credentials: 'include'
- CORS middleware is configured correctly

### Database locked errors

Check:
- Only one process is accessing the database
- Database directory has write permissions
- Consider upgrading to PostgreSQL for production

---

## Support

For issues or questions:
1. Check the logs first
2. Review this deployment guide
3. Check your .env configuration
4. Verify all dependencies are installed

Good luck with your launch! 🎉
