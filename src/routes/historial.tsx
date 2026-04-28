import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import type { Evaluacion } from "@/lib/ib";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { TextoLectura } from "@/components/TextoLectura";
import { AnalisisAnotado } from "@/components/AnalisisAnotado";
import { textoLecturaPlano } from "@/lib/textFormatting";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Mis evaluaciones — LIBeris" },
      { name: "description", content: "Historial de tus análisis literarios evaluados." },
    ],
  }),
  component: HistorialPage,
});

type Row = {
  id: string;
  created_at: string;
  texto_literario: string;
  pregunta_orientacion: string;
  analisis_estudiante: string;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  justificacion_a: string | null;
  justificacion_b: string | null;
  justificacion_c: string | null;
  justificacion_d: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  comentario_global: string | null;
  puntuacion_total: number;
  nota_ib: number | null;
  introduccion: Evaluacion["introduccion"] | null;
  parrafos: Evaluacion["parrafos"] | null;
  conclusion: Evaluacion["conclusion"] | null;
  ensayo_banda_5: Evaluacion["ensayo_banda_5"] | null;
  lenguaje_analitico: Evaluacion["lenguaje_analitico"] | null;
  sugerencias_reescritura: Evaluacion["sugerencias_reescritura"] | null;
};

function htmlATextoPlano(html: string): string {
  return textoLecturaPlano(html);
}

function rowToEvaluacion(row: Row): Evaluacion {
  return {
    evaluacion_id: row.id,
    banda_a: row.banda_a,
    banda_b: row.banda_b,
    banda_c: row.banda_c,
    banda_d: row.banda_d,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b: row.justificacion_b ?? "",
    justificacion_c: row.justificacion_c ?? "",
    justificacion_d: row.justificacion_d ?? "",
    fortalezas: row.fortalezas ?? "",
    areas_mejora: row.areas_mejora ?? "",
    comentario_global: row.comentario_global ?? "",
    puntuacion_total: row.puntuacion_total,
    nota_ib: row.nota_ib ?? 1,
    introduccion: row.introduccion ?? undefined,
    parrafos: row.parrafos ?? undefined,
    conclusion: row.conclusion ?? undefined,
    ensayo_banda_5: row.ensayo_banda_5 ?? undefined,
    lenguaje_analitico: row.lenguaje_analitico ?? undefined,
    sugerencias_reescritura: row.sugerencias_reescritura ?? undefined,
  };
}

function HistorialPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [comentarioProfesor, setComentarioProfesor] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("evaluaciones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error("Error al cargar el historial.");
      else if (data) setRows(data as Row[]);
      setLoading(false);
    })();
  }, [user]);

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
        {!selected ? (
          <>
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Historial
              </div>
              <h1 className="font-serif text-3xl text-ink">Mis evaluaciones</h1>
              <p className="text-foreground/70 mt-2">
                Revisa tus análisis anteriores y observa tu progreso.
              </p>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : rows.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <p className="font-serif text-lg text-ink">Aún no tienes evaluaciones.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vuelve al corrector y evalúa tu primer análisis.
                </p>
                <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
                  Ir al corrector
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <button
                    key={r.id}
                    onClick={async () => {
                      setSelected(r);
                      setComentarioProfesor(null);
                      const { data: comentData } = await supabase
                        .from("comentarios_profesor")
                        .select("contenido")
                        .eq("evaluacion_id", r.id)
                        .maybeSingle();
                      setComentarioProfesor(comentData?.contenido ?? null);
                    }}
                    className="w-full text-left"
                  >
                    <Card className="p-5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="text-center shrink-0 w-16">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {r.nota_ib ?? "–"}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                            IB
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-ink truncate">
                            {r.pregunta_orientacion}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(r.created_at).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {(["a", "b", "c", "d"] as const).map((k) => (
                              <span
                                key={k}
                                className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                              >
                                {k.toUpperCase()} {r[`banda_${k}` as const]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-serif text-2xl font-semibold text-ink">
                            {r.puntuacion_total}
                            <span className="text-sm text-muted-foreground font-normal">/20</span>
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
              <h1 className="font-serif text-2xl text-ink">{selected.pregunta_orientacion}</h1>
            </div>

            <Card className="p-6 mb-8 bg-parchment border-border">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Texto literario
              </div>
              <TextoLectura
                texto={selected.texto_literario}
                className="font-serif text-[15px] leading-relaxed text-ink"
              />
            </Card>

            <div className="mb-8">
              <AnalisisAnotado
                texto={htmlATextoPlano(selected.analisis_estudiante)}
                ev={rowToEvaluacion(selected)}
                onSugerenciasChange={(sugerencias) => {
                  setSelected((actual) =>
                    actual?.id === selected.id
                      ? { ...actual, sugerencias_reescritura: sugerencias }
                      : actual,
                  );
                  setRows((actuales) =>
                    actuales.map((row) =>
                      row.id === selected.id
                        ? { ...row, sugerencias_reescritura: sugerencias }
                        : row,
                    ),
                  );
                }}
              />
            </div>

            <EvaluacionPanel ev={rowToEvaluacion(selected)} />

            {comentarioProfesor && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 mb-2">
                  Comentario de tu profesor
                </div>
                <p className="text-[15px] leading-relaxed text-foreground/80 whitespace-pre-line">
                  {comentarioProfesor}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
