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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Email form schema
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// OTP form schema
const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the 6-digit code"),
});

// Password form schema
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

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [resetData, setResetData] = useState({ email: "", otp: "" });

  // Email form handling
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" }
  });

  // OTP form handling
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" }
  });

  // Password form handling
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  // Handle email submission
  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset code");
      }

      // Store email and move to OTP step
      setResetData({ ...resetData, email: values.email });
      setStep("otp");

      toast({
        description: "A verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async (values: z.infer<typeof otpSchema>) => {
    // Store OTP and move to password step
    setResetData({ ...resetData, otp: values.otp });
    setStep("password");
  };

  // Handle password submission
  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetData.email,
          otp: resetData.otp,
          newPassword: values.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      toast({
        description: "Password reset successful. You can now login with your new password.",
      });

      setLocation('/auth');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
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
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "otp" && "Enter the 6-digit code sent to your email"}
            {step === "password" && "Choose a new password for your account"}
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
                        Didn't receive the code?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          type="button"
                          onClick={() => {
                            setStep("email");
                            emailForm.setValue("email", resetData.email);
                          }}
                        >
                          Try again
                        </Button>
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