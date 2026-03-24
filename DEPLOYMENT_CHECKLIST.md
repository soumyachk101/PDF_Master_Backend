# 🚀 Railway Deployment Checklist - Quick Fix

## ✅ Critical Issues Fixed

### 1. **app.js Restored** ✓
- Added all missing middleware (rate limiting, body parser, etc.)
- Temp directory creation with error handling
- Auto-cleanup cron job for temp files
- Proper startup delay for Railway platform
- Enhanced CORS configuration
- Better error handling and logging

### 2. **nixpacks.toml Fixed** ✓
- Removed build-time variables that caused secret errors
- Clean configuration for Railway deployment

---

## 📋 Pre-Deployment Checklist

### Step 1: Verify Railway Variables
Go to Railway Dashboard → Your Project → **Variables** tab

Ensure these are set (NOT in Secrets):

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://pdf-master-frontend.vercel.app
MAX_FILE_SIZE_MB=100
TEMP_FILE_TTL_MINUTES=30
RAILWAY=true
ALLOW_ALL_CORS=false
```

⚠️ **Important:** 
- Variables go in **Variables** tab
- Do NOT put them in Secrets
- No `[variables]` section in nixpacks.toml

### Step 2: Commit and Push Changes

```bash
cd d:\PDF_Master
git add backend/src/app.js
git add backend/nixpacks.toml
git commit -m "Fix: Restore complete app.js with all middleware and fix nixpacks"
git push origin main
```

### Step 3: Monitor Deployment

1. Go to Railway dashboard
2. Watch the deployment logs
3. Look for successful startup messages:

```
✓ Build completed successfully
✓ npm install completed
✓ Server started
[cors] Allowed origins: https://pdf-master-frontend.vercel.app
[startup] Created temp directory
[startup] Production mode detected
[startup] Running on Railway platform
╔══════════════════════════════════╗
║   PDFKit API — Running on :PORT  ║
║   Environment: production        ║
╚══════════════════════════════════╝
```

---

## 🧪 Testing After Deployment

### Test 1: Health Check
Visit: `https://pdfmasterbackend-production.up.railway.app/health`

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "...",
  "env": "production"
}
```

### Test 2: Root Endpoint
Visit: `https://pdfmasterbackend-production.up.railway.app/`

Expected response:
```json
{
  "message": "Welcome to the PDFKit API",
  "status": "running",
  "docs": "https://pdf-master-frontend.vercel.app"
}
```

### Test 3: File Upload
Try processing a small PDF file (< 1MB) from your frontend.

Should work without "Something went wrong" error.

---

## 🔍 Troubleshooting

### If Deployment Still Fails

**Check Build Logs For:**
- Missing dependencies → Run `npm install --legacy-peer-deps` locally
- System package errors → Verify nixpacks.toml has correct packages
- Port binding errors → Ensure PORT variable is set

**Common Issues:**

#### Error: "Cannot find module 'express-rate-limit'"
```bash
# In backend directory
npm install express-rate-limit node-cron
git add backend/package.json
git commit -m "Add missing dependencies"
git push
```

#### Error: "Failed to create temp directory"
- Check Railway has write permissions
- Temp directory should be auto-created by app.js

#### Error: "CORS blocked"
- Verify FRONTEND_URL matches your actual frontend domain exactly
- Remove trailing slashes from URL
- Wait 2-3 minutes for redeployment

### If App Crashes on Startup

**Check Deploy Logs:**
1. Railway Dashboard → Deployments → Latest → Deploy Logs
2. Look for crash reason
3. Common causes:
   - Missing environment variables
   - Port already in use
   - Uncaught exception during startup

**Quick Debug:**
Temporarily set in Railway Variables:
```
NODE_ENV=development
```
This shows detailed error messages instead of generic ones.

---

## 📊 What Was Wrong

### Previous app.js Issues:
❌ Missing rate limiting middleware  
❌ No body parser size limits  
❌ No temp directory setup  
❌ No cleanup cron job  
❌ Simplified CORS without flexibility  
❌ Missing 404 handler  
❌ No startup delay for Railway  
❌ Basic error handling  

### Current app.js Fixes:
✅ Complete middleware stack  
✅ Request size limits (1mb)  
✅ Auto temp directory creation  
✅ Scheduled cleanup every 10 minutes  
✅ Flexible CORS with debugging  
✅ Proper 404 handler  
✅ Railway-specific startup delay  
✅ Enhanced error handling and logging  

---

## 🎯 Success Indicators

Your deployment is successful when you see:

**In Railway Logs:**
```
[startup] Created temp directory
[cors] Allowed origins: https://pdf-master-frontend.vercel.app
[startup] Production mode detected
[startup] Running on Railway platform
PDFKit API — Running on :4000
```

**Health Check Returns:**
- Status: "ok"
- Env: "production"
- Uptime increasing

**Frontend Works:**
- Can upload files
- Processing completes
- Downloads work
- No "Something went wrong" errors

---

## 🆘 Emergency Rollback

If something goes terribly wrong:

1. Don't panic!
2. Go to Railway → Deployments
3. Find last working deployment
4. Click "Promote to Production"
5. Investigate issues separately

---

## 📞 Getting Help

When asking for help, provide:

1. **Deploy Logs** (last 50 lines)
2. **Error Message** (exact text from Railway)
3. **Environment Variables** (screenshot from Variables tab)
4. **Health Check Response** (JSON from /health endpoint)

---

**Next Steps:**
1. ✅ Verify Railway Variables are set correctly
2. ✅ Push changes to trigger deployment
3. ✅ Monitor logs for successful startup
4. ✅ Test health endpoint
5. ✅ Try file upload from frontend

**Estimated Deployment Time:** 3-5 minutes after push

Good luck! 🚀
