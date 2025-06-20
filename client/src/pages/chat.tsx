import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatArea from "@/components/chat/ChatArea";
import { useChat } from "@/hooks/useChat";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const { chats, users, messages, isLoading } = useChat(selectedChatId);
  const { sendMessage, onlineUsers, typingUsers } = useWebSocket(user?.id);

  const selectedChat = chats?.find(chat => chat.id === selectedChatId);

  const handleSelectChat = (chatId: number) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = (content: string) => {
    if (selectedChatId && content.trim()) {
      sendMessage(selectedChatId, content);
    }
  };

  const handleStartChat = async (userId: number) => {
    try {
      const response = await fetch(`/api/chats/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const chatRoom = await response.json();
        setSelectedChatId(chatRoom.id);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      <ChatSidebar
        user={user}
        chats={chats || []}
        users={users || []}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onStartChat={handleStartChat}
        onlineUsers={onlineUsers}
      />
      
      <div className="flex-1">
        {selectedChat ? (
          <ChatArea
            chat={selectedChat}
            messages={messages || []}
            currentUser={user}
            onSendMessage={handleSendMessage}
            typingUsers={typingUsers}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 chat-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Welcome to ChatConnect
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
