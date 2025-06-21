import { useState } from "react";
import { Input } from "../ui/input.jsx";
import { Button } from "../ui/button.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Search, Settings, LogOut, Plus, Users, CheckCheck } from "lucide-react";
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
    // X.com style - solid colors only (black/white with blue accent)
    return "from-muted to-muted bg-muted";
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
    <div className="w-80 flex flex-col bg-background border-r border-border h-screen">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary user-avatar shadow-md ring-1 ring-border">
              <span className="text-primary-foreground text-sm font-bold">{user ? getInitials(user.fullName) : "U"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-foreground truncate">
                {user?.fullName || "User"}
              </h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Link href="/settings">
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-muted transition-colors rounded-full p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="hover:bg-muted transition-colors rounded-full p-2"
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
            className="pl-10 pr-8 bg-muted/50 border-border focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-full h-10 text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors rounded-full flex items-center justify-center text-sm font-medium"
            >
              ×
            </button>
          )}
        </div>

        {/* Create Group Button */}
        <Button
          onClick={() => setShowCreateGroup(true)}
          className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-md rounded-full h-9 font-medium text-sm"
          size="sm"
        >
          <Users className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Chat List - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Direct Messages */}
          {privateChats && privateChats.length > 0 && (
            <div>
              <div className="flex items-center px-3 py-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Direct Messages
                </h4>
              </div>
              <div className="space-y-1">
                {privateChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const isSelected = selectedChatId === chat.id;
                  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className={`mx-1 p-3 hover:bg-muted cursor-pointer rounded-lg transition-colors duration-150 ${
                        isSelected ? "bg-muted border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-primary user-avatar shadow-sm">
                            <span className="text-primary-foreground text-sm font-medium">
                              {otherUser ? otherUser.initials : "U"}
                            </span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background rounded-full ${
                            isOnline ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {otherUser ? otherUser.fullName : "Unknown User"}
                            </h4>
                            {chat.lastMessage && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatTime(chat.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-1">
                              {chat.lastMessage && chat.lastMessage.senderId === user?.id && (
                                <div className="flex items-center space-x-0.5">
                                  <CheckCheck className="w-3 h-3 text-primary" />
                                </div>
                              )}
                            </div>
                            {chat.unreadCount > 0 && (
                              <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
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
            </div>
          )}

          {/* Group Chats */}
          {groupChats && groupChats.length > 0 && (
            <div className={privateChats.length > 0 ? "pt-4 border-t border-border mt-4" : ""}>
              <div className="flex items-center px-3 py-2 mb-2">
                <Users className="w-3 h-3 mr-2 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Group Chats
                </h4>
              </div>
              <div className="space-y-1">
                {groupChats.map((chat) => {
                  const isSelected = selectedChatId === chat.id;
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className={`mx-1 p-3 hover:bg-muted cursor-pointer rounded-lg transition-colors duration-150 ${
                        isSelected ? "bg-muted border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-primary user-avatar shadow-sm">
                            <span className="text-primary-foreground text-sm font-medium">
                              {chat.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary border-2 border-background rounded-full flex items-center justify-center">
                            <Users className="w-2 h-2 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {chat.name}
                            </h4>
                            {chat.lastMessage && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatTime(chat.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                            </p>
                            {chat.unreadCount > 0 && (
                              <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
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
            </div>
          )}

          {/* Empty State */}
          {!searchTerm && privateChats.length === 0 && groupChats.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No conversations yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a new chat or create a group to get started
              </p>
            </div>
          )}

          {/* Search Empty State */}
          {searchTerm && privateChats.length === 0 && groupChats.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No results found
              </h3>
              <p className="text-sm text-muted-foreground">
                Try searching with a different term
              </p>
            </div>
          )}

          {/* All Users */}
          {searchTerm && users && (
            <div className="pt-4 border-t border-border mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
                All Users
              </h4>
              <div className="space-y-1">
                {users.filter(u => 
                  u && u.fullName && 
                  u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                  u.id !== user?.id
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
                      className="mx-1 p-3 hover:bg-muted cursor-pointer rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-primary user-avatar">
                            <span className="text-primary-foreground text-xs font-medium">{availableUser.initials}</span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border border-background rounded-full ${
                            isOnline ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {availableUser.fullName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            @{availableUser.username} {hasExistingChat && "• Chat exists"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Users (only show when not searching) */}
          {!searchTerm && filteredUsers && filteredUsers.length > 0 && (
            <div className="pt-4 border-t border-border mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
                Start New Chat
              </h4>
              <div className="space-y-1">
                {filteredUsers.map((availableUser) => {
                  const isOnline = onlineUsers.has(availableUser.id);
                  
                  return (
                    <div
                      key={availableUser.id}
                      onClick={() => onStartChat(availableUser.id)}
                      className="mx-1 p-3 hover:bg-muted cursor-pointer rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-primary user-avatar">
                            <span className="text-primary-foreground text-xs font-medium">{availableUser.initials}</span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border border-background rounded-full ${
                            isOnline ? "bg-green-500" : "bg-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {availableUser.fullName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            @{availableUser.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
          setShowCreateGroup(false);
        }}
      />
    </div>
  );
}
