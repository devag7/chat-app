import { useState } from "react";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { Label } from "../ui/label.jsx";
import { ScrollArea } from "../ui/scroll-area.jsx";
import { Checkbox } from "../ui/checkbox.jsx";
import { X, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient.js";
import { useToast } from "../../hooks/use-toast.js";

export default function CreateGroupModal({ isOpen, onClose, users, currentUserId, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const { toast } = useToast();

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, memberIds }) => {
      const response = await apiRequest("POST", "/api/chats/group", { name, memberIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Group created successfully!",
      });
      onGroupCreated?.(data);
      onClose();
      setGroupName("");
      setSelectedUsers(new Set());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  const handleUserToggle = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }
    if (selectedUsers.size === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: groupName.trim(),
      memberIds: Array.from(selectedUsers),
    });
  };

  const getGradientClass = (id) => {
    // X.com style - solid colors only (black/white with blue accent)
    return "from-muted to-muted bg-muted";
  };

  const availableUsers = users?.filter(user => user.id !== currentUserId) || [];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Create Group
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="mb-4">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="mb-4 flex-1 min-h-0">
            <Label>Select Members ({selectedUsers.size} selected)</Label>
            <ScrollArea className="h-48 mt-2 border border-gray-200 dark:border-gray-600 rounded-md">
              <div className="p-3 space-y-3">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs font-medium">
                        {user.initials}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.fullName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createGroupMutation.isPending || !groupName.trim() || selectedUsers.size === 0}
              className="flex-1"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
