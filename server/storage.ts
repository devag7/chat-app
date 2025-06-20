import {
  users,
  chatRooms,
  chatMembers,
  messages,
  type User,
  type InsertUser,
  type LoginUser,
  type ChatRoom,
  type ChatMember,
  type Message,
  type InsertMessage,
  type InsertChatRoom,
  type UserWithStatus,
  type ChatRoomWithMembers,
  type MessageWithSender,
  type ChatConversation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(userId: number, updates: Partial<Pick<User, 'fullName' | 'username' | 'email'>>): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  getAllUsers(): Promise<UserWithStatus[]>;
  
  // Chat room operations
  createChatRoom(chatRoom: InsertChatRoom, createdBy: number): Promise<ChatRoom>;
  getChatRoomsForUser(userId: number): Promise<ChatRoomWithMembers[]>;
  getOrCreatePrivateRoom(user1Id: number, user2Id: number): Promise<ChatRoom>;
  
  // Chat member operations
  addMemberToRoom(chatRoomId: number, userId: number): Promise<ChatMember>;
  
  // Message operations
  createMessage(message: InsertMessage, senderId: number): Promise<MessageWithSender>;
  getMessagesForRoom(chatRoomId: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(chatRoomId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private getUserInitials(fullName: string): string {
    return fullName
      .split(" ")
      .map(name => name.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }

  private toUserWithStatus(user: User): UserWithStatus {
    return {
      ...user,
      initials: this.getUserInitials(user.fullName),
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUser(userId: number, updates: Partial<Pick<User, 'fullName' | 'username' | 'email'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isOnline,
        lastSeen: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<UserWithStatus[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(user => this.toUserWithStatus(user));
  }

  async createChatRoom(insertChatRoom: InsertChatRoom, createdBy: number): Promise<ChatRoom> {
    const [chatRoom] = await db
      .insert(chatRooms)
      .values({
        ...insertChatRoom,
        createdBy,
      })
      .returning();
    
    // Add creator as member
    await this.addMemberToRoom(chatRoom.id, createdBy);
    
    return chatRoom;
  }

  async getChatRoomsForUser(userId: number): Promise<ChatRoomWithMembers[]> {
    // Get user's chat room memberships with room details
    const userChatRooms = await db
      .select({
        chatRoom: chatRooms,
      })
      .from(chatMembers)
      .innerJoin(chatRooms, eq(chatMembers.chatRoomId, chatRooms.id))
      .where(eq(chatMembers.userId, userId));

    const chatRoomsWithMembers: ChatRoomWithMembers[] = [];

    for (const { chatRoom } of userChatRooms) {
      // Get all members for this chat room
      const roomMembers = await db
        .select({
          user: users,
        })
        .from(chatMembers)
        .innerJoin(users, eq(chatMembers.userId, users.id))
        .where(eq(chatMembers.chatRoomId, chatRoom.id));

      const members = roomMembers.map(({ user }) => this.toUserWithStatus(user));

      // Get last message
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.chatRoomId, chatRoom.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Count unread messages
      const unreadMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.chatRoomId, chatRoom.id),
            eq(messages.isRead, false)
          )
        );

      const unreadCount = unreadMessages.filter(msg => msg.senderId !== userId).length;

      chatRoomsWithMembers.push({
        ...chatRoom,
        members,
        lastMessage,
        unreadCount,
      });
    }

    return chatRoomsWithMembers;
  }

  async getOrCreatePrivateRoom(user1Id: number, user2Id: number): Promise<ChatRoom> {
    // Get all private rooms where user1 is a member
    const user1Rooms = await db
      .select({
        chatRoom: chatRooms,
      })
      .from(chatMembers)
      .innerJoin(chatRooms, eq(chatMembers.chatRoomId, chatRooms.id))
      .where(
        and(
          eq(chatMembers.userId, user1Id),
          eq(chatRooms.isPrivate, true)
        )
      );

    // Check if any of these rooms also has user2 as a member
    for (const { chatRoom } of user1Rooms) {
      const roomMembers = await db
        .select()
        .from(chatMembers)
        .where(eq(chatMembers.chatRoomId, chatRoom.id));

      if (roomMembers.length === 2 && 
          roomMembers.some(member => member.userId === user2Id)) {
        return chatRoom;
      }
    }

    // Create new private room
    const chatRoom = await this.createChatRoom({
      name: "Private chat",
      isPrivate: true,
    }, user1Id);

    await this.addMemberToRoom(chatRoom.id, user2Id);

    return chatRoom;
  }

  async addMemberToRoom(chatRoomId: number, userId: number): Promise<ChatMember> {
    const [chatMember] = await db
      .insert(chatMembers)
      .values({
        chatRoomId,
        userId,
      })
      .returning();
    return chatMember;
  }

  async createMessage(insertMessage: InsertMessage, senderId: number): Promise<MessageWithSender> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        senderId,
      })
      .returning();

    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, senderId));

    if (!sender) {
      throw new Error("Sender not found");
    }

    return {
      ...message,
      sender: this.toUserWithStatus(sender),
    };
  }

  async getMessagesForRoom(chatRoomId: number): Promise<MessageWithSender[]> {
    const roomMessages = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(asc(messages.createdAt));

    return roomMessages.map(({ message, sender }) => ({
      ...message,
      sender: this.toUserWithStatus(sender),
    }));
  }

  async markMessagesAsRead(chatRoomId: number, userId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.chatRoomId, chatRoomId),
          eq(messages.isRead, false)
        )
      );
  }
}

export const storage = new DatabaseStorage();
