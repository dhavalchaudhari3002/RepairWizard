import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import ResetPassword from "@/pages/reset-password";
import ErrorDashboard from "@/pages/error-dashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { NavBar } from "@/components/navbar";

function Router() {
  const [location] = useLocation();
  // Hide navbar on auth and reset-password routes
  const showNavBar = !["auth", "reset-password"].includes(location.split("/")[1]);

  return (
    <div className="relative min-h-screen flex flex-col">
      {showNavBar && <NavBar />}
      <main className="flex-1 relative z-0">
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password">
            <ResetPassword />
          </Route>
          <Route path="/">
            <ProtectedRoute component={Home} />
          </Route>
          <Route path="/error-dashboard">
            <ProtectedRoute component={ErrorDashboard} />
          </Route>
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
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}