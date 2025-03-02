import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, LoginData, loginSchema } from "@shared/schema"; // Added import for loginSchema
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type AuthDialogProps = {
  mode: "login" | "register";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[a-z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;
  return strength;
};

export function AuthDialog({ mode = "login", isOpen, onOpenChange }: AuthDialogProps) {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"login" | "register">(mode);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [currentSpecialty, setCurrentSpecialty] = useState("");

  useEffect(() => {
    if (isOpen) {
      setView(mode);
    }
  }, [isOpen, mode]);

  const form = useForm({
    resolver: zodResolver(
      view === "register" ? insertUserSchema : loginSchema
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      role: "customer" as const,
      tosAccepted: false,
    },
  });

  const role = form.watch("role");

  const handleAddSpecialty = () => {
    if (currentSpecialty.trim()) {
      setSpecialties([...specialties, currentSpecialty.trim()]);
      setCurrentSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const onSubmit = async (data: LoginData | Record<string, unknown>) => {
    try {
      if (view === "login") {
        await loginMutation.mutateAsync({
          username: data.username as string,
          password: data.password as string,
        });
      } else {
        await registerMutation.mutateAsync({
          username: data.username as string,
          password: data.password as string,
          email: data.email as string,
          role: data.role as "customer" | "repairer",
          tosAccepted: data.tosAccepted as boolean,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strength = calculatePasswordStrength(e.target.value);
    setPasswordStrength(strength);
    form.setValue("password", e.target.value);
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
              <>
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

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="repairer">Repairer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        {...field}
                        onChange={handlePasswordChange}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {view === "register" && (
                    <div className="mt-2">
                      <Progress value={passwordStrength} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {passwordStrength === 100
                          ? "Strong password"
                          : passwordStrength >= 60
                          ? "Moderate password"
                          : "Weak password"}
                      </p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {view === "register" && (
              <FormField
                control={form.control}
                name="tosAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the{" "}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}

            <div className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={view === "login" ? loginMutation.isPending : registerMutation.isPending}
                className="w-full"
              >
                {view === "login"
                  ? loginMutation.isPending ? "Logging in..." : "Login"
                  : registerMutation.isPending ? "Registering..." : "Register"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setView(view === "login" ? "register" : "login");
                  form.reset();
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