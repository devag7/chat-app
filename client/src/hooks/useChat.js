import { useQuery } from "@tanstack/react-query";

export function useChat(selectedChatId) {
  const { data: chats, isLoading: chatsLoading, refetch: refetchChats } = useQuery({
    queryKey: ["/api/chats"],
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    refetchInterval: 5000, // Refetch every 5 seconds for user status updates
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/chats/${selectedChatId}/messages`],
    enabled: !!selectedChatId,
    refetchInterval: selectedChatId ? 1000 : false, // Refetch every second when chat is selected
  });

  return {
    chats: chats || [],
    users: users || [],
    messages: messages || [],
    isLoading: chatsLoading || usersLoading || (selectedChatId ? messagesLoading : false),
    refetchChats,
  };
}
