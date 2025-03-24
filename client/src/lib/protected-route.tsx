import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  component: () => React.JSX.Element;
}

export function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  
  // Only show loading spinner for a maximum of 1.5 seconds
  // This prevents infinite loading if there's an issue with authentication
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading state only for a limited time
  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading timeout or when we have definitive info, redirect if no user
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}