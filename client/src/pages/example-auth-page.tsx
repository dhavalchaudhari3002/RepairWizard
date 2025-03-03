import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export default function ExampleAuthPage() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Example</h1>
      
      {user ? (
        <div className="space-y-4">
          <p>Welcome, {user.firstName}!</p>
          <p>Your email: {user.email}</p>
          <p>Your role: {user.role}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p>Please log in to see your details</p>
          <Button onClick={() => setShowAuthDialog(true)}>
            Login / Register
          </Button>
        </div>
      )}

      <AuthDialog
        mode="login"
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
}
