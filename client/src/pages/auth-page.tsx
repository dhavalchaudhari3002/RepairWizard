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
    <div className="container min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2 lg:gap-12">
        {/* Left column: Forms */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold md:text-3xl">Welcome</h1>
            <p className="text-muted-foreground">
              Login to your account or create a new one
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="register">
                <TabsList className="grid w-full grid-cols-2 mb-6">
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
                          <FormItem className="space-y-3">
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
                                <SelectTrigger className="w-full">
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
                            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              <p className="font-medium text-foreground mb-2">
                                {roleDescriptions[field.value].title}
                              </p>
                              <p className="mb-2">{roleDescriptions[field.value].description}</p>
                              <ul className="space-y-1 pl-4">
                                {roleDescriptions[field.value].features.map((feature, index) => (
                                  <li key={index} className="list-disc">
                                    {feature}
                                  </li>
                                ))}
                              </ul>
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
        </div>

        {/* Right column: Role information - Only visible on lg screens */}
        <div className="hidden lg:block">
          <div className="h-full flex flex-col justify-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">
                Your One-Stop Repair Solution
              </h1>
              <p className="text-muted-foreground text-lg">
                Join our platform and become part of the repair ecosystem. Choose your role and get started today!
              </p>
            </div>

            <div className="grid gap-8">
              {Object.entries(roleDescriptions).map(([role, info]) => (
                <div key={role} className="bg-card p-6 rounded-lg border space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      {role === "customer" && <User className="h-6 w-6 text-primary" />}
                      {role === "shop_owner" && <Store className="h-6 w-6 text-primary" />}
                      {role === "repairer" && <Wrench className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{info.title}</h3>
                      <p className="text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <ul className="grid gap-2 pl-14">
                    {info.features.map((feature, index) => (
                      <li key={index} className="text-muted-foreground flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile role information - Only visible on small screens */}
        <div className="lg:hidden space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Available Roles</h2>
            <p className="text-muted-foreground">
              Choose the role that best fits your needs
            </p>
          </div>

          <div className="grid gap-4">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <Card key={role}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      {role === "customer" && <User className="h-5 w-5 text-primary" />}
                      {role === "shop_owner" && <Store className="h-5 w-5 text-primary" />}
                      {role === "repairer" && <Wrench className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{info.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {info.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 before:content-['•'] before:text-primary before:mr-2">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}