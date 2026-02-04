# API Reference - Authentication & User Management

## Base URL
- Development: `http://localhost:8000`
- Production: `https://yourdomain.com`

---

## Authentication Endpoints

### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "company_name": "My Company",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "status": "ok",
  "employer_id": "uuid-here",
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Errors:**
- 400: Missing email or password, invalid email format, password too short (<8 chars)
- 409: Email already registered
- 429: Rate limit exceeded (3 requests/hour)

---

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "employer_id": "uuid-here"
}
```

**Errors:**
- 400: Missing email or password
- 401: Invalid credentials
- 429: Rate limit exceeded (5 requests/minute)

**Note:** Sets session cookie automatically

---

### Logout
```http
POST /auth/logout
```

**Response (200):**
```json
{
  "status": "ok"
}
```

**Note:** Clears session cookie

---

### Get Current User
```http
GET /auth/me
```

**Response (200):**
```json
{
  "employer_id": "uuid-here",
  "company_name": "My Company",
  "email": "user@example.com",
  "email_verified": true
}
```

**Errors:**
- 401: Not logged in or session invalid

---

## Email Verification

### Verify Email
```http
GET /auth/verify-email?token=<verification_token>
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Email verified successfully! You can now access all features."
}
```

**Errors:**
- 400: Token missing, invalid, or expired (24 hours)

**Note:** 
- Token is sent via email after registration
- Token can only be used once
- After verification, `email_verified` is set to `true` in database

---

### Resend Verification Email
```http
GET /auth/resend-verification
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Verification email sent. Please check your inbox."
}
```

**Errors:**
- 401: Not logged in
- 404: Employer not found

**Note:** Only works if user is logged in but not yet verified

---

## Password Reset

### Request Password Reset
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "If that email exists in our system, a password reset link has been sent."
}
```

**Errors:**
- 400: Email missing
- 429: Rate limit exceeded (3 requests/hour)

**Security Note:** 
- Always returns success message (prevents user enumeration)
- Email only sent if account exists
- Reset token expires in 1 hour

---

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Errors:**
- 400: Token or password missing, password too short (<8 chars), invalid/expired token

**Note:**
- Token is sent via email
- Token expires in 1 hour
- Token can only be used once
- Old sessions remain valid (consider logging out all devices)

---

## Frontend Integration Examples

### JavaScript/Fetch

```javascript
// Register
const register = async (companyName, email, password) => {
  const response = await fetch('http://localhost:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies!
    body: JSON.stringify({ company_name: companyName, email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
  
  return await response.json();
};

// Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies!
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  
  return await response.json();
};

// Get current user
const getCurrentUser = async () => {
  const response = await fetch('http://localhost:8000/auth/me', {
    credentials: 'include' // Important for cookies!
  });
  
  if (!response.ok) {
    throw new Error('Not logged in');
  }
  
  return await response.json();
};
```

### React/TypeScript

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  employer_id: string;
  company_name: string;
  email: string;
  email_verified: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    await checkAuth();
  };

  const logout = async () => {
    await fetch('http://localhost:8000/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  return { user, loading, login, logout };
};
```

---

## Environment Variables Required

```bash
# Backend (.env)
SESSION_SECRET=your-secure-random-secret
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
ENVIRONMENT=production
PUBLIC_BASE_URL=https://yourdomain.com
HTTPS_ONLY_COOKIES=true
```

---

## Rate Limits

| Endpoint | Limit | Notes |
|----------|-------|-------|
| /auth/register | 3/hour | Per IP address |
| /auth/login | 5/minute | Per IP address |
| /auth/forgot-password | 3/hour | Per IP address |
| Others | 50/hour, 200/day | Default limits |

**Response when rate limited (429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later."
}
```

**Headers:**
- `X-RateLimit-Limit`: Total allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until reset
- `Retry-After`: Seconds until retry (when 429)

---

## Session/Cookie Behavior

- **Cookie Name:** `session` (set by FastAPI SessionMiddleware)
- **HttpOnly:** Yes (not accessible via JavaScript)
- **Secure:** Yes (in production with HTTPS_ONLY_COOKIES=true)
- **SameSite:** Lax
- **Max Age:** 7 days
- **Path:** /

**IMPORTANT:** Always include `credentials: 'include'` in fetch requests!

---

## Testing Examples

### cURL

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test Co","email":"test@test.com","password":"password123"}' \
  -c cookies.txt

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -c cookies.txt

# Get current user (uses cookies from previous request)
curl http://localhost:8000/auth/me -b cookies.txt

# Forgot password
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```

### PowerShell

```powershell
# Register
$body = @{
    company_name = "Test Co"
    email = "test@test.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/auth/register" `
                  -Method Post `
                  -ContentType "application/json" `
                  -Body $body `
                  -SessionVariable session

# Login
$body = @{
    email = "test@test.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
                  -Method Post `
                  -ContentType "application/json" `
                  -Body $body `
                  -WebSession $session

# Get current user
Invoke-RestMethod -Uri "http://localhost:8000/auth/me" `
                  -WebSession $session
```

---

## Common Issues & Solutions

### "Not logged in" error
- Ensure `credentials: 'include'` is in fetch request
- Check if session cookie is being set
- Verify CORS allows credentials

### Verification email not received
- Check spam folder
- Verify GMAIL_USER and GMAIL_APP_PASSWORD are correct
- Check server logs for email errors
- Test Gmail credentials: `python -c "from app.services.email_service import email_service; print(email_service.is_configured)"`

### Rate limit errors in development
- Rate limits apply per IP
- Use different browser/incognito for testing
- Restart server to reset in-memory rate limits

### CORS errors
- Ensure frontend origin is in allowed_origins
- Check credentials: 'include' is set
- Verify PUBLIC_BASE_URL matches your frontend

---

**Last Updated:** February 2, 2026
