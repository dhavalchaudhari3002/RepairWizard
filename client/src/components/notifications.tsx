import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { useNotificationsContext as useNotifications } from "@/hooks/use-notifications-context";
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
  const { notifications = [], isLoading, notificationPrefs } = useNotifications();
  if (isLoading) return null;

  // Check if notifications are enabled
  const notificationsEnabled = notificationPrefs.desktop || 
                              notificationPrefs.toast || 
                              notificationPrefs.sound || 
                              notificationPrefs.animateBell;
  
  // If notifications are disabled, don't show badge
  if (!notificationsEnabled) return null;
  
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

  // Derive all-notifications-enabled state from preferences
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(() => 
    notificationPrefs.desktop || notificationPrefs.toast || notificationPrefs.sound || notificationPrefs.animateBell
  );
  
  // Update when preferences change
  React.useEffect(() => {
    setNotificationsEnabled(
      notificationPrefs.desktop || 
      notificationPrefs.toast || 
      notificationPrefs.sound || 
      notificationPrefs.animateBell
    );
  }, [notificationPrefs]);

  // Helper function to update and save notification preferences
  const updateNotificationPreference = React.useCallback((key: string, value: boolean) => {
    // Create new preferences object
    const newPrefs = {
      ...notificationPrefs,
      [key]: value
    };
    
    // Update in-memory state
    setNotificationPrefs(newPrefs);
    
    // Save directly to localStorage for immediate effect
    localStorage.setItem('notificationPreferences', JSON.stringify(newPrefs));
    
    console.log(`Updated notification preference: ${key} = ${value}`, newPrefs);
    
    return newPrefs;
  }, [notificationPrefs, setNotificationPrefs]);

  // Individual preference toggle handlers
  const handleDesktopToggle = React.useCallback((checked: boolean) => {
    updateNotificationPreference('desktop', checked);
    
    // Request permission for desktop notifications if enabling
    if (checked && "Notification" in window) {
      Notification.requestPermission();
    }
  }, [updateNotificationPreference]);

  const handleToastToggle = React.useCallback((checked: boolean) => {
    updateNotificationPreference('toast', checked);
  }, [updateNotificationPreference]);

  const handleSoundToggle = React.useCallback((checked: boolean) => {
    updateNotificationPreference('sound', checked);
  }, [updateNotificationPreference]);

  const handleBellAnimationToggle = React.useCallback((checked: boolean) => {
    updateNotificationPreference('animateBell', checked);
  }, [updateNotificationPreference]);
  
  // Toggle all notifications on/off
  const handleAllNotificationsToggle = React.useCallback((checked: boolean) => {
    console.log(`Master notification toggle changed to: ${checked ? 'ON' : 'OFF'}`);
    
    setNotificationsEnabled(checked);
    
    const newPrefs = checked ? 
      // Turn on defaults with all channels enabled
      {
        desktop: true,
        toast: true,
        sound: true,
        animateBell: true
      } :
      // Turn off all notification channels
      {
        desktop: false,
        toast: false,
        sound: false,
        animateBell: false
      };
    
    // Update in-memory state
    setNotificationPrefs(newPrefs);
    
    // Save directly to localStorage to ensure we get immediate effect
    localStorage.setItem('notificationPreferences', JSON.stringify(newPrefs));
    
    // Request permission for desktop notifications if enabled
    if (checked && "Notification" in window) {
      Notification.requestPermission();
    }
    
    // Log current state for debugging
    console.log('Updated notification preferences:', newPrefs);
  }, [setNotificationPrefs]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <motion.div
            animate={unreadCount && notificationPrefs.animateBell && notificationsEnabled ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 1, repeat: (unreadCount && notificationPrefs.animateBell && notificationsEnabled) ? Infinity : 0, repeatDelay: 3 }}
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
          <div className="mb-3 flex items-center justify-between space-y-0.5">
            <div>
              <div className="flex items-center gap-2">
                <label htmlFor="all-notifications" className="text-sm font-medium">
                  All Notifications
                </label>
                <Badge variant={notificationsEnabled ? "default" : "destructive"} className="px-2 py-0.5 text-xs">
                  {notificationsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {notificationsEnabled ? "You will receive notifications" : "All notifications are turned off"}
              </p>
            </div>
            <Switch 
              id="all-notifications"
              checked={notificationsEnabled}
              onCheckedChange={handleAllNotificationsToggle}
            />
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
                disabled={!notificationsEnabled}
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
                disabled={!notificationsEnabled}
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
                disabled={!notificationsEnabled}
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
                disabled={!notificationsEnabled}
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