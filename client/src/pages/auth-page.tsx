import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <main className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Your One-Stop Repair Solution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our platform and get started today!
          </p>

          <Button
            variant="default"
            size="lg"
            onClick={() => setShowAuthDialog(true)}
            className="mt-6"
          >
            Get Started
          </Button>
        </div>

        <AuthDialog
          mode="login"
          isOpen={showAuthDialog}
          onOpenChange={setShowAuthDialog}
        />
      </main>
    </div>
  );
}