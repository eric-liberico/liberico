import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang, useUiLangControl } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  type TextTypeP1B,
  type ThemeP1B,
} from "@/lib/criteria/spanish-b-language";
import { SpanishBOralHistoryView } from "@/components/SpanishBOralHistoryView";
import { SpanishBPaper2HistoryView } from "@/components/SpanishBPaper2HistoryView";
import { MdProse } from "@/components/MdProse";
import { PanelLogros } from "@/components/gamificacion/PanelLogros";
import { useGamificacion } from "@/hooks/useGamificacion";

type Vista = "portal" | "p1-lista" | "p1-detalle" | "p2" | "oral";

type ErrorLengua = { categoria: string; fragmento: string; correccion: string };
type ApropiacionItem = { nota: string; estado: "respeta" | "incumple" | "parcial" };

type P1HistoryRow = {
  id: string;
  created_at: string;
  text_type: TextTypeP1B;
  theme: ThemeP1B;
  prompt_text: string;
  student_response: string | null;
  word_count: number;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  puntuacion_total: number;
  nota_ib: number | null;
  comentario_global: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  justificacion_a: string | null;
  justificacion_b: string | null;
  justificacion_c: string | null;
  errores_lengua: ErrorLengua[] | null;
  apropiacion_tipo_texto: ApropiacionItem[] | null;
};

type PortalPreview = {
  nota_ib: number | null;
  puntuacion_total: number;
  created_at: string;
};

export function SpanishBHistoryView() {
  const { user, loading: authLoading } = useAuth();
  const lang = useUiLang();
  const { canSwitch, supported, setLang } = useUiLangControl();
  const isEN = lang === "en";
  const gamif = useGamificacion();

  const [vista, setVista] = useState<Vista>("portal");
  const [selectedRow, setSelectedRow] = useState<P1HistoryRow | null>(null);

  const [p1Count, setP1Count] = useState<number | null>(null);
  const [p1Recent, setP1Recent] = useState<PortalPreview | null>(null);
  const [p2Count, setP2Count] = useState<number | null>(null);
  const [p2Recent, setP2Recent] = useState<PortalPreview | null>(null);
  const [oralCount, setOralCount] = useState<number | null>(null);
  const [oralRecent, setOralRecent] = useState<PortalPreview | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);

  const [p1Rows, setP1Rows] = useState<P1HistoryRow[]>([]);
  const [p1ListLoading, setP1ListLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    setPortalLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    void (async () => {
      const [p1Res, p2Res, oralRes] = await Promise.all([
        supabase
          .from("evaluaciones_paper1_b")
          .select("nota_ib,puntuacion_total,created_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        db
          .from("evaluaciones_paper2_b")
          .select("nota_ib,puntuacion_total,created_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        db
          .from("evaluaciones_oral_b")
          .select("nota_ib,puntuacion_total,created_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setP1Count(p1Res.count ?? 0);
      if (p1Res.data?.[0]) setP1Recent(p1Res.data[0] as PortalPreview);
      setP2Count((p2Res as { count: number | null }).count ?? 0);
      if ((p2Res as { data: unknown[] | null }).data?.[0])
        setP2Recent((p2Res as { data: PortalPreview[] }).data[0]);
      setOralCount((oralRes as { count: number | null }).count ?? 0);
      if ((oralRes as { data: unknown[] | null }).data?.[0])
        setOralRecent((oralRes as { data: PortalPreview[] }).data[0]);
      setPortalLoading(false);
    })();
  }, [user, authLoading]);

  const entrarP1 = async () => {
    setVista("p1-lista");
    if (p1Rows.length > 0) return;
    setP1ListLoading(true);
    const { data } = await supabase
      .from("evaluaciones_paper1_b")
      .select(
        "id,created_at,text_type,theme,prompt_text,student_response,word_count,criterio_a,criterio_b,criterio_c,puntuacion_total,nota_ib,comentario_global,fortalezas,areas_mejora,justificacion_a,justificacion_b,justificacion_c,errores_lengua,apropiacion_tipo_texto",
      )
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setP1Rows(data as P1HistoryRow[]);
    setP1ListLoading(false);
  };

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const t = isEN
    ? {
        history: "History",
        myAssessments: "My assessments",
        choosePaper: "Choose a component to review your previous feedback.",
        assessments: "Assessments",
        p1title: "Paper 1",
        p1sub: "Written production",
        p2title: "Paper 2",
        p2sub: "Reading comprehension",
        oralTitle: "Individual Oral",
        oralSub: "Individual oral assessment",
        noP1: "No Paper 1 assessments yet.",
        noP2: "No Paper 2 assessments yet.",
        noOral: "No Oral assessments yet.",
        backToAssessments: "Back to my assessments",
        backToHistory: "Back to history",
        p1History: "History · Paper 1",
        myP1: "My Paper 1 assessments",
        reviewP1: "Review your previous assessments and track your progress.",
        noP1Yet: "No assessments yet.",
        goToEval: "Go to evaluator",
        score: "Score",
        ibGrade: "Grade (estimate)",
        languageErrors: "Language errors",
        textTypeAppropriacy: "Text-type appropriateness",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        wordsDetected: "words detected",
        annotatedResponse: "Your annotated response",
        switchUI: "Switch UI to",
        last: "last",
      }
    : {
        history: "Historial",
        myAssessments: "Mis evaluaciones",
        choosePaper: "Elige la prueba para revisar tus correcciones anteriores.",
        assessments: "Corrector",
        p1title: "Prueba 1",
        p1sub: "Producción escrita",
        p2title: "Prueba 2",
        p2sub: "Comprensión lectora",
        oralTitle: "Oral Individual",
        oralSub: "Trabajo Oral Individual",
        noP1: "Aún no tienes evaluaciones de Prueba 1.",
        noP2: "Aún no tienes evaluaciones de Prueba 2.",
        noOral: "Aún no tienes evaluaciones del Oral.",
        backToAssessments: "Volver a mis evaluaciones",
        backToHistory: "Volver al historial",
        p1History: "Historial · Prueba 1",
        myP1: "Mis evaluaciones de Prueba 1",
        reviewP1: "Revisa tus evaluaciones anteriores y observa tu progreso.",
        noP1Yet: "Aún no tienes evaluaciones.",
        goToEval: "Ir al corrector",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        languageErrors: "Errores de lengua",
        textTypeAppropriacy: "Apropiación del tipo de texto",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
        wordsDetected: "palabras detectadas",
        annotatedResponse: "Tu respuesta anotada",
        switchUI: "Cambiar UI a",
        last: "última el",
      };

  const langSwitcher = canSwitch ? (
    <div className="flex items-center gap-2 text-sm shrink-0">
      <span className="text-muted-foreground hidden sm:inline">{t.switchUI}</span>
      {supported.map((ln) => (
        <Button
          key={ln}
          size="sm"
          variant={ln === lang ? "default" : "outline"}
          onClick={() => setLang(ln)}
        >
          {ln.toUpperCase()}
        </Button>
      ))}
    </div>
  ) : null;

  // ── PORTAL ──
  if (vista === "portal") {
    return (
      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              {t.history}
            </div>
            <h1 className="font-serif text-3xl text-ink">{t.myAssessments}</h1>
            <p className="text-foreground/70 mt-2">{t.choosePaper}</p>
          </div>
          {langSwitcher}
        </header>

        {portalLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {p1Recent?.nota_ib != null &&
              p2Recent?.nota_ib != null &&
              oralRecent?.nota_ib != null &&
              (() => {
                const notaEstimada = Math.round(
                  (p1Recent.nota_ib + p2Recent.nota_ib + oralRecent.nota_ib) / 3,
                );
                return (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-center shrink-0">
                        <div className="font-serif text-5xl font-bold text-primary leading-none">
                          {notaEstimada}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {isEN ? "Grade" : "Nota"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-ink">
                          {isEN ? "Estimated final grade" : "Nota final estimada"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isEN
                            ? "Based on most recent assessments"
                            : "Basada en tus evaluaciones más recientes"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            { label: isEN ? "P1" : "P1", nota: p1Recent.nota_ib },
                            { label: isEN ? "P2" : "P2", nota: p2Recent.nota_ib },
                            { label: "Oral", nota: oralRecent.nota_ib },
                          ].map((c) => (
                            <span
                              key={c.label}
                              className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-muted-foreground"
                            >
                              {c.label} {c.nota}/7
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* P1 */}
              <button onClick={entrarP1} className="text-left group">
                <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {t.assessments}
                      </div>
                      <div className="font-serif text-xl text-ink mt-0.5">{t.p1title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.p1sub}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                  {p1Count !== null && p1Count > 0 && p1Recent ? (
                    <div className="mt-auto flex items-center gap-3">
                      {p1Recent.nota_ib !== null && (
                        <div className="text-center">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {p1Recent.nota_ib}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                            / 7 IB
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {p1Count}{" "}
                        {isEN
                          ? p1Count === 1
                            ? "assessment"
                            : "assessments"
                          : p1Count === 1
                            ? "evaluación"
                            : "evaluaciones"}{" "}
                        · {t.last} {fmtDate(p1Recent.created_at)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-auto text-xs text-muted-foreground">{t.noP1}</p>
                  )}
                </Card>
              </button>

              {/* P2 */}
              <button onClick={() => setVista("p2")} className="text-left group">
                <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {t.assessments}
                      </div>
                      <div className="font-serif text-xl text-ink mt-0.5">{t.p2title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.p2sub}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                  {p2Count !== null && p2Count > 0 && p2Recent ? (
                    <div className="mt-auto flex items-center gap-3">
                      {p2Recent.nota_ib !== null && (
                        <div className="text-center">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {p2Recent.nota_ib}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                            / 7 IB
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {p2Count}{" "}
                        {isEN
                          ? p2Count === 1
                            ? "assessment"
                            : "assessments"
                          : p2Count === 1
                            ? "evaluación"
                            : "evaluaciones"}{" "}
                        · {t.last} {fmtDate(p2Recent.created_at)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-auto text-xs text-muted-foreground">{t.noP2}</p>
                  )}
                </Card>
              </button>

              {/* Oral */}
              <button onClick={() => setVista("oral")} className="text-left group">
                <Card className="p-6 h-full hover:border-primary/40 hover:bg-accent/30 transition-colors flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {t.assessments}
                      </div>
                      <div className="font-serif text-xl text-ink mt-0.5">{t.oralTitle}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.oralSub}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                  {oralCount !== null && oralCount > 0 && oralRecent ? (
                    <div className="mt-auto flex items-center gap-3">
                      {oralRecent.nota_ib !== null && (
                        <div className="text-center">
                          <div className="font-serif text-3xl font-semibold text-primary leading-none">
                            {oralRecent.nota_ib}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                            / 7 IB
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {oralCount}{" "}
                        {isEN
                          ? oralCount === 1
                            ? "assessment"
                            : "assessments"
                          : oralCount === 1
                            ? "evaluación"
                            : "evaluaciones"}{" "}
                        · {t.last} {fmtDate(oralRecent.created_at)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-auto text-xs text-muted-foreground">{t.noOral}</p>
                  )}
                </Card>
              </button>
            </div>

            {!gamif.loading && (
              <div className="mt-6">
                <PanelLogros
                  logrosDesbloqueados={gamif.logrosDesbloqueados}
                  fechas={gamif.fechas}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── P1 LISTA ──
  if (vista === "p1-lista") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setVista("portal")} className="mb-2">
          <ChevronLeft className="h-4 w-4" />
          {t.backToAssessments}
        </Button>

        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {t.p1History}
          </div>
          <h1 className="font-serif text-3xl text-ink">{t.myP1}</h1>
          <p className="text-foreground/70 mt-2">{t.reviewP1}</p>
        </div>

        {p1ListLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : p1Rows.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <p className="font-serif text-lg text-ink">{t.noP1Yet}</p>
            <Button className="mt-6" asChild>
              <Link to="/prueba-1">{t.goToEval}</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {p1Rows.map((row) => {
              const tt = TEXT_TYPE_LABELS[row.text_type][isEN ? "en" : "es"];
              const th = THEME_LABELS[row.theme][isEN ? "en" : "es"];
              return (
                <button
                  key={row.id}
                  onClick={() => {
                    setSelectedRow(row);
                    setVista("p1-detalle");
                  }}
                  className="w-full text-left"
                >
                  <Card className="p-5 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="text-center shrink-0 w-16">
                        <div className="font-serif text-3xl font-semibold text-primary leading-none">
                          {row.nota_ib ?? "–"}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                          IB
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-ink truncate">
                          {tt} · {th}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {fmtDate(row.created_at)}
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {(
                            [
                              { k: "A", v: row.criterio_a, max: 12 },
                              { k: "B", v: row.criterio_b, max: 12 },
                              { k: "C", v: row.criterio_c, max: 6 },
                            ] as const
                          ).map((c) => (
                            <span
                              key={c.k}
                              className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                            >
                              {c.k} {c.v}/{c.max}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-serif text-2xl font-semibold text-ink">
                          {row.puntuacion_total}
                          <span className="text-sm text-muted-foreground font-normal">/30</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── P1 DETALLE ──
  if (vista === "p1-detalle" && selectedRow) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedRow(null);
            setVista("p1-lista");
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          {t.backToHistory}
        </Button>

        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {fmtDate(selectedRow.created_at)}
          </div>
          <h1 className="font-serif text-2xl text-ink">
            {TEXT_TYPE_LABELS[selectedRow.text_type][isEN ? "en" : "es"]} ·{" "}
            {THEME_LABELS[selectedRow.theme][isEN ? "en" : "es"]}
          </h1>
        </div>

        {/* Score header */}
        <Card className="p-6 bg-primary text-primary-foreground border-primary">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                {isEN ? "Result" : "Resultado"}
              </div>
              <div className="font-serif text-2xl mt-1">
                {isEN ? "Examiner's evaluation" : "Evaluación del examinador"}
              </div>
              <div className="text-[11px] opacity-60 mt-1">
                {selectedRow.word_count} {t.wordsDetected}
              </div>
            </div>
            <div className="flex items-end gap-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.score}</div>
                <div className="font-serif text-5xl font-semibold leading-none mt-1">
                  {selectedRow.puntuacion_total}
                  <span className="text-lg opacity-60 font-normal"> / 30</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {t.ibGrade}
                </div>
                <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                  <span className="px-3 py-1 rounded-md bg-success">{selectedRow.nota_ib}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Criterion cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <HistCriterionCard
            letter="A"
            name={isEN ? "Language" : "Lenguaje"}
            score={selectedRow.criterio_a}
            max={12}
            rationale={selectedRow.justificacion_a ?? ""}
            isEN={isEN}
          />
          <HistCriterionCard
            letter="B"
            name={isEN ? "Message" : "Mensaje"}
            score={selectedRow.criterio_b}
            max={12}
            rationale={selectedRow.justificacion_b ?? ""}
            isEN={isEN}
          />
          <HistCriterionCard
            letter="C"
            name={isEN ? "Conceptual understanding" : "Comprensión conceptual"}
            score={selectedRow.criterio_c}
            max={6}
            rationale={selectedRow.justificacion_c ?? ""}
            isEN={isEN}
          />
        </div>

        {/* Global comment */}
        {selectedRow.comentario_global && (
          <Card className="p-6 bg-parchment border-border">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              {t.global}
            </div>
            <MdProse className="font-serif text-ink" size="base">
              {selectedRow.comentario_global}
            </MdProse>
          </Card>
        )}

        {/* Strengths / improvements */}
        {(selectedRow.fortalezas?.trim() || selectedRow.areas_mejora?.trim()) && (
          <div className="grid md:grid-cols-2 gap-4">
            {selectedRow.fortalezas && (
              <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  {t.strengths}
                </div>
                <MdProse>{selectedRow.fortalezas}</MdProse>
              </Card>
            )}
            {selectedRow.areas_mejora && (
              <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-primary)" }}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  {t.improve}
                </div>
                <MdProse>{selectedRow.areas_mejora}</MdProse>
              </Card>
            )}
          </div>
        )}

        {/* Respuesta anotada */}
        {selectedRow.student_response && selectedRow.student_response.trim().length > 0 && (
          <Card className="p-6 border-border space-y-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.annotatedResponse}
            </div>
            <HistoryRespuestaAnotada
              texto={selectedRow.student_response}
              errores={selectedRow.errores_lengua ?? []}
            />
          </Card>
        )}

        {/* Errores de lengua */}
        {selectedRow.errores_lengua && selectedRow.errores_lengua.length > 0 && (
          <Card className="p-5 bg-parchment border-border space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {t.languageErrors}
            </div>
            <ul className="space-y-2">
              {selectedRow.errores_lengua.map((err, i) => (
                <li key={i} className="text-sm border-l-2 border-amber-500 pl-3">
                  <span className="inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-900 rounded mr-2 uppercase">
                    {err.categoria}
                  </span>
                  <span className="line-through text-muted-foreground">{err.fragmento}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{err.correccion}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Apropiación del tipo de texto */}
        {selectedRow.apropiacion_tipo_texto && selectedRow.apropiacion_tipo_texto.length > 0 && (
          <Card className="p-5 bg-parchment border-border space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {t.textTypeAppropriacy}
            </div>
            <ul className="space-y-2">
              {selectedRow.apropiacion_tipo_texto.map((b, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <span
                    className={
                      b.estado === "respeta"
                        ? "px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-900 rounded uppercase shrink-0"
                        : b.estado === "incumple"
                          ? "px-1.5 py-0.5 text-xs bg-rose-100 text-rose-900 rounded uppercase shrink-0"
                          : "px-1.5 py-0.5 text-xs bg-amber-100 text-amber-900 rounded uppercase shrink-0"
                    }
                  >
                    {b.estado}
                  </span>
                  <span>{b.nota}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  // ── P2 ──
  if (vista === "p2") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setVista("portal")}>
          <ChevronLeft className="h-4 w-4" />
          {t.backToAssessments}
        </Button>
        <SpanishBPaper2HistoryView />
      </div>
    );
  }

  // ── ORAL ──
  if (vista === "oral") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setVista("portal")}>
          <ChevronLeft className="h-4 w-4" />
          {t.backToAssessments}
        </Button>
        <SpanishBOralHistoryView />
      </div>
    );
  }

  return null;
}

function HistCriterionCard({
  letter,
  name,
  score,
  max,
  rationale,
  isEN,
}: {
  letter: string;
  name: string;
  score: number;
  max: number;
  rationale: string;
  isEN: boolean;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN ? "Criterion" : "Criterio"} {letter}
          </div>
          <div className="font-serif text-lg text-ink leading-tight mt-0.5">{name}</div>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{score}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      {rationale && <p className="text-sm text-foreground/80 leading-relaxed">{rationale}</p>}
    </Card>
  );
}

function HistoryRespuestaAnotada({ texto, errores }: { texto: string; errores: ErrorLengua[] }) {
  type Span = { start: number; end: number; error: ErrorLengua };
  const spans: Span[] = [];
  for (const err of errores) {
    if (!err.fragmento) continue;
    const idx = texto.indexOf(err.fragmento);
    if (idx === -1) continue;
    const overlaps = spans.some((s) => idx < s.end && idx + err.fragmento.length > s.start);
    if (!overlaps) spans.push({ start: idx, end: idx + err.fragmento.length, error: err });
  }
  spans.sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; error?: ErrorLengua }> = [];
  let pos = 0;
  for (const span of spans) {
    if (span.start > pos) segments.push({ text: texto.slice(pos, span.start) });
    segments.push({ text: texto.slice(span.start, span.end), error: span.error });
    pos = span.end;
  }
  if (pos < texto.length) segments.push({ text: texto.slice(pos) });

  return (
    <div className="text-sm leading-relaxed font-serif whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.error ? (
          <span
            key={i}
            className="bg-amber-100 dark:bg-amber-900/40 rounded px-0.5 border-b border-amber-400 cursor-help"
            title={`→ ${seg.error.correccion}`}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  );
}
