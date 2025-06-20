import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(userId?: number) {
  const ws = useRef<WebSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate the connection
      ws.current?.send(JSON.stringify({
        type: "auth",
        userId: userId,
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case "new_message":
            // Invalidate messages query to refetch
            queryClient.invalidateQueries({ 
              queryKey: ["/api/chats", message.message.chatRoomId, "messages"] 
            });
            // Also invalidate chats to update last message
            queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
            break;
            
          case "user_online":
            setOnlineUsers(prev => new Set([...prev, message.userId]));
            break;
            
          case "user_offline":
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(message.userId);
              return newSet;
            });
            break;
            
          case "typing":
            if (message.isTyping) {
              setTypingUsers(prev => new Map(prev.set(message.userId, message.chatRoomId)));
            } else {
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                newMap.delete(message.userId);
                return newMap;
              });
            }
            // Clear typing indicator after 3 seconds
            setTimeout(() => {
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                newMap.delete(message.userId);
                return newMap;
              });
            }, 3000);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId]);

  const sendMessage = (chatRoomId: number, content: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "send_message",
        chatRoomId,
        content,
      }));
    }
  };

  const sendTyping = (chatRoomId: number, isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "typing",
        chatRoomId,
        isTyping,
      }));
    }
  };

  return {
    sendMessage,
    sendTyping,
    onlineUsers,
    typingUsers,
  };
}
