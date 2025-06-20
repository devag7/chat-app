import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserWithStatus } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

const groupChatSchema = z.object({
  name: z.string().min(1, "Group name is required").max(50, "Group name too long"),
});

type GroupChatForm = z.infer<typeof groupChatSchema>;

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserWithStatus[];
  currentUserId?: number;
}

export default function CreateGroupModal({ isOpen, onClose, users, currentUserId }: CreateGroupModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const { toast } = useToast();

  const form = useForm<GroupChatForm>({
    resolver: zodResolver(groupChatSchema),
    defaultValues: {
      name: "",
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberIds: number[] }) => {
      const response = await apiRequest("POST", "/api/chats/group", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Group chat created successfully!",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setSelectedUsers([]);
    onClose();
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const onSubmit = (data: GroupChatForm) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: data.name,
      memberIds: selectedUsers,
    });
  };

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

  const availableUsers = users.filter(user => user.id !== currentUserId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="Enter group name"
              {...form.register("name")}
              className="mt-2"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label>Select Members</Label>
            <ScrollArea className="h-64 mt-2 border rounded-lg">
              <div className="p-2">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                    />
                    <div className={`w-10 h-10 bg-gradient-to-r ${getGradientClass(user.id)} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-sm font-medium">
                        {user.initials}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {user.fullName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 chat-gradient hover:opacity-90"
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}