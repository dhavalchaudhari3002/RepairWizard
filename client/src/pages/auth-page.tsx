import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Wrench, User } from "lucide-react";
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
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Your One-Stop Repair Solution
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our platform and become part of the repair ecosystem. Choose your role and get started today!
          </p>
          <Button
            onClick={() => setShowAuthDialog(true)}
            size="lg"
            className="inline-flex items-center justify-center"
          >
            Get Started
          </Button>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Customer Role Card */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Customer</h3>
                <p className="text-muted-foreground">
                  Get expert repair assistance for your devices
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              <li className="text-muted-foreground">• Submit repair requests with AI-powered diagnostics</li>
              <li className="text-muted-foreground">• Get instant cost estimates</li>
              <li className="text-muted-foreground">• Connect with skilled repairers</li>
              <li className="text-muted-foreground">• Track repair status in real-time</li>
              <li className="text-muted-foreground">• Access repair guides and documentation</li>
            </ul>
          </div>

          {/* Repairer Role Card */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Repairer</h3>
                <p className="text-muted-foreground">
                  Offer your repair expertise and grow your business
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              <li className="text-muted-foreground">• Showcase your repair specialties and expertise</li>
              <li className="text-muted-foreground">• Receive repair requests from customers</li>
              <li className="text-muted-foreground">• Provide expert diagnostics and estimates</li>
              <li className="text-muted-foreground">• Build your reputation with customer reviews</li>
              <li className="text-muted-foreground">• Access AI-powered repair guides and documentation</li>
            </ul>
          </div>
        </div>
      </div>

      <AuthDialog
        mode="login"
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
}