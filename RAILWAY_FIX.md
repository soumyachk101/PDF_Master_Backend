# 🚨 Railway Build Error Fix

## Error: `secret MAX_FILE_SIZE_MB: not found`

### ❌ Problem
Your Railway deployment is failing with this error:
```
ERROR: failed to build: failed to solve: secret MAX_FILE_SIZE_MB: not found
```

### 🔍 Root Cause
The `nixpacks.toml` file had environment variables defined in the `[variables]` section, which Railway tries to use as **build-time secrets**. These should be **runtime variables** instead.

---

## ✅ Solution Applied

### Fixed `nixpacks.toml`
Removed the `[variables]` section that was causing the issue:

**Before:**
```toml
[phases.setup]
nixPkgs = ["ghostscript", "qpdf", "chromium", "libreoffice"]

[variables]
MAX_FILE_SIZE_MB = "100"  # ← This caused the error

[start]
cmd = "node src/app.js"
```

**After:**
```toml
[phases.setup]
nixPkgs = ["ghostscript", "qpdf", "chromium", "libreoffice"]

[start]
cmd = "node src/app.js"
```

---

## 📋 Where to Set Environment Variables

Set these in **Railway Dashboard → Variables tab** (NOT Secrets):

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `4000` | Railway may override automatically |
| `NODE_ENV` | `production` | Required for production |
| `FRONTEND_URL` | `https://pdf-master-frontend.vercel.app` | Your frontend domain |
| `MAX_FILE_SIZE_MB` | `100` | File size limit in MB |
| `TEMP_FILE_TTL_MINUTES` | `30` | Auto-cleanup time |
| `RAILWAY` | `true` | Enables Railway optimizations |
| `ALLOW_ALL_CORS` | `false` | Keep false in production |

---

## 🚀 Next Steps

### 1. Commit and Push Changes
```bash
git add backend/nixpacks.toml
git commit -m "Fix Railway build: remove variables from nixpacks.toml"
git push origin main
```

### 2. Configure Railway Variables
Go to Railway dashboard:
1. Select your project: `PDF_Master_Backend`
2. Click **"Variables"** tab
3. Add all variables listed above
4. Deployment will trigger automatically

### 3. Verify Deployment
Watch the deployment logs:
- Should see successful build
- Server should start without errors
- Health check should pass

---

## 🔧 Understanding Railway Variables vs Secrets

### Variables (Use These)
- Available at **runtime**
- Can be viewed in dashboard
- Used for configuration
- Examples: `NODE_ENV`, `FRONTEND_URL`, `MAX_FILE_SIZE_MB`

### Secrets (Don't Use for Config)
- Available at **build time**
- Encrypted and hidden
- Used for API keys, passwords
- Examples: Database URLs, API tokens

**For your PDF app, you only need Variables!**

---

## ⚠️ Common Mistakes

### ❌ Don't Do This:
- Put config variables in `nixpacks.toml [variables]`
- Add environment variables to Secrets section
- Use build secrets for runtime config

### ✅ Do This Instead:
- Keep `nixpacks.toml` minimal (just setup and start)
- Use Railway Variables tab for all config
- Only use Secrets for actual secrets (API keys, etc.)

---

## 🧪 Testing After Deployment

Once deployed successfully:

### 1. Test Health Endpoint
```
GET https://pdfmasterbackend-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "...",
  "env": "production"
}
```

### 2. Test Root Endpoint
```
GET https://pdfmasterbackend-production.up.railway.app/
```

Expected response:
```json
{
  "message": "Welcome to the PDFKit API",
  "status": "running",
  "docs": "https://pdf-master-frontend.vercel.app"
}
```

### 3. Check Startup Logs
Look for these messages in Railway logs:
```
[cors] Allowed origins: https://pdf-master-frontend.vercel.app
[startup] Production mode detected
[startup] Running on Railway platform
╔══════════════════════════════════╗
║   PDFKit API — Running on :PORT  ║
║   Environment: production        ║
╚══════════════════════════════════╝
```

---

## 🆘 If Still Failing

### Check These:
1. ✅ No `[variables]` section in `nixpacks.toml`
2. ✅ All variables set in Railway Variables tab
3. ✅ No secrets configured (unless you have API keys)
4. ✅ Build logs show npm install success
5. ✅ Deploy logs show server starting

### Debug Steps:
1. Go to Railway → Settings → Danger Zone
2. Click "Delete Cache"
3. Redeploy
4. Watch build logs carefully

---

## 📝 Summary

**What Changed:**
- Removed `[variables]` section from `nixpacks.toml`
- Variables should be set in Railway dashboard, not code

**Why It Works:**
- Railway now builds without trying to inject secrets
- Runtime variables are loaded when app starts
- Cleaner separation of code and configuration

**Next Action:**
- Push changes to trigger redeployment
- Configure variables in Railway dashboard
- Test endpoints after deployment

---

**Fixed:** March 6, 2026  
**Issue:** Railway build failure  
**Solution:** Remove build-time variables from nixpacks.toml
