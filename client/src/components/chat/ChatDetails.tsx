import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChatRoomWithMembers, UserWithStatus } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, UserMinus, Crown, Settings } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface ChatDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatRoomWithMembers;
  currentUserId?: number;
  allUsers: UserWithStatus[];
}

export default function ChatDetails({ isOpen, onClose, chat, currentUserId, allUsers }: ChatDetailsProps) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: chatMembers, refetch: refetchMembers } = useQuery<UserWithStatus[]>({
    queryKey: ["/api/chats", chat.id, "members"],
    enabled: isOpen,
  });

  const addMembersMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await apiRequest("POST", `/api/chats/${chat.id}/members`, { userIds });
      return response.json();
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setSelectedUsers([]);
      setShowAddMembers(false);
      toast({
        title: "Success",
        description: "Members added successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/chats/${chat.id}/members/${userId}`);
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Member removed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const availableUsers = allUsers.filter(user => 
    !chatMembers?.some(member => member.id === user.id) && user.id !== currentUserId
  );

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      addMembersMutation.mutate(selectedUsers);
    }
  };

  const isCreator = chat.createdBy === currentUserId;
  const memberCount = chatMembers?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {chat.isPrivate ? (
              <Users className="w-5 h-5" />
            ) : (
              <Settings className="w-5 h-5" />
            )}
            <span>{chat.isPrivate ? "Chat Details" : "Group Details"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chat Info */}
          <div className="text-center">
            <div className={`w-16 h-16 bg-gradient-to-r ${getGradientClass(chat.id)} rounded-full mx-auto mb-3 flex items-center justify-center`}>
              <span className="text-white font-bold text-xl">
                {chat.isPrivate ? "💬" : "👥"}
              </span>
            </div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {chat.name}
            </h3>
            {!chat.isPrivate && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <Separator />

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Members</h4>
              {!chat.isPrivate && isCreator && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMembers(!showAddMembers)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {chatMembers?.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg">
                    <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(member.id)} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-sm font-medium">
                        {member.initials}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {member.fullName}
                        </h5>
                        {member.id === chat.createdBy && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{member.username}
                      </p>
                    </div>
                    {!chat.isPrivate && isCreator && member.id !== chat.createdBy && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        disabled={removeMemberMutation.isPending}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Add Members Section */}
          {showAddMembers && !chat.isPrivate && availableUsers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add Members</h4>
                <ScrollArea className="max-h-32 mb-3">
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedUsers(prev => 
                            prev.includes(user.id) 
                              ? prev.filter(id => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div className={`w-8 h-8 bg-gradient-to-r ${getGradientClass(user.id)} rounded-full flex items-center justify-center`}>
                          <span className="text-white text-xs font-medium">
                            {user.initials}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.fullName}
                          </h5>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={handleAddMembers}
                  disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
                  className="w-full"
                >
                  {addMembersMutation.isPending ? "Adding..." : `Add ${selectedUsers.length} member${selectedUsers.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}