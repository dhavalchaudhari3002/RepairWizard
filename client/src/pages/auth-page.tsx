import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState, useEffect } from "react";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Force dark mode when component mounts
  useEffect(() => {
    // Ensure dark mode is applied
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-primary/5">
      <main className="w-full max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">AI Repair Assistant</h1>
          </div>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Your intelligent repair companion. Get expert guidance, cost estimates, and step-by-step solutions for any repair need.
          </p>

          <Button
            variant="default"
            size="lg"
            onClick={() => setShowAuthDialog(true)}
            className="mt-4"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Smart Diagnostics</h3>
            </div>
            <p className="text-muted-foreground">Advanced AI analysis to identify problems accurately</p>
          </div>

          <div className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Expert Guidance</h3>
            </div>
            <p className="text-muted-foreground">Step-by-step repair instructions and professional tips</p>
          </div>

          <div className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M12 1v22"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Cost Estimates</h3>
            </div>
            <p className="text-muted-foreground">Accurate repair cost predictions and comparisons</p>
          </div>
        </div>
      </main>

      <AuthDialog
        mode="login"
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
}