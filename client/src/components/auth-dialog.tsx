import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type AuthDialogProps = {
  mode: "login" | "register";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthDialog({ mode = "login", isOpen, onOpenChange }: AuthDialogProps) {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"login" | "register">(mode);

  const form = useForm<FormData>({
    resolver: zodResolver(
      view === "register"
        ? insertUserSchema.pick({ username: true, password: true, email: true })
        : insertUserSchema.pick({ username: true, password: true })
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      console.log("Form submitted:", { ...data, password: "[REDACTED]" }); // Debug log

      if (view === "login") {
        await loginMutation.mutateAsync({
          username: data.username,
          password: data.password,
        });
        onOpenChange(false);
      } else {
        await registerMutation.mutateAsync({
          username: data.username,
          password: data.password,
          email: data.email!,
          role: "customer",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication failed. Please try again.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {view === "login" ? "Login to your account" : "Register for a new account"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
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
                      <Input type="email" placeholder="Enter email" {...field} />
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
                    <Input type="password" placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full !cursor-pointer"
                disabled={view === "login" ? loginMutation.isPending : registerMutation.isPending}
              >
                {view === "login"
                  ? loginMutation.isPending ? "Logging in..." : "Login"
                  : registerMutation.isPending ? "Registering..." : "Register"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="!cursor-pointer"
                onClick={() => setView(view === "login" ? "register" : "login")}
              >
                {view === "login" ? "Need an account? Register" : "Already have an account? Login"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}