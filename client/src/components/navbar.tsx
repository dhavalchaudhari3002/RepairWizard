import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, User, AlertTriangle, Wrench, Settings, BellOff, ShoppingCart } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationsPopover } from "@/components/notifications";
import { AuthDialog } from "@/components/auth-dialog";
import { useState, useEffect } from "react";
import { ThemeToggle } from "../styles/theme-toggle";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Notification as AppNotification } from "@shared/schema";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const { 
    notifications = [], 
    isLoading: notificationsLoading,
    notificationPrefs,
    setNotificationPrefs 
  } = useNotifications();
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  // Derive notificationsEnabled state from notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => 
    notificationPrefs.desktop || notificationPrefs.toast || notificationPrefs.sound || notificationPrefs.animateBell
  );
  
  // Update notificationsEnabled whenever preferences change
  useEffect(() => {
    setNotificationsEnabled(
      notificationPrefs.desktop || 
      notificationPrefs.toast || 
      notificationPrefs.sound || 
      notificationPrefs.animateBell
    );
  }, [notificationPrefs]);

  // Handler functions for notification preferences
  const handleDesktopToggle = (checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      desktop: checked
    });
    
    if (checked && "Notification" in window) {
      Notification.requestPermission();
    }
  };

  const handleToastToggle = (checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      toast: checked
    });
  };

  const handleSoundToggle = (checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      sound: checked
    });
  };

  const handleBellAnimationToggle = (checked: boolean) => {
    setNotificationPrefs({
      ...notificationPrefs,
      animateBell: checked
    });
  };

  // Toggle all notifications on/off
  const handleAllNotificationsToggle = (checked: boolean) => {
    setNotificationsEnabled(checked);
    
    if (checked) {
      // Turn on defaults
      setNotificationPrefs({
        desktop: true,
        toast: true,
        sound: true,
        animateBell: true
      });
      
      if ("Notification" in window) {
        Notification.requestPermission();
      }
    } else {
      // Turn off all
      setNotificationPrefs({
        desktop: false,
        toast: false,
        sound: false,
        animateBell: false
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Smart Repair Partner
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-between space-x-2">
          <div className="hidden md:flex">
            <Button variant="ghost" asChild>
              <Link href="/tools" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Tool Shop
              </Link>
            </Button>
            {user && (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/">Dashboard</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/error-dashboard" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Error Dashboard
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <>
                {/* Notification Settings Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Notification Settings</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Notification Settings</DialogTitle>
                      <DialogDescription>
                        Control how and when you receive notifications
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex items-center justify-between py-4 border-b">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">Notifications</h4>
                          <Badge variant={notificationsEnabled ? "default" : "destructive"} className="px-2 py-0.5 text-xs">
                            {notificationsEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {notificationsEnabled ? "You will receive notifications" : "All notifications are turned off"}
                        </p>
                      </div>
                      <Switch 
                        id="notifications-master-toggle"
                        checked={notificationsEnabled}
                        onCheckedChange={handleAllNotificationsToggle}
                      />
                    </div>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Notification channels</h4>
                        <p className="text-xs text-muted-foreground">Choose how you want to be notified</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
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
                          <div className="space-y-0.5">
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
                          <div className="space-y-0.5">
                            <label htmlFor="sound-notifications" className="text-sm font-medium">
                              Sound Alerts
                            </label>
                            <p className="text-xs text-muted-foreground">Play a sound for new notifications</p>
                          </div>
                          <Switch 
                            id="sound-notifications" 
                            checked={notificationPrefs.sound}
                            onCheckedChange={handleSoundToggle}
                            disabled={!notificationsEnabled}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
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
                    </div>
                    
                    <DialogFooter className="text-xs text-muted-foreground">
                      <p>Preferences are saved automatically</p>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <NotificationsPopover />
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {`${user.firstName} ${user.lastName}`}
                  </span>
                  <Avatar>
                    <AvatarFallback>
                      {`${user.firstName[0]}${user.lastName[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="cursor-pointer">
                        <User className="h-5 w-5" />
                        <span className="sr-only">User menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="cursor-pointer"
                      >
                        {logoutMutation.isPending ? "Logging out..." : "Log out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Button 
                    variant="default"
                    onClick={() => setShowAuthDialog(true)}
                    className="cursor-pointer"
                  >
                    Login
                  </Button>
                  <AuthDialog
                    mode="login"
                    isOpen={showAuthDialog}
                    onOpenChange={setShowAuthDialog}
                  />
                </div>

                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="cursor-pointer">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                      </SheetHeader>
                      <div className="grid gap-4 py-4">
                        <Button variant="ghost" asChild>
                          <Link href="/tools" className="flex items-center gap-2 justify-center">
                            <ShoppingCart className="h-4 w-4" />
                            Tool Shop
                          </Link>
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => setShowAuthDialog(true)}
                          className="cursor-pointer"
                        >
                          Login
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}