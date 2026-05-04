import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
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
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { nivelDisplayLabel, parseCourseKey, parseNivel } from "@/lib/ib-courses";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/historial-prueba-2")({
  head: () => ({
    meta: [
      { title: "Historial Prueba 2 — LIBerico" },
      {
        name: "description",
        content: "Historial de tus ensayos comparativos de Prueba 2 evaluados.",
      },
    ],
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
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
  justificacion_a: string | null;
  justificacion_b: string | null;
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
    criterio_b: row.criterio_b,
    criterio_c: row.criterio_c,
    criterio_d: row.criterio_d,
    puntuacion_total: row.puntuacion_total,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b: row.justificacion_b ?? "",
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
  const isEN = courseKey === "english-a-literature";
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
  }, [user, courseKey]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          to="/historial"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Progreso
        </Link>

        {!selected ? (
          <>
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Historial · Prueba 2
              </div>
              <h1 className="font-serif text-3xl text-ink">Mis ensayos comparativos</h1>
              <p className="text-foreground/70 mt-2">
                Revisa tus ensayos de Prueba 2 anteriores y observa tu progreso.
              </p>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : rows.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <p className="font-serif text-lg text-ink">
                  Aún no tienes evaluaciones de Prueba 2.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Ve al corrector de Prueba 2 y evalúa tu primer ensayo comparativo.
                </p>
                <Button className="mt-6" asChild>
                  <Link to="/prueba-2">Ir a Prueba 2</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left">
                    <Card className="p-5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start gap-4 sm:items-center">
                        <div className="text-center shrink-0 w-16">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {r.puntuacion_total}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                            / 25
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-ink line-clamp-2 leading-snug">
                            {r.pregunta}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.obra_1} · {r.obra_2}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(r.created_at).toLocaleDateString("es-ES", {
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
                              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">EN</span>
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
              Volver al historial
            </Button>

            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                {new Date(selected.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1 className="font-serif text-2xl text-ink mb-2">{selected.pregunta}</h1>
              <p className="text-sm text-muted-foreground">
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
