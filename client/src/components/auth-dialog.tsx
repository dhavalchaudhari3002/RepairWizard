import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  username: string;
  password: string;
  email?: string;
};

export function AuthDialog({ mode = "login", trigger }: { mode: "login" | "register", trigger: React.ReactNode }) {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">(mode);

  const form = useForm<FormData>({
    resolver: zodResolver(
      activeTab === "login" 
        ? insertUserSchema.pick({ username: true, password: true })
        : activeTab === "register"
        ? insertUserSchema.pick({ username: true, password: true, email: true })
        : insertUserSchema.pick({ email: true })
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (activeTab === "login") {
        await loginMutation.mutateAsync(data);
      } else if (activeTab === "register") {
        await registerMutation.mutateAsync({ ...data, role: "customer" });
      } else if (activeTab === "forgot") {
        // Here we would implement password reset
        toast({
          title: "Password Reset",
          description: "If an account exists with that email, you will receive password reset instructions.",
        });
      }
      setIsOpen(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutations
    }
  });

  const switchTab = (tab: "login" | "register" | "forgot") => {
    setActiveTab(tab);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription>
            {activeTab === "login" 
              ? "Login to your account" 
              : activeTab === "register"
              ? "Create a new account"
              : "Reset your password"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => switchTab(value as "login" | "register" | "forgot")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
                <div className="space-y-2 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => switchTab("forgot")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </button>
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("register")}
                      className="font-medium text-primary hover:underline"
                    >
                      Register
                    </button>
                  </p>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account..." : "Create account"}
                </Button>
                <p className="text-center text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </button>
                </p>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="forgot" className="space-y-4">
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full"
                >
                  Reset Password
                </Button>
                <p className="text-center text-sm">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </button>
                </p>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}