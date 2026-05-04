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
  refreshRol: async () => {},
  setCourseKey: async () => {},
  signOut: async () => {},
});

function isRol(value: unknown): value is Rol {
  return value === "alumno" || value === "profesor" || value === "admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<Rol | null>(null);
  const [courseKey, setCourseKeyState] = useState<CourseKey>("spanish-a-literature");

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (cancelled) return;
      setSession(s);
      setLoading(false);
    });
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSession(null);
          await supabase.auth.signOut({ scope: "local" });
          return;
        }
        setSession(data.session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("perfiles")
      .select("rol, activo, course_key")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.activo === false) {
      setRol(null);
      await supabase.auth.signOut();
      return;
    }

    setRol(isRol(data?.rol) ? data.rol : "alumno");
    setCourseKeyState(parseCourseKey(data?.course_key));
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRol(null);
      setCourseKeyState("spanish-a-literature");
      return;
    }
    void fetchPerfil(session.user.id);
  }, [session, fetchPerfil]);

  const handleSetCourseKey = useCallback(
    async (key: CourseKey) => {
      if (!session?.user) return;
      setCourseKeyState(key);
      await supabase
        .from("perfiles")
        .update({ course_key: key })
        .eq("user_id", session.user.id);
    },
    [session],
  );

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        rol,
        courseKey,
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
