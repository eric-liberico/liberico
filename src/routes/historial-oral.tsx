import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvaluacionOralPanel } from "@/components/EvaluacionOralPanel";
import type {
  EvaluacionOral,
  TipoOral,
  DiagnosticoAsuntoGlobalOral,
  DiagnosticoEquilibrioOral,
  DiagnosticoEstructuraOral,
  PreguntaProfesorOral,
  ZonaDesarrolloSelfTaught,
  AnotacionOral,
} from "@/lib/ib-oral";
import { notaIBOral } from "@/lib/ib-oral";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { nivelDisplayLabel, parseCourseKey, parseNivel } from "@/lib/ib-courses";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const scopedCss = `
  #historial-oral-root{--primary:${L.primary};--ring:${L.primary};}
  #historial-oral-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
  #historial-oral-root .lib-press:active{transform:scale(0.97);}
  #historial-oral-root a:focus-visible,#historial-oral-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #historial-oral-root button:not([disabled]){cursor:pointer;}
  #historial-oral-root .lib-reveal{animation:hoReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes hoReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  #historial-oral-root .lib-card{transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;}
  #historial-oral-root .lib-card:hover{transform:translateY(-2px);box-shadow:0 22px 40px -22px rgba(15,23,42,0.32),0 3px 8px -4px rgba(15,23,42,0.10);border-color:${L.primary}66;}
  @media (prefers-reduced-motion: reduce){
    #historial-oral-root .lib-reveal{animation:none !important;}
    #historial-oral-root .lib-press,#historial-oral-root .lib-card{transition:none !important;}
    #historial-oral-root .lib-card:hover{transform:none !important;}
  }
`;

export const Route = createFileRoute("/historial-oral")({
  head: () => ({
    meta: [
      { title: "Oral History — LIBerico" },
      {
        name: "description",
        content: "History of your Individual Oral assessments.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: HistorialOralPage,
});

type Row = {
  id: string;
  created_at: string;
  tipo_oral: TipoOral;
  asunto_global: string;
  obra_1_titulo: string;
  obra_1_autor: string | null;
  obra_1_tipo: string;
  obra_2_titulo: string;
  obra_2_autor: string | null;
  obra_2_tipo: string;
  guion_oral: string;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
  duracion_estimada_minutos: number | null;
  justificacion_a: string | null;
  justificacion_b: string | null;
  justificacion_c: string | null;
  justificacion_d: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
  diagnostico_asunto_global: DiagnosticoAsuntoGlobalOral | null;
  diagnostico_equilibrio: DiagnosticoEquilibrioOral | null;
  diagnostico_estructura: DiagnosticoEstructuraOral | null;
  preguntas_profesor: PreguntaProfesorOral[] | null;
  zonas_desarrollo_self_taught: ZonaDesarrolloSelfTaught[] | null;
  anotaciones?: AnotacionOral[] | null;
  nivel?: string | null;
  course_key?: string | null;
};

function rowToEvaluacion(row: Row): EvaluacionOral {
  return {
    evaluacion_id: row.id,
    tipo_oral: row.tipo_oral,
    criterio_a: row.criterio_a,
    criterio_b: row.criterio_b,
    criterio_c: row.criterio_c,
    criterio_d: row.criterio_d,
    puntuacion_total: row.puntuacion_total,
    duracion_estimada_minutos: row.duracion_estimada_minutos ?? 0,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b: row.justificacion_b ?? "",
    justificacion_c: row.justificacion_c ?? "",
    justificacion_d: row.justificacion_d ?? "",
    fortalezas: row.fortalezas ?? "",
    areas_mejora: row.areas_mejora ?? "",
    comentario_global: row.comentario_global ?? "",
    diagnostico_asunto_global: row.diagnostico_asunto_global ?? null,
    diagnostico_equilibrio: row.diagnostico_equilibrio ?? null,
    diagnostico_estructura: row.diagnostico_estructura ?? null,
    preguntas_profesor: row.preguntas_profesor ?? [],
    zonas_desarrollo_self_taught: row.zonas_desarrollo_self_taught ?? [],
    anotaciones: (row.anotaciones as AnotacionOral[] | null | undefined) ?? null,
    feedback_completo_generado: row.diagnostico_asunto_global != null,
  };
}

function HistorialOralPage() {
  const { user, loading: authLoading, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("evaluaciones_oral")
        .select("*")
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false });
      if (error) toast.error(isEN ? "Error loading history." : "Error al cargar el historial.");
      else if (data) setRows(data as Row[]);
      setListLoading(false);
    })();
  }, [user, courseKey, isEN]);

  if (authLoading || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center gap-2 text-sm"
        style={{ ...fontSans, backgroundColor: L.bg, color: L.muted }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div
      id="historial-oral-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{scopedCss}</style>
      <SiteHeader claro />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          to="/historial"
          className="mb-8 inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: L.muted }}
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Back to my assessments" : "Volver a mis evaluaciones"}
        </Link>

        {/* Detalle */}
        {selected ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-6">
              <ChevronLeft className="h-4 w-4" />
              {isEN ? "Back to history" : "Volver al historial"}
            </Button>

            <div className="mb-6 lib-reveal">
              <div
                className="mb-2 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {new Date(selected.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1
                className="text-2xl font-bold leading-snug"
                style={{ ...headingStyle, color: L.ink }}
              >
                {selected.asunto_global}
              </h1>
              <p className="mt-1 text-sm" style={{ color: L.muted }}>
                {selected.obra_1_titulo}
                {selected.obra_1_autor ? ` · ${selected.obra_1_autor}` : ""} ·{" "}
                {selected.obra_2_titulo}
                {selected.obra_2_autor ? ` · ${selected.obra_2_autor}` : ""}
              </p>
            </div>

            <EvaluacionOralPanel
              ev={rowToEvaluacion(selected)}
              guion={selected.guion_oral || undefined}
            />
          </>
        ) : (
          <>
            <div className="mb-8 lib-reveal">
              <div
                className="mb-3 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "History · Individual Oral" : "Historial · Oral Individual"}
              </div>
              <h1 className="text-3xl font-bold" style={{ ...headingStyle, color: L.ink }}>
                {isEN ? "My oral assessments" : "Mis evaluaciones del oral"}
              </h1>
              <p className="mt-2" style={{ color: L.muted }}>
                {isEN
                  ? "Review your previous assessments and track your progress."
                  : "Revisa tus evaluaciones anteriores y observa tu progreso."}
              </p>
            </div>

            {listLoading ? (
              <p style={{ color: L.muted }}>{isEN ? "Loading…" : "Cargando…"}</p>
            ) : rows.length === 0 ? (
              <Card
                className="rounded-2xl border border-dashed p-10 text-center lib-reveal"
                style={{ backgroundColor: L.surface, borderColor: L.line }}
              >
                <p className="text-lg font-semibold" style={{ ...headingStyle, color: L.ink }}>
                  {isEN ? "No oral assessments yet." : "Aún no tienes evaluaciones del oral."}
                </p>
                <p className="mt-2 text-sm" style={{ color: L.muted }}>
                  {isEN
                    ? "Go to the Oral section and assess your first script."
                    : "Ve a la sección Oral y evalúa tu primer guion."}
                </p>
                <Button
                  className="lib-press mt-6 rounded-2xl"
                  asChild
                  style={{ boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" }}
                >
                  <Link to="/oral">{isEN ? "Go to Oral" : "Ir al oral"}</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="lib-press w-full text-left"
                  >
                    <Card
                      className="lib-card rounded-2xl border p-5"
                      style={{
                        backgroundColor: L.surface,
                        borderColor: L.line,
                        boxShadow: cardShadow,
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-center shrink-0 w-14">
                          <div
                            className="text-3xl font-semibold leading-none tabular-nums"
                            style={{ ...fontMono, color: L.primary }}
                          >
                            {notaIBOral(r.puntuacion_total)}
                          </div>
                          <div
                            className="mt-0.5 text-[10px] uppercase tracking-[0.12em]"
                            style={{ ...fontMono, color: L.muted }}
                          >
                            IB
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-semibold" style={{ color: L.ink }}>
                            {r.asunto_global}
                          </div>
                          <div className="mt-0.5 truncate text-xs" style={{ color: L.muted }}>
                            {r.obra_1_titulo} · {r.obra_2_titulo}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: L.muted }}>
                            {new Date(r.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap items-center">
                            <Badge
                              variant={r.tipo_oral === "taught" ? "outline" : "secondary"}
                              className="text-[10px]"
                            >
                              {r.tipo_oral === "taught"
                                ? isEN
                                  ? "With teacher"
                                  : "Con profesor"
                                : "Self-taught"}
                            </Badge>
                            {(["a", "b", "c", "d"] as const).map((k) => (
                              <span
                                key={k}
                                className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                              >
                                {k.toUpperCase()} {r[`criterio_${k}` as const]}
                              </span>
                            ))}
                            <span className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                              {nivelDisplayLabel(parseNivel(r.nivel), parseCourseKey(r.course_key))}
                            </span>
                            {r.course_key === "english-a-literature" && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                EN
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-2xl font-semibold tabular-nums"
                            style={{ ...fontMono, color: L.ink }}
                          >
                            {r.puntuacion_total}
                            <span className="text-sm font-normal" style={{ color: L.muted }}>
                              /40
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
