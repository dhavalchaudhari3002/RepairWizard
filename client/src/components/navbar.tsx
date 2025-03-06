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
import { Bell, Menu, User, AlertTriangle } from "lucide-react";
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
            {user ? (
              <>
                <NotificationsPopover />
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {`${user.firstName} ${user.lastName}`}
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
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ThemeToggle } from "../styles/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary mr-2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <span className="font-bold text-xl">RepairAI</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          {user ? (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
