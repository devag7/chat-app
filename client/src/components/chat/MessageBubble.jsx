import { Check, CheckCheck } from "lucide-react";

export default function MessageBubble({ message, isOwn, showAvatar = true }) {
  // Guard against undefined message or sender
  if (!message || !message.sender) {
    return null;
  }

  const getGradientClass = (id) => {
    // X.com style - solid colors only (black/white with blue accent)
    return "from-muted to-muted bg-muted";
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-message-bounce`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start space-x-4 max-w-lg lg:max-w-xl`}>
        {showAvatar && !isOwn && (
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all hover:shadow-lg ring-2 ring-border">
            <span className="text-primary-foreground text-sm font-bold">
              {message.sender.initials}
            </span>
          </div>
        )}
        
        <div className={`${isOwn ? 'ml-4' : 'mr-4'}`}>
          {!isOwn && (
            <p className="text-sm text-muted-foreground mb-2 px-4 font-semibold">
              {message.sender.fullName}
            </p>
          )}
          
          <div
            className={`px-6 py-4 shadow-lg transition-all hover:shadow-xl ${
              isOwn
                ? 'bg-primary text-primary-foreground rounded-3xl rounded-br-lg'
                : 'bg-muted text-foreground rounded-3xl rounded-bl-lg border border-border'
            }`}
          >
            <p className="text-base break-words whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
          
          <div className={`flex items-center mt-2 px-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-sm text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="ml-2 flex items-center">
                <CheckCheck className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
