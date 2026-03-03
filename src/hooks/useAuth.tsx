import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = "student" | "faculty" | "admin";
type StudentStatus = "pending" | "approved" | "rejected";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  studentStatus: StudentStatus | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

interface SignUpMetadata {
  full_name: string;
  phone: string;
  date_of_birth: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [studentStatus, setStudentStatus] = useState<StudentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[Auth] Role fetch error:", error.message, error.code);
        throw error;
      }
      return data?.role as AppRole | null;
    } catch (error: any) {
      console.error("[Auth] fetchUserRole failed:", error?.message || error);
      return null;
    }
  };

  const fetchStudentStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[Auth] Student status fetch error:", error.message, error.code);
        throw error;
      }
      return data?.status as StudentStatus | null;
    } catch (error: any) {
      console.error("[Auth] fetchStudentStatus failed:", error?.message || error);
      return null;
    }
  };

  const refreshUserData = async () => {
    if (!user) return;
    const userRole = await fetchUserRole(user.id);
    setRole(userRole);
    if (userRole === "student") {
      const status = await fetchStudentStatus(user.id);
      setStudentStatus(status);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (userId: string) => {
      const userRole = await fetchUserRole(userId);
      if (!isMounted) return;
      setRole(userRole);
      if (userRole === "student") {
        const status = await fetchStudentStatus(userId);
        if (!isMounted) return;
        setStudentStatus(status);
      }
      setLoading(false);
    };

    // Restore session first
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (!isMounted) return;

      if (error) {
        console.error("[Auth] getSession error:", error.message);
        // Clear any stale session data on error
        setSession(null);
        setUser(null);
        setRole(null);
        setStudentStatus(null);
        setLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        loadUserData(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[Auth] State change:", event);

        if (event === "TOKEN_REFRESHED") {
          console.log("[Auth] Token refreshed successfully");
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setStudentStatus(null);
          setLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          setTimeout(() => {
            loadUserData(newSession.user.id);
          }, 0);
        } else if (!newSession?.user) {
          setRole(null);
          setStudentStatus(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("[Auth] Attempting sign in for:", email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("[Auth] Sign in error:", error.message, error.status);
        
        let description = error.message;
        if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
          description = "Network error: Please check your internet connection and try again. If the issue persists, try clearing your browser cache or using a different browser.";
          console.error("[Auth] Network-level fetch failure. Possible causes: CORS, network, stale cookies.");
          // Attempt to clear any stale session
          try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        }

        toast({ title: "Login Failed", description, variant: "destructive" });
        return { error };
      }

      console.log("[Auth] Sign in successful");
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      return { error: null };
    } catch (error: any) {
      console.error("[Auth] Sign in exception:", error?.message || error);
      
      let description = "An unexpected error occurred. Please try again.";
      if (error?.message === "Failed to fetch" || error?.message?.includes("fetch")) {
        description = "Unable to reach the server. Please check your connection, clear browser cache, or try in an incognito window.";
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
      }

      toast({ title: "Login Failed", description, variant: "destructive" });
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: redirectUrl, data: metadata },
      });

      if (error) {
        let message = error.message;
        if (error.message.includes("already registered")) {
          message = "This email is already registered. Please login instead.";
        }
        toast({ title: "Registration Failed", description: message, variant: "destructive" });
        return { error };
      }

      toast({ title: "Registration Successful!", description: "Your account has been created. You can now login." });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
      // Force local cleanup even if server call fails
    }
    setUser(null);
    setSession(null);
    setRole(null);
    setStudentStatus(null);
    toast({ title: "Signed out", description: "You have been logged out successfully." });
  };

  return (
    <AuthContext.Provider value={{ user, session, role, studentStatus, loading, signIn, signUp, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
