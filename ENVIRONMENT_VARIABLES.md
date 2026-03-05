# Railway Backend Environment Variables

## Required Variables

| Variable | Type | Default | Description | Example Value |
|----------|------|---------|-------------|---------------|
| `PORT` | **Required** | `4000` | Port number for the server. Railway may override this automatically. | `4000` |
| `NODE_ENV` | **Required** | `development` | Runtime environment. Set to `production` for live deployments. | `production` |
| `FRONTEND_URL` | **Required** | `https://www.pdfkit.fun` | URL of your frontend application. Used for CORS configuration. | `https://pdf-master-frontend.vercel.app` |

## Optional Variables

| Variable | Type | Default | Description | Recommended Value |
|----------|------|---------|-------------|-------------------|
| `MAX_FILE_SIZE_MB` | Optional | `100` | Maximum allowed file size in megabytes. Range: 1-500. | `100` |
| `TEMP_FILE_TTL_MINUTES` | Optional | `30` | How long temporary files are kept before auto-cleanup (in minutes). | `30` |
| `RAILWAY` | Optional | `false` | Enables Railway-specific optimizations (startup delays, logging). | `true` |
| `ALLOW_ALL_CORS` | Optional | `false` | **Debug only!** Allows all origins. Never use in production. | `false` |

---

## Configuration Examples

### Production Setup (Recommended)

```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://pdf-master-frontend.vercel.app
MAX_FILE_SIZE_MB=100
TEMP_FILE_TTL_MINUTES=30
RAILWAY=true
ALLOW_ALL_CORS=false
```

### Development/Debugging Setup

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=100
TEMP_FILE_TTL_MINUTES=30
RAILWAY=false
ALLOW_ALL_CORS=true
```

---

## Detailed Variable Descriptions

### PORT
- **Purpose:** Specifies which port the server listens on
- **Railway Behavior:** Railway automatically sets this via their platform
- **When to Change:** Never change this; Railway manages it
- **Notes:** The default `4000` is used as fallback if Railway doesn't set it

### NODE_ENV
- **Purpose:** Controls error messages, logging, and optimizations
- **Values:** 
  - `development` - Shows detailed errors, enables verbose logging
  - `production` - Shows generic errors, optimized performance
- **When to Change:** Always use `production` for live deployments
- **Security Impact:** Using `development` in production exposes sensitive information

### FRONTEND_URL
- **Purpose:** Whitelists your frontend domain for CORS security
- **Format:** Must include protocol (`https://`) but no trailing slash
- **Common Values:**
  - Vercel: `https://your-app.vercel.app`
  - Netlify: `https://your-app.netlify.app`
  - Custom: `https://yourdomain.com`
- **When to Change:** Update when deploying to different environments
- **Troubleshooting:** If CORS errors occur, verify this matches your actual frontend URL exactly

### MAX_FILE_SIZE_MB
- **Purpose:** Limits maximum file upload size
- **Range:** 1-500 MB (Railway platform limit is 500MB)
- **Performance Impact:** Larger files require more processing time and memory
- **When to Change:** 
  - Increase for large PDF operations
  - Decrease to prevent server overload
- **Recommendation:** Start with 100MB, adjust based on usage

### TEMP_FILE_TTL_MINUTES
- **Purpose:** Auto-deletes temporary files after processing
- **Impact:** Prevents disk space exhaustion
- **When to Change:**
  - Increase if processing takes longer than 30 minutes
  - Decrease for faster cleanup (minimum 5 minutes)
- **Cleanup Frequency:** Files are checked every 10 minutes

### RAILWAY
- **Purpose:** Enables platform-specific optimizations
- **Effects When Enabled:**
  - Adds 2-second startup delay (filesystem readiness)
  - Enhanced production logging
  - Railway-specific error handling
- **When to Change:** Set to `true` when deploying on Railway

### ALLOW_ALL_CORS
- **Purpose:** Temporarily disables CORS restrictions
- **⚠️ WARNING:** Never use in production! Security risk!
- **Use Cases:**
  - Debugging CORS issues locally
  - Testing from multiple domains during development
- **When to Change:** Only for temporary debugging sessions

---

## How to Set Variables in Railway

### Method 1: Railway Dashboard (Recommended)

1. Go to https://railway.app
2. Select your project
3. Click **"Variables"** tab
4. Click **"New Variable"** button
5. Enter variable name and value
6. Click **"Add"** to save
7. Deployment triggers automatically

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Set variables
railway variables set PORT=4000
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=https://your-frontend.vercel.app

# View current variables
railway variables
```

---

## Troubleshooting

### CORS Errors
**Problem:** Frontend requests blocked by CORS policy

**Solution:**
1. Verify `FRONTEND_URL` matches your actual frontend URL exactly
2. Check for trailing slashes (remove them)
3. Ensure protocol is included (`https://`)
4. Wait 2-3 minutes for redeployment
5. Test with `ALLOW_ALL_CORS=true` temporarily to confirm CORS is the issue

### Server Won't Start
**Problem:** Railway shows deployment failed

**Solution:**
1. Check `NODE_ENV` is set to `production`
2. Verify `PORT` is not conflicting with other services
3. Review Railway logs for specific error messages
4. Try removing `RAILWAY` variable temporarily

### File Upload Fails
**Problem:** Large files fail to upload or process

**Solution:**
1. Increase `MAX_FILE_SIZE_MB` gradually
2. Check Railway platform limits (500MB max)
3. Reduce `TEMP_FILE_TTL_MINUTES` if running out of space
4. Monitor memory usage in Railway dashboard

### Generic "Something Went Wrong" Error
**Problem:** Non-specific error when processing files

**Solution:**
1. Temporarily set `NODE_ENV=development` to see detailed errors
2. Check browser console for specific error messages
3. Review Railway runtime logs
4. Verify all required variables are set correctly

---

## Quick Reference Card

### Minimum Required (Must Have)
```
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
```

### Recommended Production
```
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
MAX_FILE_SIZE_MB=100
TEMP_FILE_TTL_MINUTES=30
RAILWAY=true
```

### Debug Mode (Temporary!)
```
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ALLOW_ALL_CORS=true
```

---

## Security Best Practices

✅ **DO:**
- Use `production` for `NODE_ENV` in live deployments
- Set specific `FRONTEND_URL` matching your domain
- Keep `ALLOW_ALL_CORS=false` in production
- Regularly rotate any API keys or secrets
- Monitor Railway logs for unauthorized access attempts

❌ **DON'T:**
- Use `ALLOW_ALL_CORS=true` in production (security risk!)
- Use `NODE_ENV=development` in production (exposes errors)
- Commit `.env` files to git (add to `.gitignore`)
- Share environment variable values publicly
- Use HTTP URLs for `FRONTEND_URL` (always HTTPS)

---

## Monitoring & Validation

After setting variables, verify they're working:

### 1. Check Deployment Logs
Railway Dashboard → Deployments → Latest → View Logs

Look for:
```
[cors] Allowed origins: https://your-frontend.com
[startup] Production mode detected
[startup] Running on Railway platform
```

### 2. Test Health Endpoint
```
GET https://your-railway-app.up.railway.app/health
```

Expected response includes your environment:
```json
{
  "status": "ok",
  "env": "production"
}
```

### 3. Test CORS
From browser console on your frontend:
```javascript
fetch('https://your-railway-app.up.railway.app/')
  .then(r => r.json())
  .then(console.log)
```

Should succeed without CORS errors.

---

**Last Updated:** March 5, 2026  
**Version:** 1.0  
**Platform:** Railway.com
