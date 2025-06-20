import mongoose from 'mongoose';
import { z } from 'zod';

// Session schema for MongoDB session store
const sessionSchema = new mongoose.Schema({
  _id: String,
  expires: { type: Date, index: true },
  session: String
});

export const Session = mongoose.model('Session', sessionSchema);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Add virtual for initials
userSchema.virtual('initials').get(function() {
  return this.fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export const User = mongoose.model('User', userSchema);

// Chat room schema
const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isPrivate: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// Message schema
const messageSchema = new mongoose.Schema({
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model('Message', messageSchema);

// Validation schemas using Zod
export const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1)
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const insertMessageSchema = z.object({
  chatRoom: z.string(),
  content: z.string().min(1)
});

export const insertChatRoomSchema = z.object({
  name: z.string().min(1),
  isPrivate: z.boolean().default(true)
});

// TypeScript-like type definitions for JavaScript
export const UserTypes = {
  insertUser: insertUserSchema,
  loginUser: loginUserSchema
};

export const MessageTypes = {
  insertMessage: insertMessageSchema
};

export const ChatRoomTypes = {
  insertChatRoom: insertChatRoomSchema
};
