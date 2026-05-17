import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { type CourseKey, parseCourseKey } from "@/lib/ib-courses";

type Rol = "alumno" | "profesor" | "admin";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rol: Rol | null;
  courseKey: CourseKey;
  creditos: number;
  refreshRol: () => Promise<void>;
  setCourseKey: (key: CourseKey) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  rol: null,
  courseKey: "spanish-a-literature",
  creditos: 0,
  refreshRol: async () => {},
  setCourseKey: async () => {},
  signOut: async () => {},
});

function isRol(value: unknown): value is Rol {
  return value === "alumno" || value === "profesor" || value === "admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [rol, setRol] = useState<Rol | null>(null);
  const [courseKey, setCourseKeyState] = useState<CourseKey>("spanish-a-literature");
  const [creditos, setCreditos] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (cancelled) return;
      setSession(s);
      setProfileLoading(Boolean(s?.user));
      setAuthLoading(false);
    });
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSession(null);
          setProfileLoading(false);
          await supabase.auth.signOut({ scope: "local" });
          return;
        }
        setSession(data.session);
        setProfileLoading(Boolean(data.session?.user));
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setProfileLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("perfiles")
      .select("rol, activo, course_key, creditos")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.activo === false) {
      setRol(null);
      await supabase.auth.signOut();
      return;
    }

    setRol(isRol(data?.rol) ? data.rol : "alumno");
    setCourseKeyState(parseCourseKey(data?.course_key));
    setCreditos(typeof data?.creditos === "number" ? data.creditos : 0);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRol(null);
      setCourseKeyState("spanish-a-literature");
      setCreditos(0);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    void fetchPerfil(session.user.id).finally(() => setProfileLoading(false));
  }, [session, fetchPerfil]);

  // Suscripción realtime para actualizar saldo de créditos sin polling
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`perfiles_creditos_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "perfiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nuevos = (payload.new as Record<string, unknown>)?.creditos;
          if (typeof nuevos === "number") {
            setCreditos(nuevos);
          } else {
            // Fallback: re-fetch completo si el payload no incluye creditos
            void fetchPerfil(userId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const handleSetCourseKey = useCallback(
    async (key: CourseKey) => {
      if (!session?.user) return;
      setCourseKeyState(key);
      await supabase.from("perfiles").update({ course_key: key }).eq("user_id", session.user.id);
    },
    [session],
  );

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading: authLoading || profileLoading,
        rol,
        courseKey,
        creditos,
        refreshRol: () => (session?.user ? fetchPerfil(session.user.id) : Promise.resolve()),
        setCourseKey: handleSetCourseKey,
        signOut: async () => {
          setRol(null);
          setCourseKeyState("spanish-a-literature");
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
