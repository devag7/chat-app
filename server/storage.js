import bcrypt from 'bcrypt';
import { User, ChatRoom, Message } from '../shared/schema.js';

export class DatabaseStorage {
  // Helper method to get user initials
  getUserInitials(fullName) {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  // User operations
  async createUser(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword,
      });
      
      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`${field} already exists`);
      }
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email }).lean();
      if (user) {
        return {
          ...user,
          id: user._id.toString()
        };
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await User.findById(id).lean();
      if (user) {
        return {
          ...user,
          id: user._id.toString()
        };
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const user = await User.findByIdAndUpdate(
        userId, 
        updates, 
        { new: true, runValidators: true }
      ).lean();
      
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`${field} already exists`);
      }
      throw error;
    }
  }

  async updateUserPassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await User.findByIdAndUpdate(userId, { password: hashedPassword });
    } catch (error) {
      throw error;
    }
  }

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline,
        lastSeen: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const users = await User.find({}, '-password').lean();
      return users.map(user => ({
        ...user,
        id: user._id.toString(),
        initials: this.getUserInitials(user.fullName)
      }));
    } catch (error) {
      throw error;
    }
  }

  // Chat room operations
  async createChatRoom(chatRoomData, createdBy) {
    try {
      const chatRoom = new ChatRoom({
        ...chatRoomData,
        createdBy,
        members: [createdBy]
      });
      
      const savedChatRoom = await chatRoom.save();
      return savedChatRoom;
    } catch (error) {
      throw error;
    }
  }

  async getChatRoomsForUser(userId) {
    try {
      const chatRooms = await ChatRoom.find({ 
        members: userId 
      })
      .populate('members', '-password')
      .populate('createdBy', '-password')
      .lean();

      const chatRoomsWithDetails = await Promise.all(
        chatRooms.map(async (room) => {
          // Get last message
          const lastMessage = await Message.findOne({ 
            chatRoom: room._id 
          })
          .sort({ createdAt: -1 })
          .populate('sender', 'fullName username')
          .lean();

          // Get unread count for this user
          const unreadCount = await Message.countDocuments({
            chatRoom: room._id,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId }
          });

          // Add initials to members
          const membersWithInitials = room.members.map(member => ({
            ...member,
            id: member._id.toString(),
            initials: this.getUserInitials(member.fullName)
          }));

          return {
            ...room,
            id: room._id.toString(),
            members: membersWithInitials,
            lastMessage,
            unreadCount
          };
        })
      );

      return chatRoomsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  async getOrCreatePrivateRoom(user1Id, user2Id) {
    try {
      // Try to find existing private room with both users
      let existingRoom = await ChatRoom.findOne({
        isPrivate: true,
        members: { $all: [user1Id, user2Id], $size: 2 }
      }).populate('members', '-password').lean();

      if (existingRoom) {
        return {
          ...existingRoom,
          id: existingRoom._id.toString(),
          members: existingRoom.members.map(member => ({
            ...member,
            id: member._id.toString(),
            initials: this.getUserInitials(member.fullName)
          }))
        };
      }

      // Create new private room
      const chatRoom = new ChatRoom({
        name: 'Private chat',
        isPrivate: true,
        createdBy: user1Id,
        members: [user1Id, user2Id]
      });

      const savedChatRoom = await chatRoom.save();
      const populatedRoom = await ChatRoom.findById(savedChatRoom._id)
        .populate('members', '-password')
        .lean();

      return {
        ...populatedRoom,
        id: populatedRoom._id.toString(),
        members: populatedRoom.members.map(member => ({
          ...member,
          id: member._id.toString(),
          initials: this.getUserInitials(member.fullName)
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  async createGroupChat(name, createdBy, memberIds) {
    try {
      const allMembers = [createdBy, ...memberIds.filter(id => id !== createdBy)];
      
      const chatRoom = new ChatRoom({
        name,
        isPrivate: false,
        createdBy,
        members: allMembers
      });

      const savedChatRoom = await chatRoom.save();
      const populatedRoom = await ChatRoom.findById(savedChatRoom._id)
        .populate('members', '-password')
        .lean();

      return {
        ...populatedRoom,
        id: populatedRoom._id.toString(),
        members: populatedRoom.members.map(member => ({
          ...member,
          id: member._id.toString(),
          initials: this.getUserInitials(member.fullName)
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  async addMemberToRoom(chatRoomId, userId) {
    try {
      const chatRoom = await ChatRoom.findByIdAndUpdate(
        chatRoomId,
        { $addToSet: { members: userId } },
        { new: true }
      );
      
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }
      
      return { chatRoomId, userId };
    } catch (error) {
      throw error;
    }
  }

  async addMembersToRoom(chatRoomId, userIds) {
    try {
      const chatRoom = await ChatRoom.findByIdAndUpdate(
        chatRoomId,
        { $addToSet: { members: { $each: userIds } } },
        { new: true }
      );
      
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }
      
      return userIds.map(userId => ({ chatRoomId, userId }));
    } catch (error) {
      throw error;
    }
  }

  async removeMemberFromRoom(chatRoomId, userId) {
    try {
      await ChatRoom.findByIdAndUpdate(
        chatRoomId,
        { $pull: { members: userId } }
      );
    } catch (error) {
      throw error;
    }
  }

  async getChatMembers(chatRoomId) {
    try {
      const chatRoom = await ChatRoom.findById(chatRoomId)
        .populate('members', '-password')
        .lean();
      
      if (!chatRoom) {
        throw new Error('Chat room not found');
      }

      return chatRoom.members.map(member => ({
        ...member,
        initials: this.getUserInitials(member.fullName)
      }));
    } catch (error) {
      throw error;
    }
  }

  // Message operations
  async createMessage(messageData, senderId) {
    try {
      const message = new Message({
        ...messageData,
        sender: senderId,
        chatRoom: messageData.chatRoom
      });

      const savedMessage = await message.save();
      
      // Populate sender information
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', '-password')
        .lean();

      return {
        ...populatedMessage,
        id: populatedMessage._id.toString(),
        chatRoomId: populatedMessage.chatRoom.toString(),
        senderId: populatedMessage.sender._id.toString(),
        sender: {
          ...populatedMessage.sender,
          id: populatedMessage.sender._id.toString(),
          initials: this.getUserInitials(populatedMessage.sender.fullName)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getMessagesForRoom(chatRoomId, limit = 50) {
    try {
      const messages = await Message.find({ chatRoom: chatRoomId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', '-password')
        .lean();

      return messages.reverse().map(message => ({
        ...message,
        id: message._id.toString(),
        chatRoomId: message.chatRoom.toString(),
        senderId: message.sender._id.toString(),
        sender: {
          ...message.sender,
          id: message.sender._id.toString(),
          initials: this.getUserInitials(message.sender.fullName)
        }
      }));
    } catch (error) {
      throw error;
    }
  }

  async markMessagesAsRead(chatRoomId, userId) {
    try {
      await Message.updateMany(
        { 
          chatRoom: chatRoomId,
          'readBy.user': { $ne: userId }
        },
        { 
          $push: { 
            readBy: { 
              user: userId, 
              readAt: new Date() 
            } 
          } 
        }
      );
    } catch (error) {
      throw error;
    }
  }

  // Check if user is member of chat room
  async isUserMemberOfRoom(userId, chatRoomId) {
    try {
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        members: userId
      });
      return !!chatRoom;
    } catch (error) {
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
