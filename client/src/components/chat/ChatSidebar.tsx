import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Settings, LogOut } from "lucide-react";
import { ChatRoomWithMembers, UserWithStatus, User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ChatSidebarProps {
  user: User | undefined;
  chats: ChatRoomWithMembers[];
  users: UserWithStatus[];
  selectedChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onStartChat: (userId: number) => void;
  onlineUsers: Set<number>;
}

export default function ChatSidebar({
  user,
  chats,
  users,
  selectedChatId,
  onSelectChat,
  onStartChat,
  onlineUsers,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      // Force immediate redirect by reloading the page
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const getGradientClass = (id: number) => {
    const gradients = [
      "from-blue-500 to-purple-500",
      "from-green-500 to-teal-500",
      "from-pink-500 to-rose-500",
      "from-orange-500 to-red-500",
      "from-purple-500 to-indigo-500",
      "from-yellow-500 to-orange-500",
    ];
    return gradients[id % gradients.length];
  };

  const formatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getOtherUser = (chat: ChatRoomWithMembers): UserWithStatus | null => {
    if (!chat.isPrivate || !user) return null;
    return chat.members.find(member => member.id !== user.id) || null;
  };

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const otherUser = getOtherUser(chat);
    if (otherUser) {
      return otherUser.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !chats.some(chat => {
      const otherUser = getOtherUser(chat);
      return otherUser?.id === u.id;
    })
  );

  return (
    <div className="w-80 chat-sidebar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(user?.id || 0)} user-avatar`}>
              <span className="text-sm">{user ? getInitials(user.fullName) : "U"}</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {user?.fullName || "User"}
              </h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Existing Chats */}
          {filteredChats.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-2 uppercase tracking-wide">
                Conversations
              </h4>
              {filteredChats.map((chat) => {
                const otherUser = getOtherUser(chat);
                const isSelected = selectedChatId === chat.id;
                const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg mb-1 transition-colors ${
                      isSelected ? "chat-item-active" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className={`w-12 h-12 bg-gradient-to-r ${getGradientClass(otherUser?.id || chat.id)} user-avatar`}>
                          <span className="text-sm">
                            {otherUser ? otherUser.initials : chat.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className={isOnline ? "online-indicator" : "offline-indicator"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {otherUser ? otherUser.fullName : chat.name}
                          </h4>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(chat.lastMessage.createdAt!)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {chat.lastMessage.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            {chat.lastMessage && chat.lastMessage.senderId === user?.id && (
                              <>
                                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                              </>
                            )}
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available Users */}
          {filteredUsers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-2 uppercase tracking-wide">
                Start New Chat
              </h4>
              {filteredUsers.map((availableUser) => {
                const isOnline = onlineUsers.has(availableUser.id);
                
                return (
                  <div
                    key={availableUser.id}
                    onClick={() => onStartChat(availableUser.id)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg mb-1 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(availableUser.id)} user-avatar`}>
                          <span className="text-sm">{availableUser.initials}</span>
                        </div>
                        <div className={isOnline ? "online-indicator" : "offline-indicator"} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {availableUser.fullName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{availableUser.username}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
