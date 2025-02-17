import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wrench, Store, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = {
  username: string;
  password: string;
  email: string;
  role: "customer" | "repairer" | "shop_owner";
};

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const form = useForm<FormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      role: "customer",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = form.handleSubmit(async (data) => {
    await registerMutation.mutateAsync(data);
  });

  const onLogin = form.handleSubmit(async (data) => {
    await loginMutation.mutateAsync({
      username: data.username,
      password: data.password,
    });
  });

  return (
    <div className="container flex min-h-screen items-center justify-center">
      <div className="grid w-full gap-6 lg:grid-cols-2 lg:gap-12">
        {/* Left column: Forms */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Login to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="register">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="register">
                <Form {...form}>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="customer">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>Customer</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="shop_owner">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4" />
                                  <span>Repair Shop Owner</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="repairer">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  <span>Repairer</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="login">
                <Form {...form}>
                  <form onSubmit={onLogin} className="space-y-4">
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right column: Hero section */}
        <div className="hidden lg:block">
          <div className="flex h-full flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Your One-Stop Repair Solution
              </h1>
              <p className="text-muted-foreground">
                Join our platform to get expert repair assistance, connect with repair shops,
                or offer your repair services to others.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">For Customers</h3>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered repair guidance and find trusted repair shops
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">For Repair Shops</h3>
                  <p className="text-sm text-muted-foreground">
                    List your services and connect with customers in your area
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">For Repairers</h3>
                  <p className="text-sm text-muted-foreground">
                    Join repair shops and showcase your expertise
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
