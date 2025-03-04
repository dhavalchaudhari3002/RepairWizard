import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "@/components/auth-dialog";

export default function ResetPasswordPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setLocation('/auth');
      return;
    }
    setShowDialog(true);
  }, [setLocation]);

  return (
    <AuthDialog
      mode="login"
      isOpen={showDialog}
      onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setLocation('/auth');
        }
      }}
    />
  );
}
