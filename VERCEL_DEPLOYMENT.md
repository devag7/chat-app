# Vercel Deployment Guide for ChatApp

## Overview
This guide covers deploying ChatApp to Vercel with MongoDB Atlas backend.

## Pre-deployment Setup

### 1. Environment Variables
Set up these environment variables in your Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
SESSION_SECRET=your-secure-random-session-secret
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
```

### 2. MongoDB Atlas Configuration
- Ensure your MongoDB Atlas cluster allows connections from `0.0.0.0/0` (all IPs) for Vercel serverless functions
- Or whitelist Vercel's IP ranges if you prefer more restrictive access

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
# From the project root directory
vercel --prod
```

### 4. Set Environment Variables
During deployment or in the Vercel dashboard, set the environment variables listed above.

## Configuration Files

### vercel.json
```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### API Structure
- `/api/index.js` - Serverless function that handles all API routes
- Uses Express.js middleware and MongoDB Atlas for data persistence
- Session management with MongoDB session store

## Important Notes

### WebSocket Limitations
⚠️ **WebSockets are NOT supported in Vercel serverless functions**

For real-time functionality in production, consider:
1. **Pusher** - Easy to integrate, free tier available
2. **Ably** - Real-time messaging service
3. **Socket.IO with a separate server** - Deploy WebSocket server to Railway, Render, or Heroku
4. **Vercel Edge Functions** - Limited WebSocket support (experimental)

### Current Real-time Solution
The app currently falls back to polling when WebSockets are unavailable, but for better UX in production, implement one of the solutions above.

### Build Process
- `npm run build` creates production-ready static files in `/dist`
- Vercel automatically serves these files
- API routes are handled by the serverless function

## Troubleshooting

### Common Issues

1. **"The functions property cannot be used in conjunction with the builds property"**
   - Ensure `vercel.json` only uses `functions`, not `builds`
   - Remove any `version: 2` or legacy configuration

2. **MongoDB Connection Issues**
   - Verify `MONGODB_URI` environment variable
   - Check MongoDB Atlas network access settings
   - Ensure database user has proper permissions

3. **Session/Authentication Issues**
   - Verify `SESSION_SECRET` is set
   - Check that `FRONTEND_URL` matches your Vercel domain
   - Ensure cookies are configured for production

4. **CORS Issues**
   - CORS headers are set in the API handler
   - Verify `FRONTEND_URL` environment variable

### Monitoring
- Check Vercel function logs in the dashboard
- MongoDB Atlas logs for connection issues
- Browser network tab for API call debugging

## Post-deployment Verification

1. Visit your Vercel app URL
2. Test user registration and login
3. Create chats and send messages
4. Verify all features work as expected

## Future Improvements

1. Implement proper real-time messaging (Pusher/Ably)
2. Add CDN for static assets
3. Implement proper error monitoring (Sentry)
4. Add performance monitoring
5. Set up CI/CD pipeline for automated deployments
