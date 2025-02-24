import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wrench, Store, User, Info, Plus, X, Upload } from "lucide-react";
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
import { useState, useRef } from "react";
import * as z from "zod";

type FormData = {
  username: string;
  password: string;
  email: string;
  role: "customer" | "repairer";
  // Additional fields for repairers
  specialties?: string[];
  experience?: string;
  certificate?: File;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(
      insertUserSchema.extend({
        specialties: z.array(z.string()).optional(),
        experience: z.string().optional(),
        certificate: z.instanceof(File).optional(),
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSpecialty();
    }
  };

  const addSpecialty = () => {
    if (newSpecialty && !specialties.includes(newSpecialty)) {
      const updatedSpecialties = [...specialties, newSpecialty];
      setSpecialties(updatedSpecialties);
      form.setValue("specialties", updatedSpecialties);
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    const updated = specialties.filter(s => s !== specialty);
    setSpecialties(updated);
    form.setValue("specialties", updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      form.setValue("certificate", file);
    }
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
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

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
                                      onKeyPress={handleKeyPress}
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
                                <div className="space-y-2">
                                  <FormControl>
                                    <Input
                                      placeholder="Years of experience or certifications"
                                      {...field}
                                    />
                                  </FormControl>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="file"
                                      ref={fileInputRef}
                                      onChange={handleFileChange}
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="w-full"
                                    >
                                      <Upload className="h-4 w-4 mr-2" />
                                      {selectedFile ? selectedFile.name : "Upload Certificate (Optional)"}
                                    </Button>
                                    {selectedFile && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedFile(null);
                                          form.setValue("certificate", undefined);
                                          if (fileInputRef.current) {
                                            fileInputRef.current.value = "";
                                          }
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <FormMessage />
                                </div>
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}