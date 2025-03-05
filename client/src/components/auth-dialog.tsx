import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type AuthDialogProps = {
  mode: "login" | "register" | "reset-password" | "forgot-password";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the 6-digit code"),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type View = "login" | "register" | "forgot-password" | "verify-otp" | "reset-password";

export function AuthDialog({ mode = "login", isOpen, onOpenChange }: AuthDialogProps) {
  const { loginMutation, registerMutation, forgotPasswordMutation, resetPasswordMutation } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>(mode);
  const [showPassword, setShowPassword] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (isOpen) {
      setView(mode);
    }
  }, [isOpen, mode]);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleForgotPasswordSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    try {
      await forgotPasswordMutation.mutateAsync({ email: data.email });
      setUserEmail(data.email);
      setView("verify-otp");
      toast({
        description: "Reset code sent to your email"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset code"
      });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (view === "login") {
        await loginMutation.mutateAsync({
          email: data.email,
          password: data.password,
        });
        onOpenChange(false);
      } else if (view === "forgot-password") {
        await handleForgotPasswordSubmit(data);
      }
    } catch (error: any) {
      console.error(`${view} error:`, error);
      toast({
        variant: "destructive",
        title: `${view.charAt(0).toUpperCase() + view.slice(1)} Failed`,
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  const isSubmitting = view === "login" ? loginMutation.isPending : forgotPasswordMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === "login" ? "Login to your account" : 
             view === "forgot-password" ? "Reset Password" : ""}
          </DialogTitle>
          <DialogDescription>
            {view === "login" ? "Welcome back" : 
             view === "forgot-password" ? "Enter your email to receive a reset code" : ""}
          </DialogDescription>
        </DialogHeader>

        <Form {...(view === "login" ? loginForm : forgotPasswordForm)}>
          <form onSubmit={view === "login" ? 
            loginForm.handleSubmit(handleSubmit) : 
            forgotPasswordForm.handleSubmit(handleSubmit)} 
            className="space-y-4"
          >
            <FormField
              control={view === "login" ? loginForm.control : forgotPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {view === "login" && (
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {view === "login" ? "Logging in..." : "Sending reset code..."}
                </>
              ) : (
                view === "login" ? "Login" : "Send Reset Code"
              )}
            </Button>

            {view === "login" && (
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setView("forgot-password")}
                disabled={isSubmitting}
              >
                Forgot your password?
              </Button>
            )}

            {view === "forgot-password" && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setView("login")}
                disabled={isSubmitting}
              >
                Back to Login
              </Button>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}