import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: "admin" | "photographer" | null;
  teamId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  teamId: null,
  fullName: null,
  avatarUrl: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "photographer" | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("role, team_id, full_name, avatar_url")
        .eq("id", user.id)
        .single();
        
      if (profile) {
        setRole((profile as any).role);
        setTeamId((profile as any).team_id);
        setFullName((profile as any).full_name || null);
        setAvatarUrl((profile as any).avatar_url || null);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if (mounted) setUser(session.user);
          
          const { data: profile } = await supabase
            .from("profiles" as any)
            .select("role, team_id, full_name, avatar_url")
            .eq("id", session.user.id)
            .single();
            
          if (profile && mounted) {
            setRole((profile as any).role);
            setTeamId((profile as any).team_id);
            setFullName((profile as any).full_name || null);
            setAvatarUrl((profile as any).avatar_url || null);
          }
        }
      } catch (err) {
        console.error("Auth context error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("role, team_id, full_name, avatar_url")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          setRole((profile as any).role);
          setTeamId((profile as any).team_id);
          setFullName((profile as any).full_name || null);
          setAvatarUrl((profile as any).avatar_url || null);
        }
      } else {
        setUser(null);
        setRole(null);
        setTeamId(null);
        setFullName(null);
        setAvatarUrl(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, teamId, fullName, avatarUrl, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
