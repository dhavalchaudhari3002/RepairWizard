import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  username: string;
  password: string;
  email?: string;
};

export function AuthDialog({ mode = "login", trigger }: { mode: "login", trigger: React.ReactNode }) {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "register">("login");

  const form = useForm<FormData>({
    resolver: zodResolver(
      view === "forgot" 
        ? insertUserSchema.pick({ email: true })
        : insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (view === "login") {
        await loginMutation.mutateAsync(data);
      } else if (view === "forgot") {
        toast({
          title: "Password Reset",
          description: "If an account exists with that email, you will receive password reset instructions.",
        });
      } else if (view === "register") {
        toast({
          title: "Registration",
          description: "Please contact support to create a new account.",
        });
      }
      setIsOpen(false);
      form.reset();
    } catch (error) {
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
      <DialogContent>
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              disabled={loginMutation.isPending}
            >
              {view === "login" 
                ? loginMutation.isPending ? "Logging in..." : "Login"
                : view === "forgot"
                ? "Reset Password"
                : "Register"}
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