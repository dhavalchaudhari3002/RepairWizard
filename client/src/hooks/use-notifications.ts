import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryKey = ["/api/notifications"];
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const connectWebSocket = useCallback(() => {
    if (!user) {
      console.log('No user, skipping WebSocket connection');
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      reconnectAttempts.current = 0;
      toast({
        title: "Connected",
        description: "Real-time notifications enabled",
        duration: 3000
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);

        if (message.type === 'notification') {
          // Show toast for new notification
          toast({
            title: message.data.title,
            description: message.data.message,
            duration: 5000
          });
          // Update notifications in cache
          queryClient.invalidateQueries({ queryKey });
        } else if (message.type === 'connection') {
          console.log('Connection confirmed:', message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      wsRef.current = null;

      // Don't attempt to reconnect if it was an authentication failure
      if (event.code === 1008) {
        console.log('Authentication failed - not attempting to reconnect');
        toast({
          title: "Connection Error",
          description: "Failed to authenticate real-time connection",
          variant: "destructive"
        });
        return;
      }

      // Attempt to reconnect if not explicitly closed and under max attempts
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        console.log(`Attempting to reconnect (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        reconnectAttempts.current++;
        setTimeout(connectWebSocket, reconnectDelay * reconnectAttempts.current);

        toast({
          title: "Connection Lost",
          description: "Attempting to reconnect...",
          variant: "destructive"
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish real-time connection",
        variant: "destructive"
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [user, queryClient, toast]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => {
      cleanup?.();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connectWebSocket]);

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        console.log("Fetching notifications...");
        const response = await fetch("/api/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include"
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received notifications:", data);
        return data as Notification[];
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        throw error;
      }
    },
    enabled: !!user,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message === "Not authenticated") {
        return false;
      }
      return failureCount < 3;
    }
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
}