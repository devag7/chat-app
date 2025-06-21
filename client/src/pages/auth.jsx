import { useState } from "react";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient.js";
import { useToast } from "../hooks/use-toast.js";
import { MessageCircle, UserPlus } from "lucide-react";
import { queryClient } from "../lib/queryClient.js";
import { XLogo } from "../components/ui/x-logo.jsx";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
        <CardContent className="p-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
              <XLogo className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {isLogin ? "Sign in to X" : "Join X today"}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isLogin ? "Welcome back to the conversation" : "See what's happening in the world right now"}
            </p>
          </div>

          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-base font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...loginForm.register("email")}
                  className="mt-3 h-14 text-base rounded-xl border-border bg-muted focus:ring-2 focus:ring-primary"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-2">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password" className="text-base font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...loginForm.register("password")}
                  className="mt-3 h-14 text-base rounded-xl border-border bg-muted focus:ring-2 focus:ring-primary"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-2">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  {...registerForm.register("fullName")}
                  className="mt-2"
                />
                {registerForm.formState.errors.fullName && (
                  <p className="text-sm text-red-500 mt-1">
                    {registerForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose a username"
                  {...registerForm.register("username")}
                  className="mt-2"
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-red-500 mt-1">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...registerForm.register("email")}
                  className="mt-2"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  {...registerForm.register("password")}
                  className="mt-2"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...registerForm.register("confirmPassword")}
                  className="mt-2"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full chat-gradient hover:opacity-90"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-base">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-bold"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
