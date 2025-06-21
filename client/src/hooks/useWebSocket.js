import { useEffect, useRef, useState } from "react";
import { queryClient } from "../lib/queryClient.js";

export function useWebSocket(userId) {
  const ws = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());

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
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "new_message":
            // Invalidate messages query to refetch
            queryClient.invalidateQueries({ 
              queryKey: [`/api/chats/${message.message.chatRoomId}/messages`] 
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
            
          case "user_typing":
            setTypingUsers(prev => new Map(prev.set(message.chatRoomId, message.userId)));
            // Clear typing after 3 seconds
            setTimeout(() => {
              setTypingUsers(prev => {
                const newMap = new Map(prev);
                if (newMap.get(message.chatRoomId) === message.userId) {
                  newMap.delete(message.chatRoomId);
                }
                return newMap;
              });
            }, 3000);
            break;
            
          case "user_stopped_typing":
            setTypingUsers(prev => {
              const newMap = new Map(prev);
              if (newMap.get(message.chatRoomId) === message.userId) {
                newMap.delete(message.chatRoomId);
              }
              return newMap;
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      // Clear state on disconnect
      setOnlineUsers(new Set());
      setTypingUsers(new Map());
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const sendTyping = (chatRoomId) => {
    sendMessage({
      type: "typing",
      chatRoomId: chatRoomId,
    });
  };

  const sendStoppedTyping = (chatRoomId) => {
    sendMessage({
      type: "stopped_typing",
      chatRoomId: chatRoomId,
    });
  };

  return {
    sendMessage,
    sendTyping,
    sendStoppedTyping,
    onlineUsers,
    typingUsers,
  };
}
