import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Info, Send, Users } from "lucide-react";
import MessageBubble from "./MessageBubble.jsx";
import ChatDetails from "./ChatDetails.jsx";
import { useWebSocket } from "../../hooks/useWebSocket.js";
import { useQuery } from "@tanstack/react-query";

export default function ChatArea({
  chat,
  messages,
  currentUser,
  onSendMessage,
  typingUsers,
  onlineUsers,
}) {
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showChatDetails, setShowChatDetails] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef();
  const { sendTyping, sendStoppedTyping } = useWebSocket(currentUser?.id);

  // Get all users for the chat details modal
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getOtherUser = () => {
    if (!chat.isPrivate || !currentUser) return null;
    return chat.members.find(member => member.id !== currentUser.id) || null;
  };

  const otherUser = getOtherUser();
  const isOtherUserOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  const handleSendMessage = () => {
    if (messageContent.trim()) {
      onSendMessage(messageContent);
      setMessageContent("");
      setIsTyping(false);
      sendStoppedTyping(chat.id);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageContent(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      sendTyping(chat.id);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      sendStoppedTyping(chat.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendStoppedTyping(chat.id);
      }, 1000);
    }
  };

  // Get typing users for this chat
  const chatTypingUsers = Array.from(typingUsers.entries())
    .filter(([chatId, userId]) => chatId === chat.id && userId !== currentUser?.id)
    .map(([chatId, userId]) => userId);

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

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(otherUser?.id || chat.id)} rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl`}>
                <span className="text-white font-medium text-sm">
                  {otherUser ? otherUser.initials : chat.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {otherUser && (
                <div className={`${isOtherUserOnline ? "online-indicator" : "offline-indicator"} transition-all`} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {chat.isPrivate ? 
                  (otherUser ? otherUser.fullName : "Unknown User") : 
                  chat.name
                }
              </h3>
              {chat.isPrivate ? (
                <p className={`text-sm transition-colors ${isOtherUserOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {isOtherUserOnline ? "Online" : "Offline"}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowChatDetails(true)}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 rounded-full"
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50/30 to-gray-50/50 dark:from-gray-900/30 dark:to-gray-900/50">
        <div className="space-y-3">
          {messages.filter(message => message && message.sender).map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser?.id}
              showAvatar={true}
            />
          ))}
          
          {/* Typing Indicator */}
          {chatTypingUsers.length > 0 && (
            <div className="flex items-start space-x-3 animate-fade-in">
              <div className={`w-8 h-8 bg-gradient-to-r ${getGradientClass(chatTypingUsers[0])} rounded-full flex items-center justify-center shadow-md`}>
                <span className="text-white text-xs font-medium">
                  {otherUser?.initials || "U"}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-delay-1"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-delay-2"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={messageContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="chat-input resize-none max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 rounded-2xl"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim()}
            className="chat-gradient hover:opacity-90 rounded-full p-3 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chat Details Modal */}
      {showChatDetails && allUsers && (
        <ChatDetails
          isOpen={showChatDetails}
          onClose={() => setShowChatDetails(false)}
          chat={chat}
          currentUserId={currentUser?.id}
          allUsers={allUsers}
        />
      )}
    </div>
  );
}
