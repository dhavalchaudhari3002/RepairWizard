import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Wrench, Store, User } from "lucide-react";
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
    <div className="container min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold">
              Your One-Stop Repair Solution
            </h1>
            <p className="text-muted-foreground text-lg">
              Join our platform and become part of the repair ecosystem. Choose your role and get started today!
            </p>
            <div className="pt-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => setShowAuthDialog(true)}
              >
                Get Started
              </Button>
              <AuthDialog
                mode="login"
                isOpen={showAuthDialog}
                onOpenChange={setShowAuthDialog}
              />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Customer Role Card */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
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
              <ul className="grid gap-2 pl-6">
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Submit repair requests with AI-powered diagnostics
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Get instant cost estimates
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Connect with skilled repairers
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Track repair status in real-time
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Access repair guides and documentation
                </li>
              </ul>
            </div>

            {/* Repairer Role Card */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
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
              <ul className="grid gap-2 pl-6">
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Showcase your repair specialties and expertise
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Receive repair requests from customers
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Provide expert diagnostics and estimates
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Build your reputation with customer reviews
                </li>
                <li className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                  Access AI-powered repair guides and documentation
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}