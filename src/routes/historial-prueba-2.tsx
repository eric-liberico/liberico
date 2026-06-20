import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EvaluacionPrueba2Panel } from "@/components/EvaluacionPrueba2Panel";
import type {
  EvaluacionPrueba2,
  DiagnosticoComparativoPrueba2,
  AnotacionPrueba2,
  SugerenciaReescrituraPrueba2,
  EnsayoBanda5Prueba2,
} from "@/lib/ib-paper2";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { nivelDisplayLabel, parseCourseKey, parseNivel } from "@/lib/ib-courses";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const scopedCss = `
  #historial-p2-root{--primary:${L.primary};--ring:${L.primary};}
  #historial-p2-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
  #historial-p2-root .lib-press:active{transform:scale(0.97);}
  #historial-p2-root a:focus-visible,#historial-p2-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #historial-p2-root button:not([disabled]){cursor:pointer;}
  #historial-p2-root .lib-reveal{animation:hp2Reveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
  @keyframes hp2Reveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
  #historial-p2-root .lib-card{transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;}
  #historial-p2-root .lib-card:hover{transform:translateY(-2px);box-shadow:0 22px 40px -22px rgba(15,23,42,0.32),0 3px 8px -4px rgba(15,23,42,0.10);border-color:${L.primary}66;}
  @media (prefers-reduced-motion: reduce){
    #historial-p2-root .lib-reveal{animation:none !important;}
    #historial-p2-root .lib-press,#historial-p2-root .lib-card{transition:none !important;}
    #historial-p2-root .lib-card:hover{transform:none !important;}
  }
`;

export const Route = createFileRoute("/historial-prueba-2")({
  head: () => ({
    meta: [
      { title: "Paper 2 History — LIBerico" },
      {
        name: "description",
        content: "History of your assessed Paper 2 comparative essays.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: HistorialPrueba2Page,
});

type Row = {
  id: string;
  created_at: string;
  pregunta: string;
  obra_1: string;
  obra_2: string;
  notas_obra_1: string | null;
  notas_obra_2: string | null;
  ensayo_estudiante: string;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
  justificacion_a: string | null;
  justificacion_b1: string | null;
  justificacion_b2: string | null;
  justificacion_c: string | null;
  justificacion_d: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
  diagnostico_comparativo: DiagnosticoComparativoPrueba2 | null;
  anotaciones: AnotacionPrueba2[] | null;
  sugerencias_reescritura: SugerenciaReescrituraPrueba2[] | null;
  ensayo_banda_5: EnsayoBanda5Prueba2 | null;
  nivel?: string | null;
  course_key?: string | null;
};

function rowToEvaluacion(row: Row): EvaluacionPrueba2 {
  return {
    evaluacion_id: row.id,
    criterio_a: row.criterio_a,
    criterio_b1: row.criterio_b1,
    criterio_b2: row.criterio_b2,
    criterio_c: row.criterio_c,
    criterio_d: row.criterio_d,
    puntuacion_total: row.puntuacion_total,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b1: row.justificacion_b1 ?? "",
    justificacion_b2: row.justificacion_b2 ?? "",
    justificacion_c: row.justificacion_c ?? "",
    justificacion_d: row.justificacion_d ?? "",
    fortalezas: row.fortalezas ?? "",
    areas_mejora: row.areas_mejora ?? "",
    comentario_global: row.comentario_global ?? "",
    diagnostico_comparativo: row.diagnostico_comparativo ?? null,
    anotaciones: row.anotaciones ?? null,
    sugerencias_reescritura: row.sugerencias_reescritura ?? null,
    ensayo_banda_5: row.ensayo_banda_5 ?? null,
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function htmlATextoPlano(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|div|h[1-6])>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

const CRITERIO_CHIPS = ["a", "b1", "b2", "c", "d"] as const;

function HistorialPrueba2Page() {
  const { user, loading: authLoading, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const handleEvaluacionChange = useCallback((updatedEv: EvaluacionPrueba2) => {
    const id = selectedRef.current?.id;
    if (!id) return;
    const merge = (row: Row): Row => ({
      ...row,
      diagnostico_comparativo: updatedEv.diagnostico_comparativo ?? row.diagnostico_comparativo,
      anotaciones: updatedEv.anotaciones ?? row.anotaciones,
      sugerencias_reescritura: updatedEv.sugerencias_reescritura ?? row.sugerencias_reescritura,
      ensayo_banda_5: updatedEv.ensayo_banda_5 ?? row.ensayo_banda_5,
    });
    setSelected((actual) => (actual?.id === id ? merge(actual) : actual));
    setRows((actuales) => actuales.map((row) => (row.id === id ? merge(row) : row)));
  }, []);

  const handleSugerenciasChange = useCallback((sugerencias: SugerenciaReescrituraPrueba2[]) => {
    const id = selectedRef.current?.id;
    if (!id) return;
    setSelected((actual) =>
      actual?.id === id ? { ...actual, sugerencias_reescritura: sugerencias } : actual,
    );
    setRows((actuales) =>
      actuales.map((row) =>
        row.id === id ? { ...row, sugerencias_reescritura: sugerencias } : row,
      ),
    );
  }, []);

  const handleEnsayoChange = useCallback((ensayo: EnsayoBanda5Prueba2) => {
    const id = selectedRef.current?.id;
    if (!id) return;
    setSelected((actual) => (actual?.id === id ? { ...actual, ensayo_banda_5: ensayo } : actual));
    setRows((actuales) =>
      actuales.map((row) => (row.id === id ? { ...row, ensayo_banda_5: ensayo } : row)),
    );
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("evaluaciones_prueba2")
        .select("*")
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false });
      if (error) toast.error(isEN ? "Error loading history." : "Error al cargar el historial.");
      else if (data) setRows(data as Row[]);
      setLoading(false);
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
      id="historial-p2-root"
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

        {!selected ? (
          <>
            <div className="mb-8 lib-reveal">
              <div
                className="mb-3 text-[10px] uppercase tracking-[0.22em]"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "History · Paper 2" : "Historial · Prueba 2"}
              </div>
              <h1 className="text-3xl font-bold" style={{ ...headingStyle, color: L.ink }}>
                {isEN ? "My comparative essays" : "Mis ensayos comparativos"}
              </h1>
              <p className="mt-2" style={{ color: L.muted }}>
                {isEN
                  ? "Review your previous Paper 2 essays and see your progress."
                  : "Revisa tus ensayos de Prueba 2 anteriores y observa tu progreso."}
              </p>
            </div>

            {loading ? (
              <p style={{ color: L.muted }}>{isEN ? "Loading…" : "Cargando…"}</p>
            ) : rows.length === 0 ? (
              <Card
                className="rounded-2xl border border-dashed p-10 text-center lib-reveal"
                style={{ backgroundColor: L.surface, borderColor: L.line }}
              >
                <p className="text-lg font-semibold" style={{ ...headingStyle, color: L.ink }}>
                  {isEN ? "No Paper 2 essays yet." : "Aún no tienes evaluaciones de Prueba 2."}
                </p>
                <p className="mt-2 text-sm" style={{ color: L.muted }}>
                  {isEN
                    ? "Go to the Paper 2 evaluator and assess your first comparative essay."
                    : "Ve al corrector de Prueba 2 y evalúa tu primer ensayo comparativo."}
                </p>
                <Button
                  className="lib-press mt-6 rounded-2xl"
                  asChild
                  style={{ boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" }}
                >
                  <Link to="/prueba-2">{isEN ? "Go to Paper 2" : "Ir a Prueba 2"}</Link>
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
                      <div className="flex items-start gap-4 sm:items-center">
                        <div className="text-center shrink-0 w-16">
                          <div
                            className="text-3xl font-semibold leading-none tabular-nums"
                            style={{ ...fontMono, color: L.primary }}
                          >
                            {r.puntuacion_total}
                          </div>
                          <div
                            className="mt-1 text-[10px] uppercase tracking-[0.15em]"
                            style={{ ...fontMono, color: L.muted }}
                          >
                            / 25
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="line-clamp-2 font-semibold leading-snug"
                            style={{ color: L.ink }}
                          >
                            {r.pregunta}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: L.muted }}>
                            {r.obra_1} · {r.obra_2}
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: L.muted }}>
                            {new Date(r.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {CRITERIO_CHIPS.map((k) => (
                              <span
                                key={k}
                                className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                              >
                                {k.toUpperCase()} {r[`criterio_${k}` as keyof Row] as number}
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
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
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
              <h1 className="mb-2 text-2xl font-bold" style={{ ...headingStyle, color: L.ink }}>
                {selected.pregunta}
              </h1>
              <p className="text-sm" style={{ color: L.muted }}>
                {selected.obra_1} · {selected.obra_2}
              </p>
            </div>

            <EvaluacionPrueba2Panel
              ev={rowToEvaluacion(selected)}
              ensayo={htmlATextoPlano(selected.ensayo_estudiante)}
              resultadoInicialBasico
              onEvaluacionChange={handleEvaluacionChange}
              onSugerenciasChange={handleSugerenciasChange}
              onEnsayoChange={handleEnsayoChange}
            />
          </>
        )}
      </main>
    </div>
  );
}
