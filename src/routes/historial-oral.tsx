import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
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
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { nivelDisplayLabel, parseCourseKey, parseNivel } from "@/lib/ib-courses";

export const Route = createFileRoute("/historial-oral")({
  head: () => ({
    meta: [
      { title: "Oral History — LIBerico" },
      {
        name: "description",
        content: "History of your Individual Oral assessments.",
      },
    ],
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
  const isEN = courseKey === "english-a-literature";
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
  }, [user, courseKey]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {isEN ? "Loading…" : "Cargando…"}
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
          {isEN ? "Back to my assessments" : "Volver a mis evaluaciones"}
        </Link>

        {/* Detalle */}
        {selected ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-6">
              <ChevronLeft className="h-4 w-4" />
              {isEN ? "Back to history" : "Volver al historial"}
            </Button>

            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                {new Date(selected.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1 className="font-serif text-2xl text-ink leading-snug">
                {selected.asunto_global}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
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
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                {isEN ? "History · Individual Oral" : "Historial · Oral Individual"}
              </div>
              <h1 className="font-serif text-3xl text-ink">
                {isEN ? "My oral assessments" : "Mis evaluaciones del oral"}
              </h1>
              <p className="text-foreground/70 mt-2">
                {isEN
                  ? "Review your previous assessments and track your progress."
                  : "Revisa tus evaluaciones anteriores y observa tu progreso."}
              </p>
            </div>

            {listLoading ? (
              <p className="text-muted-foreground">{isEN ? "Loading…" : "Cargando…"}</p>
            ) : rows.length === 0 ? (
              <Card className="p-10 text-center border-dashed">
                <p className="font-serif text-lg text-ink">
                  {isEN ? "No oral assessments yet." : "Aún no tienes evaluaciones del oral."}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isEN
                    ? "Go to the Oral section and assess your first script."
                    : "Ve a la sección Oral y evalúa tu primer guion."}
                </p>
                <Button className="mt-6" asChild>
                  <Link to="/oral">{isEN ? "Go to Oral" : "Ir al oral"}</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left">
                    <Card className="p-5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="text-center shrink-0 w-14">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {notaIBOral(r.puntuacion_total)}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                            IB
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-ink truncate">{r.asunto_global}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {r.obra_1_titulo} · {r.obra_2_titulo}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
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
                                ? (isEN ? "With teacher" : "Con profesor")
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
                              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">EN</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-serif text-2xl font-semibold text-ink">
                            {r.puntuacion_total}
                            <span className="text-sm text-muted-foreground font-normal">/40</span>
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
