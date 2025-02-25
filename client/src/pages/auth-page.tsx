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

          {/* Simple button implementation */}
          <Button
            onClick={() => setShowAuthDialog(true)}
            size="lg"
            className="mb-8"
          >
            Get Started
          </Button>
        </div>

        {/* Auth Dialog */}
        <AuthDialog
          mode="login"
          isOpen={showAuthDialog}
          onOpenChange={setShowAuthDialog}
        />
      </main>
    </div>
  );
}