import express from "express";
import cors from "cors";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcrypt';
import 'dotenv/config';

import { connectDB } from "../server/db.js";
import { storage } from "../server/storage.js";
import { 
  insertUserSchema, 
  loginUserSchema, 
  insertMessageSchema,
  insertChatRoomSchema 
} from '../shared/schema.js';

const app = express();

// CORS configuration for Vercel
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware with MongoDB store
let sessionStore;

// Initialize the application
let isInitialized = false;

async function initializeApp() {
  if (isInitialized) return;
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Database connected successfully');

    // Create session store
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 7 * 24 * 60 * 60, // 7 days
      touchAfter: 24 * 3600, // lazy session update
      collectionName: 'chattersessions',
    });

    // Session middleware
    app.use(session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      name: 'chatapp.sid',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
      }
    }));

    // Auth middleware
    const requireAuth = (req, res, next) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      next();
    };

    // Auth routes
    app.post("/api/auth/register", async (req, res) => {
      try {
        const userData = insertUserSchema.parse(req.body);
        
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }
        
        const user = await storage.createUser(userData);
        req.session.userId = user._id.toString();
        
        const userObj = user.toObject();
        const { password, ...userWithoutPassword } = userObj;
        userWithoutPassword.id = userWithoutPassword._id.toString();
        res.json(userWithoutPassword);
      } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ message: error.message });
      }
    });

    app.post("/api/auth/login", async (req, res) => {
      try {
        const { email, password } = loginUserSchema.parse(req.body);
        
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(400).json({ message: "Invalid credentials" });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Invalid credentials" });
        }
        
        req.session.userId = user._id.toString();
        await storage.updateUserOnlineStatus(user._id, true);
        
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ message: error.message });
      }
    });

    app.post("/api/auth/logout", requireAuth, async (req, res) => {
      try {
        if (req.session.userId) {
          await storage.updateUserOnlineStatus(req.session.userId, false);
        }
        
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ message: "Could not log out" });
          }
          res.json({ message: "Logged out successfully" });
        });
      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    app.get("/api/auth/me", requireAuth, async (req, res) => {
      try {
        const user = await storage.getUserById(req.session.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // User routes
    app.get("/api/users", requireAuth, async (req, res) => {
      try {
        const users = await storage.getUsers();
        res.json(users);
      } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // Chat routes
    app.get("/api/chats", requireAuth, async (req, res) => {
      try {
        const chats = await storage.getUserChats(req.session.userId);
        res.json(chats);
      } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    app.post("/api/chats", requireAuth, async (req, res) => {
      try {
        const { recipientId } = req.body;
        
        const existingChat = await storage.findPrivateChat(req.session.userId, recipientId);
        if (existingChat) {
          return res.json(existingChat);
        }
        
        const chat = await storage.createPrivateChat(req.session.userId, recipientId);
        res.json(chat);
      } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    app.post("/api/chats/group", requireAuth, async (req, res) => {
      try {
        const { name, memberIds } = insertChatRoomSchema.parse(req.body);
        
        const allMemberIds = [req.session.userId, ...memberIds];
        const chat = await storage.createGroupChat(name, req.session.userId, allMemberIds);
        res.json(chat);
      } catch (error) {
        console.error('Create group chat error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // Message routes
    app.get("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
      try {
        const messages = await storage.getChatMessages(req.params.chatId);
        res.json(messages);
      } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    app.post("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
      try {
        const { content } = insertMessageSchema.parse(req.body);
        const chatId = req.params.chatId;
        
        const message = await storage.createMessage(chatId, req.session.userId, content);
        res.json(message);
      } catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ message: error.message });
      }
    });

    // Error handling
    app.use((err, req, res, next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error('Error:', err);
    });
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  try {
    // Set CORS headers for Vercel
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
