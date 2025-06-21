import { useState } from "react";
import { Input } from "../ui/input.jsx";
import { Button } from "../ui/button.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Search, Settings, LogOut, Plus, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient.js";
import { queryClient } from "../../lib/queryClient.js";
import { useToast } from "../../hooks/use-toast.js";
import { Link } from "wouter";
import CreateGroupModal from "./CreateGroupModal.jsx";

export default function ChatSidebar({
  user,
  chats,
  users,
  selectedChatId,
  onSelectChat,
  onStartChat,
  onlineUsers,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
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
    onError: (error) => {
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

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(n => n.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const getGradientClass = (id) => {
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

  const formatTime = (date) => {
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

  const getOtherUser = (chat) => {
    if (!chat.isPrivate || !user) return null;
    return chat.members.find(member => member.id !== user.id) || null;
  };

  // Separate and sort DMs and Groups
  const allFilteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const otherUser = getOtherUser(chat);
    if (otherUser) {
      return otherUser.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Separate DMs and Groups
  const privateChats = allFilteredChats
    .filter(chat => chat.isPrivate)
    .sort((a, b) => {
      // Sort by last message time first
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      
      if (aTime !== bTime) {
        return bTime - aTime; // Recent messages first
      }
      
      // Then by online status
      const aUser = getOtherUser(a);
      const bUser = getOtherUser(b);
      const aOnline = aUser ? onlineUsers.has(aUser.id) : false;
      const bOnline = bUser ? onlineUsers.has(bUser.id) : false;
      
      if (aOnline !== bOnline) {
        return bOnline ? -1 : 1; // Online users first
      }
      
      // Finally by name
      const aName = aUser?.fullName || "Unknown";
      const bName = bUser?.fullName || "Unknown";
      return aName.localeCompare(bName);
    });

  const groupChats = allFilteredChats
    .filter(chat => !chat.isPrivate)
    .sort((a, b) => {
      // Sort by last message time first
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      
      if (aTime !== bTime) {
        return bTime - aTime; // Recent messages first
      }
      
      // Then by name
      return a.name.localeCompare(b.name);
    });

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    u.id !== user?.id && // Exclude current user
    !chats.some(chat => {
      const otherUser = getOtherUser(chat);
      return otherUser?.id === u.id;
    })
  );

  return (
    <div className="w-80 flex flex-col bg-background border-r border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 bg-gradient-to-r ${getGradientClass(user?.id || 0)} user-avatar shadow-lg ring-2 ring-border`}>
              <span className="text-base font-bold">{user ? getInitials(user.fullName) : "U"}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {user?.fullName || "User"}
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Link href="/settings">
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-muted transition-all duration-200 rounded-full p-2"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="hover:bg-muted transition-all duration-200 rounded-full p-2"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-10 bg-muted border-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 rounded-full h-12 text-base"
          />
          <Search className="absolute left-4 top-3 w-6 h-6 text-muted-foreground" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-3 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors rounded-full flex items-center justify-center text-xl font-medium"
            >
              ×
            </button>
          )}
        </div>

        {/* Create Group Button */}
        <Button
          onClick={() => setShowCreateGroup(true)}
          className="w-full mb-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl rounded-full h-12 font-bold text-base"
          size="lg"
        >
          <Users className="w-5 h-5 mr-3" />
          Create Group
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Direct Messages */}
          {privateChats && privateChats.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                Direct Messages
              </h4>
              {privateChats.map((chat) => {
                const otherUser = getOtherUser(chat);
                const isSelected = selectedChatId === chat.id;
                const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`mx-2 p-4 hover:bg-muted cursor-pointer rounded-xl mb-2 transition-all duration-200 hover:shadow-sm hover:scale-[1.02] animate-fade-in ${
                      isSelected ? "chat-item-active shadow-md scale-[1.02]" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className={`w-14 h-14 bg-gradient-to-r ${getGradientClass(otherUser?.id || chat.id)} user-avatar shadow-lg`}>
                          <span className="text-lg font-bold">
                            {otherUser ? otherUser.initials : "U"}
                          </span>
                        </div>
                        <div className={`${isOnline ? "online-indicator" : "offline-indicator"} transition-all`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-foreground truncate text-lg">
                            {otherUser ? otherUser.fullName : "Unknown User"}
                          </h4>
                          {chat.lastMessage && (
                            <span className="text-sm text-muted-foreground flex-shrink-0 ml-3">
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-muted-foreground truncate mb-2 text-base">
                            {chat.lastMessage.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {chat.lastMessage && chat.lastMessage.senderId === user?.id && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                              </div>
                            )}
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
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

          {/* Group Chats */}
          {groupChats && groupChats.length > 0 && (
            <div className={privateChats.length > 0 ? "mb-6 pt-6 border-t border-border" : ""}>
              <h4 className="text-sm font-bold text-muted-foreground px-4 py-3 uppercase tracking-wider flex items-center">
                <Users className="w-4 h-4 mr-3" />
                Group Chats
              </h4>
              {groupChats.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`mx-2 p-4 hover:bg-muted cursor-pointer rounded-xl mb-2 transition-all duration-200 hover:shadow-sm hover:scale-[1.02] animate-fade-in ${
                      isSelected ? "chat-item-active shadow-md scale-[1.02]" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className={`w-14 h-14 bg-gradient-to-r ${getGradientClass(chat.id)} user-avatar shadow-lg`}>
                          <span className="text-lg font-bold">
                            {chat.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary border-3 border-background rounded-full flex items-center justify-center shadow-sm">
                          <Users className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-foreground truncate text-lg">
                            {chat.name}
                          </h4>
                          {chat.lastMessage && (
                            <span className="text-sm text-muted-foreground flex-shrink-0 ml-3">
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-muted-foreground truncate mb-2 text-base">
                            {chat.lastMessage.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                          </p>
                          {chat.unreadCount > 0 && (
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
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

          {/* Empty State */}
          {!searchTerm && privateChats.length === 0 && groupChats.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                No conversations yet
              </h3>
              <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                Start a new chat or create a group to get started
              </p>
            </div>
          )}

          {/* Search Empty State */}
          {searchTerm && privateChats.length === 0 && groupChats.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                No results found
              </h3>
              <p className="text-muted-foreground text-base">
                Try searching with a different term
              </p>
            </div>
          )}

          {/* All Users */}
          {searchTerm && users && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-2 uppercase tracking-wide">
                All Users
              </h4>
              {users.filter(u => 
                u && u.fullName && 
                u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                u.id !== user?.id // Exclude current user
              ).map((availableUser) => {
                const isOnline = onlineUsers.has(availableUser.id);
                const hasExistingChat = chats.some(chat => {
                  const otherUser = getOtherUser(chat);
                  return otherUser?.id === availableUser.id;
                });
                
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
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {availableUser.fullName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{availableUser.username} {hasExistingChat && "• Chat exists"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available Users (only show when not searching) */}
          {!searchTerm && filteredUsers && filteredUsers.length > 0 && (
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

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        users={users}
        currentUserId={user?.id}
        onGroupCreated={(newGroup) => {
          // Refresh the chats list (this would be handled by the parent component)
          setShowCreateGroup(false);
        }}
      />
    </div>
  );
}
