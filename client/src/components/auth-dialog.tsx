import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    console.log("Auth dialog mounted, isOpen:", isOpen);
  }, [isOpen]);

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
    console.log("Form submission started");
    try {
      if (view === "login") {
        console.log("Attempting login...");
        await loginMutation.mutateAsync({
          username: data.username,
          password: data.password,
        });
        console.log("Login successful");
      } else {
        console.log("Attempting registration...");
        await registerMutation.mutateAsync({
          username: data.username,
          password: data.password,
          email: data.email!,
          role: "customer",
        });
        console.log("Registration successful");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Authentication failed. Please try again.",
      });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    console.log("Dialog open state changing to:", open);
    try {
      onOpenChange(open);
    } catch (error) {
      console.error("Error updating dialog state:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
          <form 
            onSubmit={(e) => {
              console.log("Form submit event:", e);
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-4"
          >
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
                disabled={view === "login" ? loginMutation.isPending : registerMutation.isPending}
                className="w-full"
                onClick={() => console.log("Submit button clicked")}
              >
                {view === "login"
                  ? loginMutation.isPending ? "Logging in..." : "Login"
                  : registerMutation.isPending ? "Registering..." : "Register"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  console.log("Switching view to:", view === "login" ? "register" : "login");
                  setView(view === "login" ? "register" : "login");
                }}
                className="w-full"
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