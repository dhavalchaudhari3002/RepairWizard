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
import { Bell, Menu, User } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationsPopover } from "@/components/notifications";
import { AuthDialog } from "@/components/auth-dialog";
import { useState } from "react";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const { notifications = [], isLoading: notificationsLoading } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Repair Assistant
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-between space-x-2">
          <div className="hidden md:flex">
            {user && (
              <Button variant="ghost" asChild>
                <Link href="/">Dashboard</Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationsPopover />
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {user.username}
                  </span>
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