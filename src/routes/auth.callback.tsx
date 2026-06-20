import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUiLang } from "@/hooks/useUiLang";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthCallback,
});

function getInternalPath(path: string | null) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "";
}

function AuthCallback() {
  const navigate = useNavigate();
  const isEN = useUiLang() === "en";
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const finish = (session: unknown) => {
      const params = new URLSearchParams(window.location.search);
      const next = getInternalPath(params.get("next"));
      if (session && next) {
        navigate({ to: next });
      } else if (session) {
        navigate({ to: "/asignaturas" });
      } else {
        setError(true);
      }
    };

    (async () => {
      try {
        // Con detectSessionInUrl el SDK ya pudo intercambiar el code.
        const { data } = await supabase.auth.getSession();
        if (data.session) return finish(data.session);

        // Fallback explícito para el code-exchange PKCE.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { data: ex, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
          return finish(ex.session);
        }
        setError(true);
      } catch {
        setError(true);
      }
    })();
  }, [navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      {error ? (
        <div className="text-center">
          <p className="text-lg font-semibold">
            {isEN ? "We couldn't complete sign-in." : "No pudimos completar el inicio de sesión."}
          </p>
          <a href="/login" className="mt-3 inline-block underline" style={{ color: L.primary }}>
            {isEN ? "Back to sign in" : "Volver a iniciar sesión"}
          </a>
        </div>
      ) : (
        <p className="text-sm" style={{ color: L.muted }}>
          {isEN ? "Signing you in…" : "Iniciando sesión…"}
        </p>
      )}
    </div>
  );
}
