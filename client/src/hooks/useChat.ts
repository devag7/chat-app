import { useQuery } from "@tanstack/react-query";
import { ChatRoomWithMembers, MessageWithSender, UserWithStatus } from "@shared/schema";

export function useChat(selectedChatId: number | null) {
  const { data: chats, isLoading: chatsLoading } = useQuery<ChatRoomWithMembers[]>({
    queryKey: ["/api/chats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserWithStatus[]>({
    queryKey: ["/api/users"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/chats", selectedChatId, "messages"],
    enabled: !!selectedChatId,
  });

  return {
    chats,
    users,
    messages,
    isLoading: chatsLoading || usersLoading || (selectedChatId ? messagesLoading : false),
  };
}
