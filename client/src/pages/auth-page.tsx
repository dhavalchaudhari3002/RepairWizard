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
import { Wrench, Store, User, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FormData = {
  username: string;
  password: string;
  email: string;
  role: "customer" | "repairer" | "shop_owner";
};

const roleDescriptions = {
  customer: {
    title: "Customer",
    description: "Get expert repair help and find trusted repair shops",
    features: [
      "Get AI-powered repair guidance",
      "Find and connect with local repair shops",
      "Track repair requests and history",
      "Get cost estimates before repairs"
    ]
  },
  repairer: {
    title: "Repairer",
    description: "Join repair shops and showcase your expertise",
    features: [
      "Connect with repair shops hiring experts",
      "Showcase your repair specialties",
      "Manage repair requests",
      "Build your reputation with reviews"
    ]
  },
  shop_owner: {
    title: "Repair Shop Owner",
    description: "List your services and grow your business",
    features: [
      "List your repair shop services",
      "Manage team of repairers",
      "Track business analytics",
      "Get more customers through the platform"
    ]
  }
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
                          <FormLabel className="flex items-center gap-2">
                            Account Type
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Choose your role in the repair ecosystem</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
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
                              {Object.entries(roleDescriptions).map(([role, info]) => (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    {role === "customer" && <User className="h-4 w-4" />}
                                    {role === "shop_owner" && <Store className="h-4 w-4" />}
                                    {role === "repairer" && <Wrench className="h-4 w-4" />}
                                    <span>{info.title}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {roleDescriptions[field.value].description}
                          </div>
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

        {/* Right column: Role information */}
        <div className="hidden lg:block">
          <div className="flex h-full flex-col justify-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Your One-Stop Repair Solution
              </h1>
              <p className="text-muted-foreground">
                Join our platform and become part of the repair ecosystem. Choose your role and get started today!
              </p>
            </div>

            <div className="grid gap-6">
              {Object.entries(roleDescriptions).map(([role, info]) => (
                <div key={role} className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      {role === "customer" && <User className="h-6 w-6 text-primary" />}
                      {role === "shop_owner" && <Store className="h-6 w-6 text-primary" />}
                      {role === "repairer" && <Wrench className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{info.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <ul className="ml-12 space-y-1">
                    {info.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}