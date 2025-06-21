import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import ChatSidebar from "../components/chat/ChatSidebar.jsx";
import ChatArea from "../components/chat/ChatArea.jsx";
import { useChat } from "../hooks/useChat.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { useAuth } from "../hooks/useAuth.js";
import { FloatingComposeButton } from "../components/ui/floating-compose.jsx";

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const { chats, users, messages, isLoading, refetchChats } = useChat(selectedChatId);
  const { sendMessage, onlineUsers, typingUsers } = useWebSocket(user?.id);

  const selectedChat = chats?.find(chat => chat.id === selectedChatId);

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = (content) => {
    if (selectedChatId && content.trim()) {
      sendMessage({
        type: "message",
        chatRoom: selectedChatId,
        content: content.trim()
      });
    }
  };

  const handleStartChat = async (userId) => {
    try {
      // First check if a chat already exists
      const existingChat = chats?.find(chat => {
        if (!chat.isPrivate) return false;
        const otherUser = chat.members.find(member => member.id !== user?.id);
        return otherUser?.id === userId;
      });

      if (existingChat) {
        // If chat exists, just select it
        setSelectedChatId(existingChat.id);
        return;
      }

      // Create new chat if it doesn't exist
      const response = await fetch(`/api/chats/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const chatRoom = await response.json();
        setSelectedChatId(chatRoom.id);
        // Refresh chats to show the new chat
        refetchChats();
      } else {
        console.error("Failed to create chat");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleCreateGroup = async (data) => {
    try {
      const response = await fetch("/api/chats/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          memberIds: data.memberIds,
        }),
      });

      if (response.ok) {
        const group = await response.json();
        setSelectedChatId(group.id);
        refetchChats();
      } else {
        console.error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  // Auto-select first chat if no chat is selected and chats are available
  useEffect(() => {
    if (!selectedChatId && chats && chats.length > 0) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <ChatSidebar
        user={user}
        chats={chats || []}
        users={users || []}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onStartChat={handleStartChat}
        onCreateGroup={handleCreateGroup}
        onlineUsers={onlineUsers}
      />
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatArea
            chat={selectedChat}
            messages={messages || []}
            onSendMessage={handleSendMessage}
            currentUser={user}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center p-12">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Welcome to ChatApp</h3>
              <p className="text-lg">Select a chat or start a new conversation to begin messaging</p>
            </div>
          </div>
        )}
        
        {/* Floating Compose Button */}
        <FloatingComposeButton 
          onClick={() => {
            // Focus on the search input or show a new chat modal
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) {
              searchInput.focus();
            }
          }}
        />
      </div>
    </div>
  );
}
