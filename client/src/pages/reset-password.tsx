import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "@/components/auth-dialog";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [showDialog, setShowDialog] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      toast({
        variant: "destructive",
        title: "Invalid Reset Link",
        description: "The password reset link is invalid or has expired. Please request a new one."
      });
      setLocation('/auth');
      return;
    }
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
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