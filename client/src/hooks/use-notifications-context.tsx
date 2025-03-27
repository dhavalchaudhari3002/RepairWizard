import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import type { Notification } from "@shared/schema";

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  notificationPrefs: {
    desktop: boolean;
    toast: boolean;
    sound: boolean;
    animateBell: boolean;
  };
  setNotificationPrefs: React.Dispatch<React.SetStateAction<{
    desktop: boolean;
    toast: boolean;
    sound: boolean;
    animateBell: boolean;
  }>>;
  markAsRead: any;
  markAllAsRead: any;
};

const NotificationsContext = React.createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const notificationSound = React.useRef<HTMLAudioElement>(new Audio("/notification.mp3"));

  // Set up default notification preferences
  const [notificationPrefs, setNotificationPrefs] = React.useState({
    desktop: true,
    toast: true,
    sound: false,
    animateBell: true
  });

  // Save notification preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem("notificationPreferences", JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  // Load notification preferences from localStorage
  React.useEffect(() => {
    const savedPrefs = localStorage.getItem("notificationPreferences");
    if (savedPrefs) {
      try {
        setNotificationPrefs(JSON.parse(savedPrefs));
      } catch (e) {
        console.error("Failed to parse notification preferences", e);
      }
    }
  }, []);

  // Request notification permission
  React.useEffect(() => {
    if (notificationPrefs.desktop && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [notificationPrefs.desktop]);

  // Fetch notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    enabled: !!user
  });

  const unreadCount = React.useMemo(() => {
    return notifications?.filter((n: Notification) => !n.read).length || 0;
  }, [notifications]);

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  // Listen for WebSocket notifications
  React.useEffect(() => {
    if (!user) return;

    // Only set up WebSocket if we have a user
    let socket: WebSocket;

    const connectWebSocket = () => {
      // Check if WebSocket is already open
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Determine protocol (ws/wss) based on page protocol (http/https)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log("Attempting to connect to WebSocket at:", wsUrl);

      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("WebSocket connected");
        };

        socket.onmessage = (event) => {
          console.log("WebSocket message received:", event.data);
          
          try {
            const data = JSON.parse(event.data);

            // Handle different types of messages
            if (data.type === "ping") {
              console.log("Ping received, connection is healthy");
              return;
            }

            // Handle new notification
            if (data.type === "notification" && data.notification) {
              // Refresh notifications
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

              // Show toast notification if enabled
              if (notificationPrefs.toast) {
                toast({
                  title: data.notification.title,
                  description: data.notification.message,
                });
              }

              // Play sound if enabled
              if (notificationPrefs.sound && notificationSound.current) {
                notificationSound.current.play().catch(err => {
                  console.log("Failed to play notification sound:", err);
                });
              }

              // Show desktop notification if enabled
              if (notificationPrefs.desktop && "Notification" in window && Notification.permission === "granted") {
                new Notification(data.notification.title, {
                  body: data.notification.message,
                  icon: "/favicon.ico",
                });
              }
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };

        socket.onclose = (event) => {
          console.log("WebSocket closed with code " + event.code + ", reason: " + event.reason);
          
          // If unexpectedly closed, retry connection
          if (event.code !== 1000) {
            const maxRetries = 3;
            let retryCount = 0;
            
            const retryConnection = () => {
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Reconnecting in 3000ms (attempt ${retryCount} of ${maxRetries})`);
                setTimeout(() => {
                  connectWebSocket();
                }, 3000);
              } else {
                console.error("Max WebSocket reconnection attempts reached");
              }
            };
            
            retryConnection();
          }
        };

        socket.onerror = (error) => {
          console.log("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
      }
    };

    connectWebSocket();

    // Clean up function
    return () => {
      if (socket) {
        socket.close(1000, "Component unmounted");
      }
    };
  }, [user, queryClient, toast, notificationPrefs]);

  const value = React.useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    notificationPrefs,
    setNotificationPrefs,
    markAsRead,
    markAllAsRead
  }), [
    notifications,
    unreadCount,
    isLoading,
    error,
    notificationPrefs,
    markAsRead,
    markAllAsRead
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = React.useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}