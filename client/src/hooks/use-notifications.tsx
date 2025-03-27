import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

// Define Notification type since we can't import it from shared/schema
interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "repair_update" | "system" | "message";
  read: boolean;
  relatedEntityId?: number;
  createdAt: string;
}

// Default notification preferences
const defaultNotificationPrefs = {
  desktop: true,
  toast: true,
  sound: true,
  animateBell: true
};

// Context for notifications
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
  markAsRead: ReturnType<typeof useMutation>;
  markAllAsRead: ReturnType<typeof useMutation>;
};

const NotificationsContext = React.createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notificationSound = React.useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  React.useEffect(() => {
    notificationSound.current = new Audio("/notification.mp3");
  }, []);

  // Initialize notification preferences from localStorage
  const [notificationPrefs, setNotificationPrefs] = React.useState(() => {
    if (typeof window !== "undefined") {
      const storedPrefs = localStorage.getItem("notificationPreferences");
      return storedPrefs ? JSON.parse(storedPrefs) : defaultNotificationPrefs;
    }
    return defaultNotificationPrefs;
  });

  // Save notification preferences to localStorage when they change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notificationPreferences", JSON.stringify(notificationPrefs));
    }
  }, [notificationPrefs]);

  // Fetch notifications if user is logged in
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    }
  });

  // Calculate unread count
  const unreadCount = React.useMemo(() => {
    return notifications?.filter((n: Notification) => !n.read).length || 0;
  }, [notifications]);

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("POST", `/api/notifications/${notificationId}/read`);
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
      return apiRequest("POST", "/api/notifications/read-all");
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

export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}