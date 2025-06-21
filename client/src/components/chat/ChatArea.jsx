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
    // X.com style - solid colors only (black/white with blue accent)
    return "from-muted to-muted bg-muted";
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-6 bg-background border-b border-border backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl ring-2 ring-border">
                <span className="text-primary-foreground font-bold text-lg">
                  {otherUser ? otherUser.initials : chat.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {otherUser && (
                <div className={`${isOtherUserOnline ? "online-indicator" : "offline-indicator"} transition-all`} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-xl text-foreground">
                {chat.isPrivate ? 
                  (otherUser ? otherUser.fullName : "Unknown User") : 
                  chat.name
                }
              </h3>
              {chat.isPrivate ? (
                <p className={`text-base transition-colors ${isOtherUserOnline ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
                  {isOtherUserOnline ? "Online" : "Offline"}
                </p>
              ) : (
                <p className="text-base text-muted-foreground flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="lg"
            onClick={() => setShowChatDetails(true)}
            className="hover:bg-muted transition-all duration-200 rounded-full p-3"
          >
            <Info className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6 bg-background">
        <div className="space-y-4 max-w-4xl mx-auto">
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
            <div className="flex items-start space-x-4 animate-fade-in">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-md">
                <span className="text-primary-foreground text-sm font-bold">
                  {otherUser?.initials || "U"}
                </span>
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-6 py-4 shadow-sm border border-border">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-delay-1"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-delay-2"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-6 bg-background border-t border-border backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                rows={1}
                placeholder="Start a new message..."
                value={messageContent}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="chat-input resize-none max-h-32 overflow-y-auto bg-muted border-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 rounded-3xl text-base px-6 py-4"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="w-6 h-6" />
            </Button>
          </div>
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
