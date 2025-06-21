# ChatApp - Deployment Guide

## Prerequisites

1. **MongoDB Atlas Setup**: Ensure you have a MongoDB Atlas cluster with the connection string
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository**: Code should be pushed to GitHub (already done)

## Environment Variables

Create a `.env` file in the project root with:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random
NODE_ENV=development
```

For production (Vercel), set these environment variables in your Vercel dashboard:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random
NODE_ENV=production
```

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment**:
   - Copy `.env.example` to `.env`
   - Update the MongoDB connection string
   - Set a strong session secret

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Test the Application**:
   - Open http://localhost:3000
   - Register a new account
   - Test login/logout functionality
   - Test real-time messaging

## Vercel Deployment

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
   - Generate a strong random `SESSION_SECRET`

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

## Troubleshooting

### Common Issues

1. **Login Not Working**:
   - Check that `SESSION_SECRET` is set
   - Verify MongoDB connection
   - Check browser cookies are enabled

2. **Environment Variable Issues**:
   - Make sure `.env` file exists locally
   - Verify all required variables are set in Vercel
   - Check environment variable names match exactly

3. **Build Errors**:
   - Run `npm run build` locally first
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility

4. **Cross-Platform Issues**:
   - Use `npm run dev` (with cross-env) instead of setting NODE_ENV manually
   - Make sure file paths use forward slashes
   - Check line endings (LF vs CRLF)

5. **WebSocket Issues**:
   - Ensure Vercel supports WebSockets for your plan
   - Check firewall settings
   - Verify WebSocket connection in browser dev tools

### Development on Windows

The project now uses `cross-env` for cross-platform compatibility:

```bash
# Works on Windows, macOS, and Linux
npm run dev
npm run start
```

### Session Issues

If login/logout isn't working:

1. Clear browser cookies and local storage
2. Check that `SESSION_SECRET` is set and consistent
3. Verify MongoDB connection for session store
4. Check browser network tab for 401 errors

## Project Features

- **Real-time messaging** with WebSocket support
- **User authentication** with secure sessions
- **MongoDB Atlas** integration
- **Responsive design** with X.com-inspired dark theme
- **Cross-platform compatibility** with cross-env
- **Production-ready** build configuration

## Security Notes

- Always use HTTPS in production
- Set strong session secrets (min 32 characters)
- Keep MongoDB credentials secure
- Enable MongoDB IP whitelist for production
- Regular security updates for dependencies
