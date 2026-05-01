import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import type { Evaluacion } from "@/lib/ib";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { TextoLectura } from "@/components/TextoLectura";
import { AnalisisAnotado } from "@/components/AnalisisAnotado";
import { textoLecturaPlano } from "@/lib/textFormatting";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Mis evaluaciones — LIBerico" },
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

type RowP2Preview = {
  id: string;
  created_at: string;
  pregunta: string;
  obra_1: string;
  obra_2: string;
  puntuacion_total: number;
};

type RowOralPreview = {
  id: string;
  created_at: string;
  tipo_oral: string;
  asunto_global: string;
  obra_1_titulo: string;
  obra_2_titulo: string;
  puntuacion_total: number;
};

type Vista = "portal" | "lista" | "detalle";

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

  const [vista, setVista] = useState<Vista>("portal");

  // Portal preview data
  const [p1Count, setP1Count] = useState<number | null>(null);
  const [p1Recent, setP1Recent] = useState<{ nota: number | null; fecha: string } | null>(null);
  const [p2Count, setP2Count] = useState<number | null>(null);
  const [p2Recent, setP2Recent] = useState<RowP2Preview | null>(null);
  const [oralCount, setOralCount] = useState<number | null>(null);
  const [oralRecent, setOralRecent] = useState<RowOralPreview | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);

  // P1 list/detail
  const [rows, setRows] = useState<Row[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [comentarioProfesor, setComentarioProfesor] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Fetch portal preview (lightweight)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p1Res, p2Res, oralRes] = await Promise.all([
        supabase
          .from("evaluaciones")
          .select("id, created_at, nota_ib", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("evaluaciones_prueba2")
          .select("id, created_at, pregunta, obra_1, obra_2, puntuacion_total", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("evaluaciones_oral")
          .select(
            "id, created_at, tipo_oral, asunto_global, obra_1_titulo, obra_2_titulo, puntuacion_total",
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setP1Count(p1Res.count ?? 0);
      if (p1Res.data && p1Res.data.length > 0) {
        setP1Recent({ nota: p1Res.data[0].nota_ib, fecha: p1Res.data[0].created_at });
      }

      setP2Count(p2Res.count ?? 0);
      if (p2Res.data && p2Res.data.length > 0) {
        setP2Recent(p2Res.data[0] as RowP2Preview);
      }

      setOralCount(oralRes.count ?? 0);
      if (oralRes.data && oralRes.data.length > 0) {
        setOralRecent(oralRes.data[0] as RowOralPreview);
      }

      setPortalLoading(false);
    })();
  }, [user]);

  // Load P1 list when entering lista view
  const entrarP1 = async () => {
    setVista("lista");
    if (rows.length > 0) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error al cargar el historial.");
    else if (data) setRows(data as Row[]);
    setListLoading(false);
  };

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
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

        {/* ── Portal ── */}
        {vista === "portal" && (
          <>
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Historial
              </div>
              <h1 className="font-serif text-3xl text-ink">Mis evaluaciones</h1>
              <p className="text-foreground/70 mt-2">
                Elige la prueba para revisar tus correcciones anteriores.
              </p>
            </div>

            {portalLoading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Bloque P1 */}
                <button onClick={entrarP1} className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Corrector
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">Prueba 1</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Análisis literario de texto no visto
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {p1Count !== null && p1Count > 0 ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          {p1Recent?.nota != null && (
                            <div className="text-center">
                              <div className="font-serif text-3xl font-semibold text-primary leading-none">
                                {p1Recent.nota}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                                / 7 IB
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {p1Count} {p1Count === 1 ? "evaluación" : "evaluaciones"} · última el{" "}
                            {p1Recent
                              ? new Date(p1Recent.fecha).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        Aún no tienes evaluaciones de Prueba 1.
                      </p>
                    )}
                  </Card>
                </button>

                {/* Bloque Oral */}
                <Link to="/historial-oral" className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Corrector
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">Oral Individual</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Trabajo Oral Individual
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {oralCount !== null && oralCount > 0 && oralRecent ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="font-serif text-3xl font-semibold text-primary leading-none">
                              {oralRecent.puntuacion_total}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                              / 40
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {oralCount} evaluación{oralCount !== 1 ? "es" : ""} · última el{" "}
                            {new Date(oralRecent.created_at).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {oralRecent.asunto_global}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        Aún no tienes evaluaciones del Oral.
                      </p>
                    )}
                  </Card>
                </Link>

                {/* Bloque P2 */}
                <Link to="/historial-prueba-2" className="text-left group">
                  <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Corrector
                        </div>
                        <div className="font-serif text-xl text-ink mt-0.5">Prueba 2</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Ensayo comparativo de dos obras
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>

                    {p2Count !== null && p2Count > 0 && p2Recent ? (
                      <div className="mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="font-serif text-3xl font-semibold text-primary leading-none">
                              {p2Recent.puntuacion_total}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                              / 25
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p2Count} evaluación{p2Count !== 1 ? "es" : ""} · última el{" "}
                            {new Date(p2Recent.created_at).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {p2Recent.obra_1} · {p2Recent.obra_2}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-muted-foreground">
                        Aún no tienes evaluaciones de Prueba 2.
                      </p>
                    )}
                  </Card>
                </Link>
              </div>
            )}
          </>
        )}

        {/* ── Lista P1 ── */}
        {(vista === "lista" || vista === "detalle") && (
          <>
            {vista === "lista" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVista("portal")}
                  className="mb-6"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver a mis evaluaciones
                </Button>

                <div className="mb-8">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Historial · Prueba 1
                  </div>
                  <h1 className="font-serif text-3xl text-ink">Mis análisis literarios</h1>
                  <p className="text-foreground/70 mt-2">
                    Revisa tus análisis anteriores y observa tu progreso.
                  </p>
                </div>

                {listLoading ? (
                  <p className="text-muted-foreground">Cargando…</p>
                ) : rows.length === 0 ? (
                  <Card className="p-10 text-center border-dashed">
                    <p className="font-serif text-lg text-ink">Aún no tienes evaluaciones.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Vuelve al corrector y evalúa tu primer análisis.
                    </p>
                    <Button className="mt-6" asChild>
                      <Link to="/">Ir al corrector</Link>
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {rows.map((r) => (
                      <button
                        key={r.id}
                        onClick={async () => {
                          setSelected(r);
                          setVista("detalle");
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
                                <span className="text-sm text-muted-foreground font-normal">
                                  /20
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

            {vista === "detalle" && selected && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected(null);
                    setVista("lista");
                  }}
                  className="mb-6"
                >
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
                    texto={textoLecturaPlano(selected.analisis_estudiante)}
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
          </>
        )}
      </main>
    </div>
  );
}
