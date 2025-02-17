import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useNotifications() {
  const queryClient = useQueryClient();
  const queryKey = ["/api/notifications"];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiRequest("/api/notifications");
      return response as Notification[];
    },
  });

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) =>
      apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      } as RequestInit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () =>
      apiRequest("/api/notifications/read-all", {
        method: "PATCH",
      } as RequestInit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}