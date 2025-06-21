import { Check, CheckCheck } from "lucide-react";

export default function MessageBubble({ message, isOwn, showAvatar = true }) {
  // Guard against undefined message or sender
  if (!message || !message.sender) {
    return null;
  }

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
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-message-bounce`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-xs lg:max-w-md`}>
        {showAvatar && !isOwn && (
          <div className={`w-8 h-8 bg-gradient-to-r ${getGradientClass(message.sender.id)} rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all hover:shadow-lg`}>
            <span className="text-white text-xs font-medium">
              {message.sender.initials}
            </span>
          </div>
        )}
        
        <div className={`${isOwn ? 'ml-3' : 'mr-3'}`}>
          {!isOwn && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 px-3 font-medium">
              {message.sender.fullName}
            </p>
          )}
          
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm transition-all hover:shadow-md ${
              isOwn
                ? 'chat-gradient text-white rounded-br-sm'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
          
          <div className={`flex items-center mt-1 px-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="ml-1 flex items-center">
                <CheckCheck className="w-3 h-3 text-blue-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
