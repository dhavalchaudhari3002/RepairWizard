import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "@/components/auth-dialog";

export default function ResetPasswordPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      // If no token is present, redirect to auth page
      setLocation('/auth');
      return;
    }

    // Show the dialog if token is present
    setShowDialog(true);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <AuthDialog
        mode="reset-password"
        isOpen={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setLocation('/auth');
          }
        }}
      />
    </div>
  );
}