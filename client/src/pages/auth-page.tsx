import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { AuthDialog } from "@/components/auth-dialog";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background" onClick={() => console.log("Background clicked")}>
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Your One-Stop Repair Solution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join our platform and get started today!
          </p>

          {/* Test button with direct onclick handler */}
          <button
            type="button"
            onClick={() => {
              alert("Button clicked!");
              setShowAuthDialog(true);
            }}
            style={{ cursor: 'pointer' }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2"
          >
            Get Started
          </button>
        </div>

        <AuthDialog
          mode="login"
          isOpen={showAuthDialog}
          onOpenChange={(open) => {
            alert("Dialog state changing to: " + open);
            setShowAuthDialog(open);
          }}
        />
      </main>
    </div>
  );
}