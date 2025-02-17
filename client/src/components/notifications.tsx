import * as React from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/schema";

export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (!unreadCount) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
    >
      {unreadCount}
    </Badge>
  );
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead } = useNotifications();
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-lg p-4 transition-colors",
        !notification.read && "bg-muted",
        isHovered && "bg-muted/80"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !notification.read && markAsRead.mutate(notification.id)}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{notification.title}</h4>
        {!notification.read && (
          <Badge variant="secondary" className="h-5 text-xs">
            New
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{notification.message}</p>
      <time className="text-xs text-muted-foreground">
        {new Date(notification.createdAt).toLocaleDateString()}
      </time>
    </div>
  );
}

export function NotificationList() {
  const { notifications, isLoading, error, markAllAsRead } = useNotifications();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive">Failed to load notifications</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllAsRead.mutate()}
          disabled={!notifications.some((n: Notification) => !n.read)}
        >
          Mark all as read
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="flex flex-col gap-2 p-4">
          {notifications.map((notification: Notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function NotificationsMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <NotificationBadge />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <NotificationList />
      </SheetContent>
    </Sheet>
  );
}