import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState, useEffect } from "react";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    console.log("Auth page mounted");
    // Log any potential overlapping elements
    const elements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    console.log("Elements at center:", elements);
  }, []);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleGetStarted = (event: React.MouseEvent) => {
    console.log("Get Started clicked", {
      target: event.target,
      currentTarget: event.currentTarget,
      eventPhase: event.eventPhase,
    });
    try {
      setShowAuthDialog(true);
    } catch (error) {
      console.error("Error showing auth dialog:", error);
    }
  };

  const handleDialogChange = (open: boolean) => {
    console.log("Dialog state changing to:", open);
    try {
      setShowAuthDialog(open);
    } catch (error) {
      console.error("Error updating dialog state:", error);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background"
      onClick={(e) => console.log("Background clicked", e.target)}
    >
      <main className="container relative mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Your One-Stop Repair Solution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join our platform and get started today!
          </p>

          <Button
            variant="default"
            size="lg"
            onClick={handleGetStarted}
            className="inline-flex items-center"
          >
            Get Started
          </Button>
        </div>

        <AuthDialog
          mode="login"
          isOpen={showAuthDialog}
          onOpenChange={handleDialogChange}
        />
      </main>
    </div>
  );
}