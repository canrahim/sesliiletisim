# Environment Variables Guide

## Required Environment Variables

### Database
```bash
DATABASE_URL=postgresql://asforces:changeme@localhost:5432/asforces
```

### Redis
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=changeme
```

### JWT Authentication
⚠️ **IMPORTANT**: Use strong random strings (minimum 32 characters) in production!

```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-characters
REFRESH_TOKEN_EXPIRES_IN=30d
```

### API Configuration
```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
API_PREFIX=api
CORS_ORIGIN=https://app.asforces.com,https://asforces.com
```

## Optional Environment Variables

### Email (for verification & password reset)
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@asforces.com
```

### TURN Server (for WebRTC NAT traversal)
```bash
TURN_URLS=turn:yourserver.com:3478
TURN_USERNAME=asforces
TURN_PASSWORD=changeme
```

### CAPTCHA (Cloudflare Turnstile)
```bash
CAPTCHA_ENABLED=false
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

### Frontend (Vite)
```bash
VITE_API_URL=https://asforces.com/api
VITE_WS_URL=wss://asforces.com
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

## Generate Strong Secrets

Use these commands to generate secure random strings:

```bash
# For JWT secrets (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```



