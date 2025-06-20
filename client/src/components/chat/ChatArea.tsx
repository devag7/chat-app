import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Video, Info, Paperclip, Smile, Send } from "lucide-react";
import { ChatRoomWithMembers, MessageWithSender, User } from "@shared/schema";
import MessageBubble from "./MessageBubble";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ChatAreaProps {
  chat: ChatRoomWithMembers;
  messages: MessageWithSender[];
  currentUser: User | undefined;
  onSendMessage: (content: string) => void;
  typingUsers: Map<number, number>;
  onlineUsers: Set<number>;
}

export default function ChatArea({
  chat,
  messages,
  currentUser,
  onSendMessage,
  typingUsers,
  onlineUsers,
}: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { sendTyping } = useWebSocket(currentUser?.id);

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
      sendTyping(chat.id, false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageContent(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      sendTyping(chat.id, true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      sendTyping(chat.id, false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(chat.id, false);
      }, 1000);
    }
  };

  // Get typing users for this chat
  const chatTypingUsers = Array.from(typingUsers.entries())
    .filter(([userId, chatId]) => chatId === chat.id && userId !== currentUser?.id)
    .map(([userId]) => userId);

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

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(otherUser?.id || chat.id)} rounded-full flex items-center justify-center`}>
                <span className="text-white font-medium text-sm">
                  {otherUser ? otherUser.initials : chat.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {otherUser && (
                <div className={isOtherUserOnline ? "online-indicator" : "offline-indicator"} />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {otherUser ? otherUser.fullName : chat.name}
              </h3>
              <p className={`text-sm ${isOtherUserOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                {isOtherUserOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
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
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 bg-gradient-to-r ${getGradientClass(chatTypingUsers[0])} rounded-full flex items-center justify-center`}>
                <span className="text-white text-xs font-medium">
                  {otherUser?.initials || "U"}
                </span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
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
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-3">
          <Button variant="ghost" size="sm">
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={messageContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="chat-input resize-none max-h-32 overflow-y-auto pr-10"
            />
            <Button variant="ghost" size="sm" className="absolute right-2 bottom-2">
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageContent.trim()}
            className="chat-gradient hover:opacity-90 rounded-full p-3"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
