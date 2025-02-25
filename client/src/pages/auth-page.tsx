import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

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
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Smart Diagnostics</h3>
            <p className="text-muted-foreground">Advanced AI analysis to identify problems accurately</p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Expert Guidance</h3>
            <p className="text-muted-foreground">Step-by-step repair instructions and professional tips</p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h3 className="text-lg font-semibold mb-2">Cost Estimates</h3>
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