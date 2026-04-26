import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Rol = "alumno" | "profesor";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rol: Rol | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  rol: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<Rol | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch rol whenever the session (and thus the authenticated user) changes
  useEffect(() => {
    if (!session?.user) {
      setRol(null);
      return;
    }
    supabase
      .from("perfiles")
      .select("rol")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRol((data?.rol as Rol) ?? "alumno");
      });
  }, [session]);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        rol,
        signOut: async () => {
          setRol(null);
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
