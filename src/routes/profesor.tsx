import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, ArrowRight } from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/profesor")({
  head: () => ({
    meta: [
      { title: "Panel del profesor — LIBerico" },
      { name: "description", content: "Panel de gestión para profesores de LIBerico." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ProfesorPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const rootStyle = { ...fontSans, backgroundColor: L.bg, color: L.ink } as const;

const scopedCss = `
  #profesor-root .teacher-card{transition:transform 0.16s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,box-shadow 0.18s ease,background-color 0.18s ease;}
  #profesor-root .teacher-card:active{transform:scale(0.985);}
  #profesor-root a:focus-visible,#profesor-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  @media (hover:hover) and (pointer:fine){
    #profesor-root .teacher-card:hover{transform:translateY(-2px);border-color:${L.primary};box-shadow:0 22px 42px -28px rgba(15,23,42,0.42),0 4px 10px -6px rgba(15,23,42,0.12);}
  }
  @media (prefers-reduced-motion: reduce){
    #profesor-root .teacher-card{transition:none !important;}
  }
`;

function ProfesorPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [codigoClase, setCodigoClase] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  useEffect(() => {
    if (!user || rol !== "profesor") return;
    supabase
      .from("perfiles")
      .select("codigo_clase")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCodigoClase(data?.codigo_clase ?? null));
  }, [user, rol]);

  if (authLoading || !user || rol !== "profesor") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={rootStyle}>
        Cargando…
      </div>
    );
  }

  return (
    <div id="profesor-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-10">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            Panel del profesor
          </div>
          <h1 className="text-3xl font-semibold" style={headingStyle}>
            Bienvenido
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: L.muted }}>
            Desde aquí puedes consultar a Claude sobre criterios, textos y estrategias pedagógicas,
            y gestionar el progreso de tus alumnos.
          </p>
          {codigoClase && (
            <div
              className="mt-4 inline-flex items-center gap-3 rounded-2xl border px-4 py-2.5"
              style={{ backgroundColor: L.bg2, borderColor: L.line }}
            >
              <span className="text-xs" style={{ color: L.muted }}>
                Código de clase:
              </span>
              <span className="font-mono font-bold tracking-widest" style={{ color: L.ink }}>
                {codigoClase}
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Chat */}
          <Link to="/profesor-chat" className="group">
            <Card
              className="teacher-card flex h-full flex-col gap-4 rounded-2xl border p-6"
              style={cardStyle}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: L.primary + "10", color: L.primary }}
              >
                <MessageSquare aria-hidden="true" className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: L.ink }}>
                  Chat con Claude
                </div>
                <p className="mt-1 text-sm" style={{ color: L.muted }}>
                  Pregunta sobre criterios de evaluación, análisis de textos, diseño de actividades
                  o cualquier aspecto del programa IB.
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: L.primary }}
              >
                Abrir chat <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </div>
            </Card>
          </Link>

          {/* Alumnos */}
          <Link to="/profesor-alumnos" className="group">
            <Card
              className="teacher-card flex h-full flex-col gap-4 rounded-2xl border p-6"
              style={cardStyle}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: L.primary + "10", color: L.primary }}
              >
                <Users aria-hidden="true" className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: L.ink }}>
                  Mis alumnos
                </div>
                <p className="mt-1 text-sm" style={{ color: L.muted }}>
                  Consulta el progreso de cada alumno por criterio, revisa su historial de
                  evaluaciones y comparte tu código de clase para vincularlos.
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: L.primary }}
              >
                Ver alumnos <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
