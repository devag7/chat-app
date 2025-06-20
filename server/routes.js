import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcrypt';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import 'dotenv/config';

import { storage } from './storage.js';
import { 
  insertUserSchema, 
  loginUserSchema, 
  insertMessageSchema,
  insertChatRoomSchema 
} from '../shared/schema.js';

export async function registerRoutes(app) {
  // Session middleware with MongoDB store
  const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60, // 7 days
    touchAfter: 24 * 3600, // lazy session update
    collectionName: 'chattersessions', // Use different collection name
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to false for development, true for production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax' // Allow cross-site requests with cookies
    }
  }));

  const clients = new Map();

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
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      req.session.userId = user._id.toString();
      
      // Convert to plain object and remove password
      const userObj = user.toObject();
      const { password, ...userWithoutPassword } = userObj;
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
        
        // Remove from active clients
        if (clients.has(req.session.userId)) {
          clients.delete(req.session.userId);
        }
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

  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, username, email } = req.body;
      const userId = req.session.userId;
      
      // Check if username/email is already taken by another user
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ message: "Email already taken" });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, { fullName, username, email });
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error('Password update error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Chat routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out current user
      const otherUsers = users.filter(user => user._id.toString() !== req.session.userId);
      res.json(otherUsers);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chats", requireAuth, async (req, res) => {
    try {
      const chatRooms = await storage.getChatRoomsForUser(req.session.userId);
      res.json(chatRooms);
    } catch (error) {
      console.error('Get chats error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chats/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.session.userId;
      
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot create chat with yourself" });
      }
      
      const chatRoom = await storage.getOrCreatePrivateRoom(currentUserId, userId);
      res.json(chatRoom);
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.session.userId;
      
      // Check if user is member of the chat
      const isMember = await storage.isUserMemberOfRoom(userId, chatId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessagesForRoom(chatId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(chatId, userId);
      
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chats/group", requireAuth, async (req, res) => {
    try {
      const { name, memberIds } = req.body;
      const createdBy = req.session.userId;
      
      if (!name || !Array.isArray(memberIds)) {
        return res.status(400).json({ message: "Name and member IDs are required" });
      }
      
      const chatRoom = await storage.createGroupChat(name, createdBy, memberIds);
      res.json(chatRoom);
    } catch (error) {
      console.error('Create group chat error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chats/:chatId/members", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.session.userId;
      
      // Check if user is member of the chat
      const isMember = await storage.isUserMemberOfRoom(userId, chatId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getChatMembers(chatId);
      res.json(members);
    } catch (error) {
      console.error('Get chat members error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chats/:chatId/members", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userIds } = req.body;
      const currentUserId = req.session.userId;
      
      // Check if current user is member of the chat
      const isMember = await storage.isUserMemberOfRoom(currentUserId, chatId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: "User IDs must be an array" });
      }
      
      const result = await storage.addMembersToRoom(chatId, userIds);
      res.json(result);
    } catch (error) {
      console.error('Add members error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/chats/:chatId/members/:userId", requireAuth, async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      const currentUserId = req.session.userId;
      
      // Check if current user is member of the chat
      const isMember = await storage.isUserMemberOfRoom(currentUserId, chatId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Users can only remove themselves
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "Can only remove yourself" });
      }
      
      await storage.removeMemberFromRoom(chatId, userId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Store user connection
          if (message.userId) {
            ws.userId = message.userId;
            clients.set(message.userId, ws);
            await storage.updateUserOnlineStatus(message.userId, true);
            
            // Broadcast user online status
            broadcastToAll({
              type: 'user_status',
              userId: message.userId,
              isOnline: true
            });
          }
        } else if (message.type === 'message') {
          if (!ws.userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }
          
          // Validate message data
          const messageData = insertMessageSchema.parse({
            chatRoom: message.chatRoom,
            content: message.content
          });
          
          // Check if user is member of the chat
          const isMember = await storage.isUserMemberOfRoom(ws.userId, message.chatRoom);
          if (!isMember) {
            ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
            return;
          }
          
          // Save message to database
          const savedMessage = await storage.createMessage(messageData, ws.userId);
          
          // Broadcast message to room members
          broadcastToRoom(message.chatRoom, {
            type: 'new_message',
            message: savedMessage
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        console.log(`User ${ws.userId} disconnected`);
        clients.delete(ws.userId);
        await storage.updateUserOnlineStatus(ws.userId, false);
        
        // Broadcast user offline status
        broadcastToAll({
          type: 'user_status',
          userId: ws.userId,
          isOnline: false
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(messageStr);
      }
    });
  }

  async function broadcastToRoom(chatRoomId, message, excludeUserId) {
    try {
      const members = await storage.getChatMembers(chatRoomId);
      const messageStr = JSON.stringify(message);
      
      members.forEach((member) => {
        const memberId = member._id.toString();
        if (memberId !== excludeUserId && clients.has(memberId)) {
          const client = clients.get(memberId);
          if (client.readyState === client.OPEN) {
            client.send(messageStr);
          }
        }
      });
    } catch (error) {
      console.error('Broadcast to room error:', error);
    }
  }

  return httpServer;
}
