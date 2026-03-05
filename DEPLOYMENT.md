# Railway Deployment Guide

## Fixes Applied

The following issues have been fixed to ensure smooth deployment on Railway.com:

### 1. **System Dependencies**
- Added `ghostscript`, `poppler-utils`, and `libreoffice` to both `nixpacks.toml` and `Aptfile`
- These are required for PDF manipulation, image conversion, and Office document processing

### 2. **Port Configuration**
- Updated server to bind to `0.0.0.0` instead of localhost
- Railway dynamically assigns ports via the `PORT` environment variable
- Added proper port parsing with fallback to 4000

### 3. **Temp Directory Management**
- Added `.gitkeep` file to ensure temp directory is tracked in git
- Enhanced error handling for temp directory creation
- Added postinstall script to create temp directory automatically
- Improved cleanup utility with better error handling

### 4. **Startup Stability**
- Added startup delay (2 seconds) when running on Railway platform
- This ensures filesystem is ready before server starts
- Added detailed logging for production environment detection

### 5. **CORS Configuration**
- Enhanced CORS logging for debugging
- Added credentials option
- Improved origin validation logging

### 6. **Dependency Installation**
- Changed to `npm install --legacy-peer-deps` to avoid peer dependency conflicts
- Some packages (sharp, pdf-lib) may have conflicting peer dependencies

## Environment Variables Required

Set these in your Railway project dashboard:

```env
PORT=4000                          # Railway will override this
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
MAX_FILE_SIZE_MB=100
TEMP_FILE_TTL_MINUTES=30
RAILWAY=true                       # Enables Railway-specific optimizations
```

## Deployment Steps

1. **Connect Repository to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Build Settings**
   Railway will automatically detect Node.js and use nixpacks
   - No additional configuration needed
   - System dependencies will be installed from `nixpacks.toml` and `Aptfile`

3. **Set Environment Variables**
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add all required environment variables listed above

4. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Initial deployment may take 3-5 minutes due to system package installation

## Troubleshooting

### Common Issues

#### 1. **Build Fails with "Module not found"**
- Check that all dependencies are in `package.json`
- Run `npm install --legacy-peer-deps` locally to verify
- Clear Railway cache: Settings → Danger Zone → Delete Cache

#### 2. **Server Won't Start**
- Check logs in Railway dashboard
- Verify PORT environment variable is set correctly
- Ensure temp directory creation succeeds (check startup logs)

#### 3. **PDF Conversion Fails**
- LibreOffice or Poppler might not be installed
- Check build logs for nixpacks setup phase
- Verify `nixpacks.toml` includes all required packages

#### 4. **CORS Errors**
- Update `FRONTEND_URL` to match your actual frontend domain
- Check CORS logs in backend console
- Ensure frontend is making requests to correct backend URL

#### 5. **File Upload Issues**
- Verify `MAX_FILE_SIZE_MB` is appropriate for your use case
- Check Railway's file size limits (default 500MB)
- Ensure temp directory has write permissions

### Viewing Logs

In Railway dashboard:
1. Go to your deployment
2. Click "Deployments" tab
3. Click on the latest deployment
4. View real-time logs

### Local Testing

Test the Railway configuration locally:

```bash
cd backend
npm install --legacy-peer-deps
RAILWAY=true NODE_ENV=production npm start
```

## Monitoring

### Health Check Endpoint
Access `/health` to verify server is running:
```
https://your-railway-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2026-03-05T...",
  "env": "production"
}
```

### Root Endpoint
Access `/` to verify API is accessible:
```
https://your-railway-app.railway.app/
```

## Performance Tips

1. **Enable Persistent Storage** (Optional)
   - Railway volumes can persist temp files across restarts
   - Mount volume to `/app/backend/temp`
   - Not required but can improve reliability

2. **Increase Memory** (If needed)
   - Default: 512MB RAM
   - For heavy PDF processing, consider upgrading to 1GB+
   - Settings → Resources → Memory

3. **Auto-Scale** (For high traffic)
   - Railway auto-scales horizontally
   - Configure in Settings → Scaling

## Support

If you encounter issues:
1. Check Railway documentation: https://docs.railway.app
2. Review build and runtime logs
3. Verify all environment variables are set correctly
4. Test locally with production settings
