import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Rol = "alumno" | "profesor" | "admin";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rol: Rol | null;
  refreshRol: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  rol: null,
  refreshRol: async () => {},
  signOut: async () => {},
});

function isRol(value: unknown): value is Rol {
  return value === "alumno" || value === "profesor" || value === "admin";
}

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

  const fetchRol = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("perfiles")
      .select("rol, activo")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.activo === false) {
      setRol(null);
      await supabase.auth.signOut();
      return;
    }

    setRol(isRol(data?.rol) ? data.rol : "alumno");
  }, []);

  // Fetch rol whenever the session (and thus the authenticated user) changes
  useEffect(() => {
    if (!session?.user) {
      setRol(null);
      return;
    }
    void fetchRol(session.user.id);
  }, [session, fetchRol]);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        rol,
        refreshRol: () => (session?.user ? fetchRol(session.user.id) : Promise.resolve()),
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
