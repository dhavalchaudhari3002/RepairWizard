import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type FormData = {
  username: string;
  password: string;
  confirmPassword?: string;
  email?: string;
  acceptTerms?: boolean;
  role?: "customer" | "repairer";
};

const registerSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function AuthDialog({ mode = "login", trigger }: { mode: "login", trigger: React.ReactNode }) {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "register">("login");

  const form = useForm<FormData>({
    resolver: zodResolver(
      view === "forgot" 
        ? insertUserSchema.pick({ email: true })
        : view === "register"
        ? registerSchema
        : insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      acceptTerms: false,
      role: "customer",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (view === "login") {
        await loginMutation.mutateAsync({
          username: data.username,
          password: data.password,
        });
        setIsOpen(false);
      } else if (view === "forgot") {
        toast({
          title: "Password Reset",
          description: "If an account exists with that email, you will receive password reset instructions.",
        });
        setIsOpen(false);
      } else if (view === "register") {
        console.log("Registration data:", {
          username: data.username,
          password: data.password,
          email: data.email,
          role: data.role,
        });

        const result = await registerMutation.mutateAsync({
          username: data.username,
          password: data.password,
          email: data.email!,
          role: data.role ?? "customer",
        });

        console.log("Registration result:", result);

        // Reset form and close dialog only after successful registration
        form.reset();
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Error handling is done in the mutations
    }
  });

  const switchView = (newView: "login" | "forgot" | "register") => {
    setView(newView);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === "login" 
              ? "Welcome Back" 
              : view === "forgot"
              ? "Reset Password"
              : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {view === "login" 
              ? "Login to your account" 
              : view === "forgot"
              ? "Reset your password"
              : "Register for a new account"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {(view === "login" || view === "register") && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {view === "register" && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {view === "register" && (
                  <>
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Accept terms and conditions
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

            {view === "forgot" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={view === "login" ? loginMutation.isPending : view === "register" ? registerMutation.isPending : false}
            >
              {view === "login" 
                ? loginMutation.isPending ? "Logging in..." : "Login"
                : view === "forgot"
                ? "Reset Password"
                : registerMutation.isPending ? "Registering..." : "Register"}
            </Button>

            <div className="space-y-2 text-center text-sm">
              {view === "login" && (
                <>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </button>
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchView("register")}
                      className="font-medium text-primary hover:underline"
                    >
                      Register
                    </button>
                  </p>
                </>
              )}
              {(view === "forgot" || view === "register") && (
                <p>
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("login")}
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </button>
                </p>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}