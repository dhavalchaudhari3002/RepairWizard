import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { motion, AnimatePresence } from "framer-motion";
import type { Notification } from "@shared/schema";

// Add notification sound
const notificationSound = new Audio("/notification.mp3");

export function NotificationBadge() {
  const { notifications = [], isLoading } = useNotifications();
  if (isLoading) return null;

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;
  if (!unreadCount) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
      >
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
        >
          {unreadCount}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead } = useNotifications();
  const [isHovered, setIsHovered] = React.useState(false);

  // Add animation for new notifications
  const isNew = !notification.read;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className={cn(
        "relative flex flex-col gap-1 rounded-lg p-4 transition-colors",
        !notification.read && "bg-muted",
        isHovered && "bg-muted/80"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        !notification.read && markAsRead.mutate(notification.id);
      }}
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
    </motion.div>
  );
}

export function NotificationList() {
  const { notifications = [], isLoading, error, markAllAsRead } = useNotifications();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load notifications"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
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

export function NotificationsPopover() {
  const { unreadCount, notificationPrefs, setNotificationPrefs } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);

  // Create these handler functions outside of the render
  const handleDesktopToggle = React.useCallback((checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      desktop: checked
    });
    
    if (checked && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [notificationPrefs, setNotificationPrefs]);

  const handleToastToggle = React.useCallback((checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      toast: checked
    });
  }, [notificationPrefs, setNotificationPrefs]);

  const handleSoundToggle = React.useCallback((checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      sound: checked
    });
  }, [notificationPrefs, setNotificationPrefs]);

  const handleBellAnimationToggle = React.useCallback((checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      animateBell: checked
    });
  }, [notificationPrefs, setNotificationPrefs]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <motion.div
            animate={unreadCount && notificationPrefs.animateBell ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 1, repeat: (unreadCount && notificationPrefs.animateBell) ? Infinity : 0, repeatDelay: 3 }}
          >
            {unreadCount ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </motion.div>
          <NotificationBadge />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <NotificationList />
        <div className="mt-6 p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Notification Settings</h4>
            <Badge variant="outline" className="px-2 py-1">
              Customize
            </Badge>
          </div>
          <div className="space-y-4 bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="desktop-notifications" className="text-sm font-medium">
                  Desktop Notifications
                </label>
                <p className="text-xs text-muted-foreground">Show alerts on your desktop</p>
              </div>
              <Switch 
                id="desktop-notifications" 
                checked={notificationPrefs.desktop}
                onCheckedChange={handleDesktopToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="toast-notifications" className="text-sm font-medium">
                  Toast Notifications
                </label>
                <p className="text-xs text-muted-foreground">Show in-app pop-up messages</p>
              </div>
              <Switch 
                id="toast-notifications" 
                checked={notificationPrefs.toast}
                onCheckedChange={handleToastToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="sound-notifications" className="text-sm font-medium">
                  Sound Alerts
                </label>
                <p className="text-xs text-muted-foreground">Play a sound when new notifications arrive</p>
              </div>
              <Switch 
                id="sound-notifications" 
                checked={notificationPrefs.sound}
                onCheckedChange={handleSoundToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="bell-animation" className="text-sm font-medium">
                  Bell Animation
                </label>
                <p className="text-xs text-muted-foreground">Animate the bell icon for new alerts</p>
              </div>
              <Switch 
                id="bell-animation" 
                checked={notificationPrefs.animateBell}
                onCheckedChange={handleBellAnimationToggle}
              />
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">Preferences are saved automatically</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}