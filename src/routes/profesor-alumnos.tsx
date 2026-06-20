import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Users, ChevronRight, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/profesor-alumnos")({
  head: () => ({
    meta: [
      { title: "Mis alumnos — LIBerico" },
      { name: "description", content: "Gestiona y consulta el progreso de tus alumnos." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ProfesorAlumnosPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const rootStyle = { ...fontSans, backgroundColor: L.bg, color: L.ink } as const;

const scopedCss = `
  #profesor-alumnos-root .teacher-row{transition:transform 0.16s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,box-shadow 0.18s ease,background-color 0.18s ease;}
  #profesor-alumnos-root .teacher-row:active{transform:scale(0.99);}
  #profesor-alumnos-root a:focus-visible,#profesor-alumnos-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  @media (hover:hover) and (pointer:fine){
    #profesor-alumnos-root .teacher-row:hover{transform:translateY(-1px);border-color:${L.primary};box-shadow:0 20px 38px -28px rgba(15,23,42,0.42),0 4px 10px -6px rgba(15,23,42,0.12);}
  }
  @media (prefers-reduced-motion: reduce){
    #profesor-alumnos-root .teacher-row{transition:none !important;}
  }
`;

type Alumno = {
  user_id: string;
  email: string;
  nota_ib_media: number | null;
  num_evaluaciones: number;
  ultima_evaluacion: string | null;
  banda_a_media: number | null;
  banda_b_media: number | null;
  banda_c_media: number | null;
  banda_d_media: number | null;
};

function BandaBadge({ label, valor }: { label: string; valor: number | null }) {
  if (valor === null) return null;
  const tone =
    valor >= 4
      ? { bg: "#ECFDF5", color: L.ok }
      : valor >= 3
        ? { bg: "#FEF3C7", color: L.amberDeep }
        : { bg: "#FFF1F2", color: "#BE123C" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-xl px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: tone.bg, color: tone.color }}
    >
      {label} {valor.toFixed(1)}
    </span>
  );
}

function ProfesorAlumnosPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cargando, setCargando] = useState(true);
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
    (async () => {
      // Código de clase del profesor
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("codigo_clase")
        .eq("user_id", user.id)
        .maybeSingle();
      setCodigoClase(perfil?.codigo_clase ?? null);

      // Lista de alumnos con stats
      const { data, error } = await supabase.rpc("get_mis_alumnos");
      if (error) toast.error("No se pudo cargar la lista de alumnos.");
      else setAlumnos((data ?? []) as Alumno[]);
      setCargando(false);
    })();
  }, [user, rol]);

  if (authLoading || !user || rol !== "profesor") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={rootStyle}>
        Cargando…
      </div>
    );
  }

  return (
    <div id="profesor-alumnos-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            Panel del profesor
          </div>
          <h1 className="text-3xl font-semibold" style={headingStyle}>
            Mis alumnos
          </h1>
          <p className="mt-2" style={{ color: L.muted }}>
            Comparte tu código de clase con tus alumnos para que puedan vincularse.
          </p>
        </div>

        {/* Código de clase */}
        <Card
          className="mb-8 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center"
          style={cardStyle}
        >
          <div className="flex-1">
            <div
              className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              Tu código de clase
            </div>
            <div className="font-mono text-2xl font-bold tracking-widest" style={{ color: L.ink }}>
              {codigoClase ?? "—"}
            </div>
            <p className="mt-1 text-xs" style={{ color: L.muted }}>
              El alumno lo introduce en su plan de estudio para vincularse a ti.
            </p>
          </div>
        </Card>

        {/* Lista de alumnos */}
        {cargando ? (
          <div className="flex justify-center py-16">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin"
              style={{ color: L.muted }}
            />
          </div>
        ) : alumnos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
            style={{ color: L.muted }}
          >
            <Users aria-hidden="true" className="h-10 w-10 opacity-40" />
            <p className="text-sm">Aún no tienes alumnos vinculados.</p>
            <p className="text-xs max-w-xs">
              Comparte el código de clase con tus alumnos para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mb-3 text-xs" style={{ color: L.muted }}>
              {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} vinculado
              {alumnos.length !== 1 ? "s" : ""}
            </div>
            {alumnos.map((alumno) => (
              <Link
                key={alumno.user_id}
                to="/profesor-alumno/$alumnoId"
                params={{ alumnoId: alumno.user_id }}
                className="block"
              >
                <Card className="teacher-row rounded-2xl border p-4" style={cardStyle}>
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="truncate text-sm font-semibold" style={{ color: L.ink }}>
                          {alumno.email}
                        </span>
                        {alumno.nota_ib_media !== null && (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: L.muted }}
                          >
                            <BarChart2 aria-hidden="true" className="h-3 w-3" />
                            Nota {alumno.nota_ib_media.toFixed(1)} media
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <BandaBadge label="A" valor={alumno.banda_a_media} />
                        <BandaBadge label="B" valor={alumno.banda_b_media} />
                        <BandaBadge label="C" valor={alumno.banda_c_media} />
                        <BandaBadge label="D" valor={alumno.banda_d_media} />
                        <span className="self-center text-[10px]" style={{ color: L.muted }}>
                          {alumno.num_evaluaciones} evaluacion
                          {alumno.num_evaluaciones !== 1 ? "es" : ""}
                          {alumno.ultima_evaluacion && (
                            <>
                              {" "}
                              · última{" "}
                              {new Date(alumno.ultima_evaluacion).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                      style={{ color: L.muted }}
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
