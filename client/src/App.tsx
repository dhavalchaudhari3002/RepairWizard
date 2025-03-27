import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import ResetPassword from "@/pages/reset-password";
import ErrorDashboard from "@/pages/error-dashboard";
import ToolsPage from "@/pages/tools-page";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { DarkModeProvider } from "@/hooks/use-dark-mode";
import { NotificationsProvider } from "./hooks/use-notifications-context";
import { NavBar } from "@/components/navbar";

function Router() {
  const [location] = useLocation();
  // Hide navbar on auth and reset-password routes
  const showNavBar = !["auth", "reset-password"].includes(location.split("/")[1]);
  
  // Keep on homepage to show the application
  // Don't redirect so user can interact with the home page
  
  return (
    <div className="relative min-h-screen flex flex-col">
      {showNavBar && <NavBar />}
      <main className="flex-1 relative z-0">
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/" component={Home} />
          <Route path="/error-dashboard" component={ErrorDashboard} />
          <Route path="/tools" component={ToolsPage} />
          <Route path="/analytics" component={AnalyticsDashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DarkModeProvider>
          <NotificationsProvider>
            <Router />
          </NotificationsProvider>
        </DarkModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
