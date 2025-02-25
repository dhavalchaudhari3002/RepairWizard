import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { useState } from "react";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Handler for opening auth dialog
  const handleGetStarted = () => {
    console.log("Opening auth dialog"); // Debug log
    setShowAuthDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Your One-Stop Repair Solution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join our platform and get started today!
          </p>

          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="mb-8 !cursor-pointer hover:scale-105 transition-transform"
          >
            Get Started
          </Button>
        </div>

        {/* Auth Dialog with explicit open state control */}
        <AuthDialog
          mode="login"
          isOpen={showAuthDialog}
          onOpenChange={(open) => {
            console.log("Dialog state changing to:", open); // Debug log
            setShowAuthDialog(open);
          }}
        />
      </main>
    </div>
  );
}