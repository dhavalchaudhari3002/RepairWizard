import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Code must be exactly 6 digits"),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type Step = "email" | "otp" | "password";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" }
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" }
  });

  const passwordForm = useForm<{ password: string, confirmPassword: string }>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  const handleEmailSubmit = async (values: { email: string }) => {
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset code');
      }

      setVerifiedEmail(values.email);
      setStep("otp");

      toast({
        title: "Code sent!",
        description: "Please check your email for the reset code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset code. Please try again."
      });
    }
  };

  const handleOTPSubmit = async (values: { otp: string }) => {
    setStep("password");
  };

  const handlePasswordSubmit = async (values: { password: string }) => {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifiedEmail,
          otp: otpForm.getValues().otp,
          newPassword: values.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      toast({
        title: "Success",
        description: "Your password has been reset successfully. You can now login with your new password.",
      });

      setLocation('/auth');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password. Please try again."
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {step === "email" && "Reset Password"}
            {step === "otp" && "Enter Verification Code"}
            {step === "password" && "Create New Password"}
          </CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to receive a reset code"}
            {step === "otp" && "Enter the 6-digit code sent to your email"}
            {step === "password" && "Create a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="Enter your email"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Send Reset Code
                </Button>
              </form>
            </Form>
          )}

          {step === "otp" && (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                          autoFocus
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground mt-2">
                        Didn't receive a code? <Button variant="link" className="p-0 h-auto" type="button" onClick={() => handleEmailSubmit({ email: verifiedEmail })}>Resend code</Button>
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Verify Code
                </Button>
              </form>
            </Form>
          )}

          {step === "password" && (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Enter new password"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Confirm new password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => setLocation('/auth')}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}