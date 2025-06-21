# ChatApp

✅ **FULLY CONVERTED TO JAVASCRIPT** - TypeScript removal complete!

A modern real-time chat application built with React, Node.js, Express, and MongoDB Atlas.

## Features

- Real-time messaging with WebSocket support
- User authentication and session management
- Private and group chat rooms
- Modern UI with dark/light theme support
- MongoDB Atlas database integration
- Responsive design with Tailwind CSS

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- npm or yarn package manager

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ChatApp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up MongoDB Atlas

1. Create a MongoDB Atlas account at [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your connection string from the "Connect" button

### 4. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your MongoDB Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.abc123.mongodb.net/chatapp?retryWrites=true&w=majority
   SESSION_SECRET=your-super-secret-session-key-here
   NODE_ENV=development
   PORT=5000
   ```

   **Important:** Replace the following in your connection string:
   - `username` with your MongoDB Atlas username
   - `password` with your MongoDB Atlas password
   - `cluster.abc123.mongodb.net` with your actual cluster address
   - `chatapp` with your preferred database name

### 5. Start the Application

For development:
```bash
npm run dev
```

For production:
```bash
npm run build
npm start
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
ChatApp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── pages/          # Page components
│   └── index.html
├── server/                 # Node.js backend
│   ├── db.js              # MongoDB connection
│   ├── index.js           # Server entry point
│   ├── routes.js          # API routes and WebSocket
│   ├── storage.js         # Database operations
│   └── vite.js            # Vite development server
├── shared/                 # Shared code between client/server
│   └── schema.js          # Database schemas and validation
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues

## Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **React Query** - Data fetching and caching
- **Wouter** - Lightweight router
- **Framer Motion** - Animation library

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database (via MongoDB Atlas)
- **Mongoose** - MongoDB object modeling
- **WebSockets** - Real-time communication
- **Express Session** - Session management
- **bcrypt** - Password hashing

## Features Overview

### Authentication
- User registration and login
- Secure password hashing with bcrypt
- Session-based authentication
- Automatic session persistence

### Real-time Messaging
- WebSocket-based real-time communication
- Online/offline user status
- Typing indicators
- Message read receipts

### Chat Functionality
- Private one-on-one conversations
- Group chat rooms
- Message history
- User presence indicators

### UI/UX
- Modern, responsive design
- Dark and light theme support
- Smooth animations and transitions
- Mobile-friendly interface

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure your MongoDB Atlas connection string is correct
   - Check that your IP address is whitelisted in MongoDB Atlas
   - Verify your username and password are correct

2. **Port Already in Use**
   - Change the PORT in your `.env` file
   - Or stop the process using port 5000: `lsof -ti:5000 | xargs kill -9`

3. **Dependencies Issues**
   - Delete `node_modules` and `package-lock.json`, then run `npm install` again
   - Make sure you're using Node.js v16 or higher

4. **WebSocket Connection Issues**
   - Check your firewall settings
   - Ensure the server is running on the correct port
   - Try refreshing the browser page

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information about the problem

## Changelog

### v1.0.0
- Initial release
- Complete migration from TypeScript to JavaScript
- MongoDB Atlas integration
- Real-time chat functionality
- Modern UI with Tailwind CSS
- User authentication system
