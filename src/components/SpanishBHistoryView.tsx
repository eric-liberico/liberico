import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang, useUiLangControl } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  type TextTypeP1B,
  type ThemeP1B,
} from "@/lib/criteria/spanish-b-language";
import { SpanishBOralHistoryView } from "@/components/SpanishBOralHistoryView";
import { SpanishBPaper2HistoryView } from "@/components/SpanishBPaper2HistoryView";

type HistoryRow = {
  id: string;
  created_at: string;
  text_type: TextTypeP1B;
  theme: ThemeP1B;
  prompt_text: string;
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
};

export function SpanishBHistoryView() {
  const { user, loading: authLoading } = useAuth();
  const lang = useUiLang();
  const { canSwitch, supported, setLang } = useUiLangControl();
  const isEN = lang === "en";

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("evaluaciones_paper1_b")
        .select(
          "id,created_at,text_type,theme,prompt_text,word_count,criterio_a,criterio_b,criterio_c,puntuacion_total,nota_ib,comentario_global,fortalezas,areas_mejora,justificacion_a,justificacion_b,justificacion_c",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("evaluaciones_paper1_b history error:", error);
      else setRows((data ?? []) as HistoryRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const t = isEN
    ? {
        title: "My Spanish B assessments",
        words: "words",
        score: "Score",
        ibGrade: "Grade",
        criterionA: "Language",
        criterionB: "Message",
        criterionC: "Conceptual",
        global: "Overall comment",
        strengths: "Strengths",
        improve: "Areas to improve",
        switchUI: "Switch UI to",
        prompt: "Prompt",
        tabP1: "Paper 1",
        tabOral: "Oral",
        tabReading: "Reading",
        emptyP1: "No evaluations yet.",
        startP1: "Start a new evaluation",
      }
    : {
        title: "Mis evaluaciones de Spanish B",
        words: "palabras",
        score: "Puntuación",
        ibGrade: "Nota",
        criterionA: "Lenguaje",
        criterionB: "Mensaje",
        criterionC: "Conceptual",
        global: "Comentario global",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        switchUI: "Cambiar UI a",
        prompt: "Estímulo",
        tabP1: "Prueba 1",
        tabOral: "Oral",
        tabReading: "Lectura",
        emptyP1: "Sin evaluaciones aún.",
        startP1: "Empezar una nueva evaluación",
      };

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return isEN
      ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Spanish B (Acquisition)
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">{t.title}</h1>
        </div>
        {canSwitch && (
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
        )}
      </header>

      <Tabs defaultValue="p1">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="p1">{t.tabP1}</TabsTrigger>
          <TabsTrigger value="oral">{t.tabOral}</TabsTrigger>
          <TabsTrigger value="reading">{t.tabReading}</TabsTrigger>
        </TabsList>

        {/* ── Paper 1 ── */}
        <TabsContent value="p1" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <p className="text-muted-foreground">{t.emptyP1}</p>
              <Button asChild>
                <Link to="/prueba-1">{t.startP1}</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const tt = TEXT_TYPE_LABELS[row.text_type][isEN ? "en" : "es"];
                const th = THEME_LABELS[row.theme][isEN ? "en" : "es"];
                const isOpen = expanded === row.id;
                return (
                  <Card key={row.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/40 transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium truncate">
                            {tt} · {th}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {fmtDate(row.created_at)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {row.word_count} {t.words}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-lg font-bold">
                          {row.puntuacion_total}
                          <span className="text-xs text-muted-foreground"> /30</span>
                        </span>
                        {row.nota_ib !== null && (
                          <span className="text-xs px-2 py-0.5 rounded bg-success text-success-foreground">
                            {isEN ? "Grade" : "Nota"} {row.nota_ib}/7
                          </span>
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <Mini label={`A · ${t.criterionA}`} score={row.criterio_a} max={12} />
                          <Mini label={`B · ${t.criterionB}`} score={row.criterio_b} max={12} />
                          <Mini label={`C · ${t.criterionC}`} score={row.criterio_c} max={6} />
                        </div>
                        {row.justificacion_a && (
                          <Detail title={`A · ${t.criterionA}`}>{row.justificacion_a}</Detail>
                        )}
                        {row.justificacion_b && (
                          <Detail title={`B · ${t.criterionB}`}>{row.justificacion_b}</Detail>
                        )}
                        {row.justificacion_c && (
                          <Detail title={`C · ${t.criterionC}`}>{row.justificacion_c}</Detail>
                        )}
                        {row.comentario_global && (
                          <Detail title={t.global}>{row.comentario_global}</Detail>
                        )}
                        {row.fortalezas && <Detail title={t.strengths}>{row.fortalezas}</Detail>}
                        {row.areas_mejora && <Detail title={t.improve}>{row.areas_mejora}</Detail>}
                        <Detail title={t.prompt}>
                          <span className="whitespace-pre-wrap text-muted-foreground">
                            {row.prompt_text}
                          </span>
                        </Detail>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Oral ── */}
        <TabsContent value="oral" className="mt-6">
          <SpanishBOralHistoryView />
        </TabsContent>

        {/* ── Lectura ── */}
        <TabsContent value="reading" className="mt-6">
          <SpanishBPaper2HistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Mini({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div className="border border-border rounded-md p-2">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="font-bold">
        {score}
        <span className="text-xs text-muted-foreground"> / {max}</span>
      </p>
    </div>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      <div className="text-sm">{children}</div>
    </div>
  );
}
