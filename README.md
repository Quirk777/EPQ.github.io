# EPQ Assessment Platform

A professional hiring assessment platform with email verification, password reset, and comprehensive security features.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gmail account (for email service) or alternative SMTP provider

### Local Development Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd python_project
```

2. **Backend Setup**
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
copy .env.example .env
# Edit .env and fill in your values
```

3. **Initialize Database**
```bash
python -c "from app.services import db; db.init_db()"
```

4. **Frontend Setup**
```bash
cd frontend
npm install
```

5. **Run Development Servers**

Backend:
```bash
uvicorn app.main:app --reload --port 8000
```

Frontend (in another terminal):
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

## 🌐 Deployment

### Deploy to Railway.app (Recommended)

1. **Push to GitHub** (you're here!)

2. **Connect to Railway**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure Environment Variables**
   
   In Railway dashboard, add these variables:
   ```
   ENVIRONMENT=production
   SESSION_SECRET=<generate-with-command-below>
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   PUBLIC_BASE_URL=https://your-app.railway.app
   HTTPS_ONLY_COOKIES=true
   DB_PATH=./data/production.db
   ```

   Generate SESSION_SECRET:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

4. **Deploy!**
   - Railway will automatically detect and deploy both backend and frontend
   - Your app will be live at: `https://your-app.railway.app`

### Other Deployment Options

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for:
- Render.com
- Vercel + Railway
- AWS/Azure/GCP
- Custom VPS with Docker

## 📚 Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [API_REFERENCE.md](API_REFERENCE.md) - API documentation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details

## ✨ Features

- ✅ User authentication (register, login, logout)
- ✅ Email verification
- ✅ Password reset flow
- ✅ Rate limiting (prevents abuse)
- ✅ Secure session management
- ✅ Professional error handling
- ✅ Mobile-responsive design
- ✅ Production-ready security

## 🔐 Environment Variables

Required for production:

```bash
# Application
ENVIRONMENT=production
PUBLIC_BASE_URL=https://yourdomain.com

# Security
SESSION_SECRET=<64-char-random-hex>
HTTPS_ONLY_COOKIES=true

# Email Service
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Database
DB_PATH=./data/production.db
```

See `.env.example` for all available options.

## 🧪 Testing

Run authentication tests:
```bash
.\test-auth.ps1
```

Validate production readiness:
```bash
.\validate-production.ps1
```

## 📦 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLite (Database)
- Passlib (Password hashing)
- SlowAPI (Rate limiting)

**Frontend:**
- Next.js 16 (React framework)
- TypeScript
- Tailwind CSS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Your License Here]

## 🆘 Support

For issues or questions:
- Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Review [API_REFERENCE.md](API_REFERENCE.md)
- Open an issue on GitHub

## ⚙️ Gmail Setup (for Email Features)

To enable email verification and password reset:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"
5. Use this password in your `GMAIL_APP_PASSWORD` environment variable

**Important:** Never commit your app password to Git!

---

**Ready to deploy?** Follow the deployment guide above or see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.
