# ChatApp - Vercel Deployment Guide

## Prerequisites

1. **MongoDB Atlas Setup**: Ensure you have a MongoDB Atlas cluster with the connection string
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository**: Code should be pushed to GitHub (already done)

## Environment Variables

Set these environment variables in your Vercel dashboard:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-here
NODE_ENV=production
```

## Deployment Steps

1. **Connect GitHub Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository: `devag7/chat-app`

2. **Configure Build Settings**:
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**:
   - In project settings, add the environment variables listed above
   - Make sure `MONGODB_URI` points to your actual MongoDB Atlas cluster

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

## Project Structure

The app is configured with:
- **Frontend**: React + Vite (builds to `/dist`)
- **Backend**: Express.js API routes (serverless functions)
- **Database**: MongoDB Atlas
- **Real-time**: WebSocket support
- **Session Store**: MongoDB-based sessions

## Vercel Configuration

The project includes `vercel.json` with:
- API routes mapped to `/api/*`
- Static files served from `/dist`
- Proper function timeout settings
- Environment configuration

## Build Optimization

The Vite config includes:
- Manual chunk splitting for better caching
- Optimized bundle sizes
- Production-ready asset generation

## Post-Deployment

After deployment:
1. Test user registration and login
2. Verify real-time messaging works
3. Check that the app name shows as "ChatApp"
4. Confirm the black/white X.com-inspired theme is applied

## Troubleshooting

- **Build Errors**: Check that all dependencies are in `package.json`
- **API Errors**: Verify MongoDB connection string and environment variables
- **WebSocket Issues**: Ensure Vercel supports WebSockets for your plan
- **Session Issues**: Check that `SESSION_SECRET` is set

## Domain Configuration

For custom domains:
1. Go to project settings in Vercel
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable HTTPS (automatic with Vercel)
