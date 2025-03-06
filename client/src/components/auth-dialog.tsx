import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";

type AuthDialogProps = {
  mode: "login" | "forgot-password";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

export function AuthDialog({ mode = "login", isOpen, onOpenChange }: AuthDialogProps) {
  const { loginMutation, forgotPasswordMutation } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"login" | "forgot-password">(mode);
  const [showPassword, setShowPassword] = useState(false);

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
    mode: "onChange"
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onSubmit"
  });

  const handleSubmit = async (data: any) => {
    try {
      if (view === "login") {
        await loginMutation.mutateAsync({
          email: data.email,
          password: data.password,
        });
        onOpenChange(false);
      } else if (view === "forgot-password") {
        await forgotPasswordMutation.mutateAsync({
          email: data.email,
        });
        toast({
          description: "If an account exists with this email, you will receive a reset link."
        });
        setView("login");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred"
      });
    }
  };

  const isSubmitting = view === "login" ? loginMutation.isPending : forgotPasswordMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === "login" ? "Login to your account" : "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {view === "login" ? "Welcome back" : "Enter your email to receive a reset link"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {view === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
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
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={() => setView("forgot-password")}
                    disabled={isSubmitting}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
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
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setView("login");
                      forgotPasswordForm.reset();
                    }}
                    disabled={isSubmitting}
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const registerSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  tosAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy to continue",
  }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

export function AuthDialog({ open, onOpenChange, defaultTab = "login" }: AuthDialogProps) {
  const [tab, setTab] = useState<"login" | "register" | "forgot">(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      tosAccepted: false,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate progress for better user experience
      const progressInterval = setInterval(() => {
        setRegistrationProgress(prev => Math.min(prev + 20, 90));
      }, 500);

      await register(values);

      clearInterval(progressInterval);
      setRegistrationProgress(100);

      toast({
        title: "Registration successful!",
        description: "Your account has been created. You can now log in.",
      });

      setTimeout(() => {
        setTab("login");
        setRegistrationProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to create account. Please try again.",
        variant: "destructive",
      });
      setRegistrationProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPasswordSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/forgot-password", { 
        email: values.email 
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset link");
      }

      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a reset code shortly.",
      });

      // Redirect to the reset password page
      onOpenChange(false);
      navigate("/reset-password");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {tab === "login" ? "Log in to your account" : 
             tab === "register" ? "Create an account" : 
             "Reset your password"}
          </DialogTitle>
          <DialogDescription>
            {tab === "login" ? "Enter your email and password below to log in" : 
             tab === "register" ? "Fill out the form below to create a new account" : 
             "Enter your email to receive a reset link"}
          </DialogDescription>
        </DialogHeader>

        {tab === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your email address" 
                        {...field} 
                        type="email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your password" 
                        type="password" 
                        {...field}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                variant="link" 
                size="sm" 
                type="button"
                onClick={() => setTab("forgot")}
                className="px-0 text-muted-foreground"
              >
                Forgot password?
              </Button>

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Log in"}
                </Button>
                <div className="mt-2 text-center text-sm">
                  Don't have an account?{" "}
                  <Button variant="link" size="sm" type="button" onClick={() => setTab("register")}>
                    Sign up
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        ) : tab === "register" ? (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={registerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} autoComplete="given-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="john.doe@example.com" 
                        {...field} 
                        type="email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Create a password" 
                        type="password" 
                        {...field}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="tosAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I accept the <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
                        <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {registrationProgress > 0 && (
                <Progress value={registrationProgress} className="h-2" />
              )}

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
                <div className="mt-2 text-center text-sm">
                  Already have an account?{" "}
                  <Button variant="link" size="sm" type="button" onClick={() => setTab("login")}>
                    Log in
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your email address" 
                        {...field} 
                        type="email"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
                <div className="mt-2 text-center text-sm">
                  <Button variant="link" size="sm" type="button" onClick={() => setTab("login")}>
                    Back to login
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}