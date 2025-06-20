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
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatRooms: Map<number, ChatRoom>;
  private chatMembers: Map<number, ChatMember>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentChatRoomId: number;
  private currentChatMemberId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.chatRooms = new Map();
    this.chatMembers = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentChatRoomId = 1;
    this.currentChatMemberId = 1;
    this.currentMessageId = 1;
  }

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
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(userId, user);
    }
  }

  async getAllUsers(): Promise<UserWithStatus[]> {
    return Array.from(this.users.values()).map(user => this.toUserWithStatus(user));
  }

  async createChatRoom(insertChatRoom: InsertChatRoom, createdBy: number): Promise<ChatRoom> {
    const id = this.currentChatRoomId++;
    const chatRoom: ChatRoom = {
      id,
      name: insertChatRoom.name,
      isPrivate: insertChatRoom.isPrivate ?? true,
      createdBy,
      createdAt: new Date(),
    };
    this.chatRooms.set(id, chatRoom);
    
    // Add creator as member
    await this.addMemberToRoom(id, createdBy);
    
    return chatRoom;
  }

  async getChatRoomsForUser(userId: number): Promise<ChatRoomWithMembers[]> {
    const userMemberships = Array.from(this.chatMembers.values())
      .filter(member => member.userId === userId);
    
    const chatRoomsWithMembers: ChatRoomWithMembers[] = [];
    
    for (const membership of userMemberships) {
      const chatRoom = this.chatRooms.get(membership.chatRoomId!);
      if (chatRoom) {
        const allMembers = Array.from(this.chatMembers.values())
          .filter(member => member.chatRoomId === chatRoom.id);
        
        const members: UserWithStatus[] = [];
        for (const member of allMembers) {
          const user = this.users.get(member.userId!);
          if (user) {
            members.push(this.toUserWithStatus(user));
          }
        }

        // Get last message
        const roomMessages = Array.from(this.messages.values())
          .filter(msg => msg.chatRoomId === chatRoom.id)
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        
        const lastMessage = roomMessages[0];
        
        // Count unread messages
        const unreadCount = roomMessages.filter(msg => 
          msg.senderId !== userId && !msg.isRead
        ).length;

        chatRoomsWithMembers.push({
          ...chatRoom,
          members,
          lastMessage,
          unreadCount,
        });
      }
    }
    
    return chatRoomsWithMembers;
  }

  async getOrCreatePrivateRoom(user1Id: number, user2Id: number): Promise<ChatRoom> {
    // Check if private room already exists between these users
    const user1Memberships = Array.from(this.chatMembers.values())
      .filter(member => member.userId === user1Id);
    
    for (const membership of user1Memberships) {
      const chatRoom = this.chatRooms.get(membership.chatRoomId!);
      if (chatRoom && chatRoom.isPrivate) {
        const roomMembers = Array.from(this.chatMembers.values())
          .filter(member => member.chatRoomId === chatRoom.id);
        
        if (roomMembers.length === 2 && 
            roomMembers.some(member => member.userId === user2Id)) {
          return chatRoom;
        }
      }
    }
    
    // Create new private room
    const user2 = this.users.get(user2Id);
    const chatRoom = await this.createChatRoom({
      name: `Private chat`,
      isPrivate: true,
    }, user1Id);
    
    await this.addMemberToRoom(chatRoom.id, user2Id);
    
    return chatRoom;
  }

  async addMemberToRoom(chatRoomId: number, userId: number): Promise<ChatMember> {
    const id = this.currentChatMemberId++;
    const chatMember: ChatMember = {
      id,
      chatRoomId,
      userId,
      joinedAt: new Date(),
    };
    this.chatMembers.set(id, chatMember);
    return chatMember;
  }

  async createMessage(insertMessage: InsertMessage, senderId: number): Promise<MessageWithSender> {
    const id = this.currentMessageId++;
    const message: Message = {
      id,
      chatRoomId: insertMessage.chatRoomId!,
      senderId,
      content: insertMessage.content,
      createdAt: new Date(),
      isRead: false,
    };
    this.messages.set(id, message);
    
    const sender = this.users.get(senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }
    
    return {
      ...message,
      sender: this.toUserWithStatus(sender),
    };
  }

  async getMessagesForRoom(chatRoomId: number): Promise<MessageWithSender[]> {
    const roomMessages = Array.from(this.messages.values())
      .filter(msg => msg.chatRoomId === chatRoomId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    
    const messagesWithSender: MessageWithSender[] = [];
    
    for (const message of roomMessages) {
      const sender = this.users.get(message.senderId!);
      if (sender) {
        messagesWithSender.push({
          ...message,
          sender: this.toUserWithStatus(sender),
        });
      }
    }
    
    return messagesWithSender;
  }

  async markMessagesAsRead(chatRoomId: number, userId: number): Promise<void> {
    Array.from(this.messages.values())
      .filter(msg => msg.chatRoomId === chatRoomId && msg.senderId !== userId)
      .forEach(msg => {
        msg.isRead = true;
        this.messages.set(msg.id, msg);
      });
  }
}

export const storage = new MemStorage();
