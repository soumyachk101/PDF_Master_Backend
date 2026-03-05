# Railway Deployment Checklist ✓

## Pre-Deployment

- [ ] All code changes committed to git
- [ ] `.gitkeep` file exists in `backend/temp/` directory
- [ ] Environment variables configured in Railway dashboard:
  - [ ] `PORT=4000` (Railway will override)
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL=https://your-frontend-domain.com`
  - [ ] `MAX_FILE_SIZE_MB=100`
  - [ ] `TEMP_FILE_TTL_MINUTES=30`
  - [ ] `RAILWAY=true`

## Deployment Steps

### Step 1: Push to Git
```bash
git add .
git commit -m "Fix Railway deployment issues"
git push origin main
```

### Step 2: Railway Auto-Deploy
- Railway will automatically detect the push
- Build process will start automatically
- System dependencies will be installed (this takes 3-5 minutes)

### Step 3: Verify Deployment
Check these in Railway dashboard:
- [ ] Build completed successfully
- [ ] No errors in build logs
- [ ] Server started successfully
- [ ] Health check passes

## Post-Deployment Verification

### Test Endpoints

1. **Health Check**
   ```
   GET https://your-app.railway.app/health
   Expected: {"status": "ok", ...}
   ```

2. **Root Endpoint**
   ```
   GET https://your-app.railway.app/
   Expected: Welcome message
   ```

3. **Test PDF Upload**
   ```
   POST https://your-app.railway.app/api/pdf/merge-pdf
   Expected: Successful processing or validation error
   ```

### Monitor Logs

Watch for these messages in startup logs:
- ✓ `[startup] Created temp directory`
- ✓ `[cors] Allowed origins: ...`
- ✓ `PDFKit API — Running on :PORT`
- ✓ `[startup] Production mode detected`
- ✓ `[startup] Running on Railway platform`

## Common Issues & Solutions

### ❌ Build Fails
**Solution**: Check nixpacks.toml and Aptfile have all required packages

### ❌ Server Won't Start
**Solution**: 
1. Check PORT environment variable
2. Verify temp directory creation in logs
3. Check for dependency installation errors

### ❌ PDF Processing Fails
**Solution**: 
1. Verify LibreOffice and Poppler installed (check build logs)
2. Ensure ghostscript is available
3. Check file size limits

### ❌ CORS Errors
**Solution**: Update FRONTEND_URL to match your actual frontend domain

## Testing Locally

Before deploying, test with production settings:

```bash
cd backend
npm install --legacy-peer-deps
RAILWAY=true NODE_ENV=production npm start
```

Then visit: http://localhost:4000/health

## Monitoring

### Railway Dashboard
- Deployments tab: View current and past deployments
- Logs tab: Real-time application logs
- Metrics tab: Resource usage (CPU, Memory, Network)
- Settings → Variables: Environment variables

### Alerts to Watch
- High memory usage (>80%)
- Slow response times
- Frequent restarts
- File system errors

## Next Steps After Deployment

1. Update frontend URL to point to new Railway backend
2. Test all PDF processing endpoints
3. Monitor logs for first few hours
4. Set up monitoring alerts if needed
5. Consider enabling persistent storage for temp files (optional)

## Support Resources

- Railway Docs: https://docs.railway.app
- Nixpacks Docs: https://nixpacks.com
- Railway Discord: https://discord.gg/railway
- Project DEPLOYMENT.md: Detailed guide and troubleshooting

---

**Last Updated**: March 5, 2026
**Status**: Ready for Deployment ✓
