import { useState, useEffect, Suspense } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { NavBar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from '@/hooks/use-auth';
import { NotificationsProvider } from '@/hooks/use-notifications-context';
import { DarkModeProvider } from '@/hooks/use-dark-mode';
import { PrivacyProvider } from '@/context/privacy-context';

// Pages
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/auth-page';
import AnalyticsDashboard from '@/pages/analytics-dashboard';
import ResetPassword from '@/pages/reset-password';
import ToolsPage from '@/pages/tools-page';
import UploadImagePage from '@/pages/upload-image-page';
import VerificationPage from '@/pages/verification-page';
import { CloudStoragePage } from '@/pages/cloud-storage-page';
import { RepairJourneyPage } from '@/pages/repair-journey-page';
import TermsOfService from '@/pages/terms-of-service';
import PrivacyPolicy from '@/pages/privacy-policy';

// Protected route wrapper
import { ProtectedRoute } from '@/lib/protected-route';

// Fallback loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    console.log("App component mounted");
    
    // Initialize app and check if everything is ready
    const timer = setTimeout(() => {
      console.log("App finished loading check");
      setIsInitialized(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isInitialized) {
    return <LoadingFallback />;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <DarkModeProvider>
          <PrivacyProvider>
            <AuthProvider>
              <NotificationsProvider>
                <Suspense fallback={<LoadingFallback />}>
                  <div className="min-h-screen bg-background flex flex-col">
                    <NavBar />
                    <main className="flex-grow">
                      <Switch>
                        <Route path="/" component={Home} />
                        <Route path="/auth" component={AuthPage} />
                        <Route path="/reset-password" component={ResetPassword} />
                        <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsDashboard} />} />
                        <Route path="/tools" component={() => <ProtectedRoute component={ToolsPage} />} />
                        <Route path="/upload-image" component={UploadImagePage} />
                        <Route path="/verification" component={VerificationPage} />
                        <Route path="/cloud-storage" component={() => <ProtectedRoute component={CloudStoragePage} />} />
                        <Route path="/repair-journey" component={() => <ProtectedRoute component={RepairJourneyPage} />} />
                        <Route path="/terms-of-service" component={TermsOfService} />
                        <Route path="/privacy-policy" component={PrivacyPolicy} />
                        <Route component={NotFound} />
                      </Switch>
                    </main>
                    <Footer />
                    <Toaster />
                  </div>
                </Suspense>
              </NotificationsProvider>
            </AuthProvider>
          </PrivacyProvider>
        </DarkModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
