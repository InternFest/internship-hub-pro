import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, Eye, EyeOff, ArrowLeft, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Helper to detect network errors
const isNetworkError = (msg: string) =>
  msg.includes("Failed to fetch") ||
  msg.includes("NetworkError") ||
  msg.includes("ERR_CONNECTION_TIMED_OUT") ||
  msg.includes("network");

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "login";
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // FIX: Track if auth check timed out so we don't show infinite spinner
  const [authTimedOut, setAuthTimedOut] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // FIX: If authLoading takes more than 8 seconds, stop showing spinner
  useEffect(() => {
    if (!authLoading) return;
    const timeout = setTimeout(() => {
      setAuthTimedOut(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);

      // FIX: Actually handle the returned error instead of ignoring it
      if (error) {
        const msg = error.message || "";
        if (isNetworkError(msg)) {
          toast({
            title: "Network Error",
            description: "Unable to reach the server. Please switch to mobile data or use a VPN (e.g. Cloudflare WARP) and try again.",
            variant: "destructive",
          });
        } else if (msg.includes("Invalid login credentials")) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: msg || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = err?.message || "";
      toast({
        title: isNetworkError(msg) ? "Network Error" : "Login Failed",
        description: isNetworkError(msg)
          ? "Unable to reach the server. Please switch to mobile data or use a VPN (e.g. Cloudflare WARP) and try again."
          : msg || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      registerSchema.parse({ fullName, email, phone, dateOfBirth, password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, {
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth,
      });

      // FIX: Handle returned error
      if (error) {
        const msg = error.message || "";
        toast({
          title: isNetworkError(msg) ? "Network Error" : "Registration Failed",
          description: isNetworkError(msg)
            ? "Unable to reach the server. Please switch to mobile data or use a VPN and try again."
            : msg || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "You can now sign in with your credentials.",
        });
        navigate("/auth?mode=login");
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const msg = err?.message || "";
      toast({
        title: isNetworkError(msg) ? "Network Error" : "Registration Failed",
        description: isNetworkError(msg)
          ? "Unable to reach the server. Please switch to mobile data or use a VPN and try again."
          : msg || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!forgotEmail || !z.string().email().safeParse(forgotEmail).success) {
      setErrors({ forgotEmail: "Please enter a valid email address" });
      return;
    }
    if (!forgotPassword || forgotPassword.length < 6) {
      setErrors({ forgotPassword: "Password must be at least 6 characters" });
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      setErrors({ forgotConfirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email: forgotEmail, newPassword: forgotPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setForgotSent(true);
      toast({
        title: "Password Updated!",
        description: "Your password has been reset successfully. You can now login.",
      });
    } catch (err: any) {
      console.error("Reset error:", err);
      const msg = err?.message || "";
      toast({
        title: "Reset Failed",
        description: isNetworkError(msg)
          ? "Unable to reach the server. Please switch to mobile data or use a VPN and try again."
          : msg || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // FIX: Show login page after timeout instead of infinite spinner
  if (authLoading && !authTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative flex min-h-screen flex-col items-center justify-center py-8">
        <Link
          to="/"
          className="absolute left-4 top-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:left-8 md:top-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* FIX: Show network warning banner when auth timed out */}
        {authTimedOut && (
          <div className="mb-4 w-full max-w-md rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              Network issue detected. If login fails, please switch to <strong>mobile data</strong> or use{" "}
              <strong>Cloudflare WARP</strong> (free VPN).
            </span>
          </div>
        )}

        <Card className="w-full max-w-md border-0 shadow-elevated animate-scale-in">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                {mode === "forgot" ? "Reset Password" : mode === "login" ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription>
                {mode === "forgot"
                  ? "Enter your email and set a new password"
                  : mode === "login"
                  ? "Sign in to access your internship portal"
                  : "Register to start your internship journey"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {mode === "forgot" ? (
              forgotSent ? (
                <div className="space-y-4 text-center fade-in">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 bounce-in">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Password for <strong>{forgotEmail}</strong> has been updated successfully!
                  </p>
                  <Link to="/auth?mode=login" className="inline-block">
                    <Button className="w-full">Go to Login</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={isLoading}
                      className={errors.forgotEmail ? "border-destructive" : ""}
                    />
                    {errors.forgotEmail && (
                      <p className="text-xs text-destructive">{errors.forgotEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="forgot-password"
                        type={showForgotPassword ? "text" : "password"}
                        placeholder="********"
                        value={forgotPassword}
                        onChange={(e) => setForgotPassword(e.target.value)}
                        disabled={isLoading}
                        className={errors.forgotPassword ? "border-destructive" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showForgotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.forgotPassword && (
                      <p className="text-xs text-destructive">{errors.forgotPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-confirm-password">Re-Enter New Password</Label>
                    <Input
                      id="forgot-confirm-password"
                      type="password"
                      placeholder="********"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className={errors.forgotConfirmPassword ? "border-destructive" : ""}
                    />
                    {errors.forgotConfirmPassword && (
                      <p className="text-xs text-destructive">{errors.forgotConfirmPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <Link to="/auth?mode=login" className="font-medium text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              )
            ) : mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="text-right">
                  <Link to="/auth?mode=forgot" className="text-sm text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/auth?mode=register" className="font-medium text-primary hover:underline">
                    Register
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isLoading} className={errors.fullName ? "border-destructive" : ""} />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className={errors.email ? "border-destructive" : ""} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="1234567890" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} disabled={isLoading} className={errors.phone ? "border-destructive" : ""} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={isLoading} className={errors.dateOfBirth ? "border-destructive" : ""} />
                  {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className={errors.password ? "border-destructive" : ""} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="********" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className={errors.confirmPassword ? "border-destructive" : ""} />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/auth?mode=login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
