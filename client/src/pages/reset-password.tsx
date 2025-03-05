import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "@/components/auth-dialog";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [showDialog, setShowDialog] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = new URLSearchParams(window.location.search).get('token');

        if (!token) {
          toast({
            variant: "destructive",
            title: "Invalid Reset Link",
            description: "The password reset link is invalid or missing. Please request a new one."
          });
          setLocation('/auth');
          return;
        }

        const response = await fetch(`/api/reset-password/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          throw new Error(data.message || "Invalid or expired reset token");
        }

        setIsValidating(false);
      } catch (error: any) {
        console.error("Token validation error:", error);
        toast({
          variant: "destructive",
          title: "Invalid Reset Link",
          description: error.message || "The password reset link is invalid or has expired. Please request a new one."
        });
        setLocation('/auth');
      }
    };

    validateToken();
  }, [setLocation, toast]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

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