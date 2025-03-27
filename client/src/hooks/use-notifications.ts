import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Add notification sound
const notificationSound = new Audio("/notification.mp3");

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFERENCES = {
  sound: false,        // Disable sound by default
  desktop: true,      // Enable desktop notifications by default
  toast: true,        // Enable toast notifications by default
  animateBell: false  // Disable bell animation by default
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryKey = ["/api/notifications"];
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const maxRetries = 3;
  const retryCount = useRef(0);
  
  // Load notification preferences from localStorage or use defaults
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    const savedPrefs = localStorage.getItem('notificationPreferences');
    return savedPrefs ? JSON.parse(savedPrefs) : DEFAULT_NOTIFICATION_PREFERENCES;
  });
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(notificationPrefs));
    // Play a test sound when sound preference is enabled
    if (notificationPrefs.sound) {
      notificationSound.volume = 0.5; // Lower volume for test sound
      notificationSound.play().catch(error => {
        console.error('Failed to play notification sound:', error);
      });
    }
  }, [notificationPrefs]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && notificationPrefs.desktop) {
      Notification.requestPermission();
    }
  }, [notificationPrefs.desktop]);

  // Check if all notifications are disabled (master switch is off)
  const areAllNotificationsDisabled = useCallback(() => {
    // Read directly from localStorage to ensure we have the latest value
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (!savedPrefs) return false;

    try {
      const prefs = JSON.parse(savedPrefs);
      // If all notification channels are off, consider notifications disabled
      return !(prefs.desktop || prefs.toast || prefs.sound || prefs.animateBell);
    } catch (error) {
      console.error('Failed to parse notification preferences:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback((title: string, message: string) => {
    // First check if notifications are completely disabled (master toggle)
    if (areAllNotificationsDisabled()) {
      console.log('All notifications are disabled via master toggle, notification suppressed:', title);
      return;
    }
    
    // Double-check the in-memory state as well
    const notificationsEnabled = notificationPrefs.desktop || 
                               notificationPrefs.toast || 
                               notificationPrefs.sound || 
                               notificationPrefs.animateBell;
    
    if (!notificationsEnabled) {
      console.log('Notifications are disabled in memory, skipping notification:', title);
      return;
    }
    
    console.log('Processing notification with current preferences:', notificationPrefs);
    
    // Play notification sound only if enabled
    if (notificationPrefs.sound) {
      console.log('Playing notification sound for:', title);
      // Check if we need to reload the sound (prevents issues with sound not playing)
      try {
        // Create a new Audio instance for each notification to avoid issues
        const tempSound = new Audio("/notification.mp3");
        tempSound.volume = 0.5;
        tempSound.play().catch(error => {
          console.error('Failed to play notification sound:', error);
        });
      } catch (error) {
        console.error('Error creating or playing notification sound:', error);
      }
    }

    // Show desktop notification if permitted and enabled
    if (notificationPrefs.desktop && "Notification" in window && Notification.permission === "granted") {
      console.log('Showing desktop notification for:', title);
      try {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico"
        });
      } catch (error) {
        console.error('Failed to show desktop notification:', error);
        // Fallback to toast if desktop notification fails
        if (!notificationPrefs.toast) {
          toast({
            title,
            description: message,
            duration: 5000,
          });
        }
      }
    }

    // Show toast notification if enabled
    if (notificationPrefs.toast) {
      console.log('Showing toast notification for:', title);
      toast({
        title,
        description: message,
        duration: 5000,
      });
    }
  }, [toast, notificationPrefs, areAllNotificationsDisabled]);

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Attempting to connect to WebSocket at:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        retryCount.current = 0;
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = undefined;
        }
        
        // Send a ping to verify connection is active
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send ping message:', error);
        }
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            console.log('Ping received, connection is healthy');
            return;
          }
          
          if (data.type === 'notification') {
            console.log('Notification received:', data.data);
            
            // Always update the notification list in the UI
            queryClient.invalidateQueries({ queryKey });
            
            // First check if all notifications are disabled via master toggle
            if (areAllNotificationsDisabled()) {
              console.log('Notification received but suppressed: master notification toggle is OFF');
              return;
            }
            
            // Check specific notification channels
            const notificationsEnabled = notificationPrefs.desktop || 
                                       notificationPrefs.toast || 
                                       notificationPrefs.sound || 
                                       notificationPrefs.animateBell;
                                       
            if (notificationsEnabled) {
              console.log('Showing notification with preferences:', 
                         {desktop: notificationPrefs.desktop, 
                          toast: notificationPrefs.toast, 
                          sound: notificationPrefs.sound, 
                          animateBell: notificationPrefs.animateBell});
              showNotification(data.data.title, data.data.message);
            } else {
              console.log('Notification received but not shown due to disabled notification channels');
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}, reason: ${event.reason}`);
        wsRef.current = null;
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          const delay = Math.min(2000 * Math.pow(1.5, retryCount.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${retryCount.current} of ${maxRetries})`);
          reconnectTimeout.current = setTimeout(connectWebSocket, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't close immediately on error, let the connection attempt finish
        // since the onclose handler will be called if the connection fails
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Try to reconnect in case of initialization error
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
      }
    }
  }, [user, queryClient, showNotification, notificationPrefs]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connectWebSocket]);

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    enabled: !!user
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
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
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  return {
    notifications,
    unreadCount: notifications.filter((n: Notification) => !n.read).length,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    notificationPrefs,
    setNotificationPrefs
  };
}