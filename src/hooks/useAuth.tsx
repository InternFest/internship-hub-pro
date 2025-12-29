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

      if (error) throw error;
      return data?.role as AppRole | null;
    } catch (error) {
      console.error("Error fetching user role:", error);
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

      if (error) throw error;
      return data?.status as StudentStatus | null;
    } catch (error) {
      console.error("Error fetching student status:", error);
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
            
            if (userRole === "student") {
              const status = await fetchStudentStatus(session.user.id);
              setStudentStatus(status);
            }
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setStudentStatus(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const userRole = await fetchUserRole(session.user.id);
          setRole(userRole);
          
          if (userRole === "student") {
            const status = await fetchStudentStatus(session.user.id);
            setStudentStatus(status);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) {
        let message = error.message;
        if (error.message.includes("already registered")) {
          message = "This email is already registered. Please login instead.";
        }
        toast({
          title: "Registration Failed",
          description: message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. You can now login.",
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setStudentStatus(null);
    toast({
      title: "Signed out",
      description: "You have been logged out successfully.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        studentStatus,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUserData,
      }}
    >
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
