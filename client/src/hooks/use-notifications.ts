import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useNotifications() {
  const queryClient = useQueryClient();
  const queryKey = ["/api/notifications"];

  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      try {
        console.log("Fetching notifications...");
        const data = await apiRequest("/api/notifications", {
          method: "GET"
        });
        console.log("Received notifications:", data);
        return data as Notification[];
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        throw error;
      }
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/notifications/read-all", {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
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