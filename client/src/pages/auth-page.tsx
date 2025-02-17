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
import { Wrench, Store, User, Info, Plus, X } from "lucide-react";
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
import { useState } from "react";
import * as z from "zod";

type FormData = {
  username: string;
  password: string;
  email: string;
  role: "customer" | "repairer";
  // Additional fields for repairers
  specialties?: string[];
  experience?: string;
  shopName?: string;
  shopAddress?: string;
  phoneNumber?: string;
};

const roleDescriptions = {
  customer: {
    title: "Customer",
    description: "Get expert repair assistance for your devices",
    features: [
      "Submit repair requests with AI-powered diagnostics",
      "Get instant cost estimates",
      "Connect with skilled repairers",
      "Track repair status in real-time",
      "Access repair guides and documentation"
    ]
  },
  repairer: {
    title: "Repairer",
    description: "Offer your repair expertise and grow your business",
    features: [
      "Showcase your repair specialties and expertise",
      "Receive repair requests from customers",
      "Provide expert diagnostics and estimates",
      "Build your reputation with customer reviews",
      "Access AI-powered repair guides and documentation"
    ]
  }
};

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(
      insertUserSchema.extend({
        specialties: z.array(z.string()).optional(),
        experience: z.string().optional(),
        shopName: z.string().optional(),
        shopAddress: z.string().optional(),
        phoneNumber: z.string().optional(),
      })
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      role: "customer",
      specialties: [],
      experience: "",
      shopName: "",
      shopAddress: "",
      phoneNumber: "",
    },
  });

  const role = form.watch("role");

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const addSpecialty = () => {
    if (newSpecialty && !specialties.includes(newSpecialty)) {
      setSpecialties([...specialties, newSpecialty]);
      form.setValue("specialties", [...specialties, newSpecialty]);
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    const updated = specialties.filter(s => s !== specialty);
    setSpecialties(updated);
    form.setValue("specialties", updated);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (data.role === "repairer" && (!data.specialties?.length || !data.shopName || !data.shopAddress || !data.phoneNumber)) {
      return;
    }
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
                                <SelectItem value="customer">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Customer</span>
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
                      {role === "repairer" && (
                        <>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="shopName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Shop Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Your Repair Shop" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="shopAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Shop Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123 Repair Street" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+1 (555) 123-4567" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="specialties"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Specialties</FormLabel>
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Add a specialty"
                                        value={newSpecialty}
                                        onChange={(e) => setNewSpecialty(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                                      />
                                      <Button type="button" onClick={addSpecialty} className="shrink-0">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {specialties.map((specialty) => (
                                        <div
                                          key={specialty}
                                          className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-2"
                                        >
                                          <span>{specialty}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeSpecialty(specialty)}
                                            className="hover:text-destructive"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <FormMessage />
                                  </div>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="experience"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Experience</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Years of experience or certifications" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}
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