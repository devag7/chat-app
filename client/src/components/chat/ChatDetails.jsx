import { Button } from "../ui/button.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Avatar } from "../ui/avatar.jsx";
import { Users, UserPlus, UserMinus, X } from "lucide-react";

export default function ChatDetails({ isOpen, onClose, chat, currentUserId, allUsers }) {
  if (!isOpen || !chat) return null;
  
  const getGradientClass = (id) => {
    // X.com style - solid colors only (black/white with blue accent)
    return "from-muted to-muted bg-muted";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {chat.isPrivate ? "Chat Info" : "Group Info"}
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Chat/Group Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-foreground font-bold text-2xl">
                {chat.isPrivate 
                  ? chat.members.find(m => m.id !== currentUserId)?.initials || "U"
                  : chat.name.charAt(0).toUpperCase()
                }
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {chat.isPrivate 
                ? chat.members.find(m => m.id !== currentUserId)?.fullName || "Unknown User"
                : chat.name
              }
            </h3>
            {chat.isPrivate && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                @{chat.members.find(m => m.id !== currentUserId)?.username || "unknown"}
              </p>
            )}
          </div>

          {/* Members Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Members ({chat.members?.length || 0})
              </h4>
            </div>

            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {chat.members?.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-medium">
                        {member.initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {member.fullName}
                        {member.id === currentUserId && " (You)"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button onClick={onClose} className="flex-1" variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
