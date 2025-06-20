import { MessageWithSender } from "@shared/schema";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  showAvatar?: boolean;
}

export default function MessageBubble({ message, isOwn, showAvatar = true }: MessageBubbleProps) {
  // Guard against undefined message or sender
  if (!message || !message.sender) {
    return null;
  }

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
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isOwn) {
    return (
      <div className="flex items-start space-x-3 justify-end">
        <div className="flex-1 max-w-xs lg:max-w-md">
          <div className="chat-message-sent px-4 py-2">
            <p className="text-white text-sm">{message.content}</p>
          </div>
          <div className="flex items-center justify-end mt-1 mr-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mr-1">
              {formatTime(message.createdAt!)}
            </p>
            {message.isRead ? (
              <CheckCheck className="w-3 h-3 text-blue-500" />
            ) : (
              <Check className="w-3 h-3 text-gray-400" />
            )}
          </div>
        </div>
        {showAvatar && (
          <div className={`w-8 h-8 bg-gradient-to-r chat-gradient rounded-full flex items-center justify-center`}>
            <span className="text-white text-xs font-medium">
              {message.sender.initials}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3">
      {showAvatar && (
        <div className={`w-8 h-8 bg-gradient-to-r ${getGradientClass(message.sender.id)} rounded-full flex items-center justify-center`}>
          <span className="text-white text-xs font-medium">
            {message.sender.initials}
          </span>
        </div>
      )}
      <div className="flex-1 max-w-xs lg:max-w-md">
        <div className="chat-message-received px-4 py-2">
          <p className="text-gray-900 dark:text-white text-sm">{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">
          {formatTime(message.createdAt!)}
        </p>
      </div>
    </div>
  );
}
