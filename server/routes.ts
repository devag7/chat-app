import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginUserSchema, insertMessageSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";

interface AuthenticatedRequest extends Express.Request {
  session: session.Session & session.SessionData & {
    userId?: number;
  };
}

interface WebSocketClient extends WebSocket {
  userId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware with PostgreSQL store
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  const clients = new Map<number, WebSocketClient>();

  // Auth middleware
  const requireAuth = (req: AuthenticatedRequest, res: any, next: any) => {
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
      (req as AuthenticatedRequest).session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginUserSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      (req as AuthenticatedRequest).session.userId = user.id;
      await storage.updateUserOnlineStatus(user.id, true);
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session.userId) {
        await storage.updateUserOnlineStatus(req.session.userId, false);
      }
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { fullName, username, email } = req.body;
      const userId = authReq.session.userId!;
      
      // Check if username/email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const updatedUser = await storage.updateUser(userId, { fullName, username, email });
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { currentPassword, newPassword } = req.body;
      const userId = authReq.session.userId!;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Chat routes
  app.get("/api/users", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out current user
      const otherUsers = users.filter(user => user.id !== req.session.userId);
      res.json(otherUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const chatRooms = await storage.getChatRoomsForUser(req.session.userId!);
      res.json(chatRooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chats/:userId", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const otherUserId = parseInt(req.params.userId);
      const chatRoom = await storage.getOrCreatePrivateRoom(authReq.session.userId!, otherUserId);
      res.json(chatRoom);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const chatId = parseInt(req.params.chatId);
      const messages = await storage.getMessagesForRoom(chatId);
      await storage.markMessagesAsRead(chatId, authReq.session.userId!);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocketClient, req) => {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Authenticate WebSocket connection
          ws.userId = message.userId;
          clients.set(message.userId, ws);
          await storage.updateUserOnlineStatus(message.userId, true);
          
          // Broadcast online status update
          broadcastToAll({
            type: 'user_online',
            userId: message.userId
          });
        } else if (message.type === 'send_message') {
          if (!ws.userId) return;
          
          const messageData = insertMessageSchema.parse({
            chatRoomId: message.chatRoomId,
            content: message.content
          });
          
          const newMessage = await storage.createMessage(messageData, ws.userId);
          
          // Broadcast message to all clients in the chat room
          broadcastToRoom(message.chatRoomId, {
            type: 'new_message',
            message: newMessage
          });
        } else if (message.type === 'typing') {
          // Broadcast typing indicator
          broadcastToRoom(message.chatRoomId, {
            type: 'typing',
            userId: ws.userId,
            isTyping: message.isTyping
          }, ws.userId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        await storage.updateUserOnlineStatus(ws.userId, false);
        clients.delete(ws.userId);
        
        // Broadcast offline status update
        broadcastToAll({
          type: 'user_offline',
          userId: ws.userId
        });
      }
    });
  });

  function broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  function broadcastToRoom(chatRoomId: number, message: any, excludeUserId?: number) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN && userId !== excludeUserId) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
