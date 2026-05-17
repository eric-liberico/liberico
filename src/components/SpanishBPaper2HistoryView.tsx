import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";

type P2Row = {
  id: string;
  created_at: string;
  theme: ThemeP1B;
  preguntas: string[];
  respuestas: string[];
  criterio_a: number;
  criterio_b: number;
  puntuacion_total: number;
  nota_ib: number | null;
  comentario_global: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  justificacion_a: string | null;
  justificacion_b: string | null;
};

export function SpanishBPaper2HistoryView() {
  const { user, loading: authLoading } = useAuth();
  const isEN = useUiLang() === "en";

  const [rows, setRows] = useState<P2Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evaluaciones_paper2_b")
        .select(
          "id,created_at,theme,preguntas,respuestas,criterio_a,criterio_b,puntuacion_total,nota_ib,comentario_global,fortalezas,areas_mejora,justificacion_a,justificacion_b",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("evaluaciones_paper2_b history error:", error);
      else setRows((data ?? []) as P2Row[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {isEN ? "No reading evaluations yet." : "Aún no hay evaluaciones de lectura."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isOpen = expanded === row.id;
        const date = new Date(row.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const themeLabel = THEME_LABELS[row.theme]?.[isEN ? "en" : "es"] ?? row.theme;
        const preguntas = Array.isArray(row.preguntas) ? row.preguntas : [];
        const respuestas = Array.isArray(row.respuestas) ? row.respuestas : [];

        return (
          <Card key={row.id} className="p-4 space-y-3">
            <button
              type="button"
              className="w-full flex items-start justify-between gap-3 text-left"
              onClick={() => setExpanded(isOpen ? null : row.id)}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {date}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {themeLabel}
                  </span>
                  {row.nota_ib && (
                    <span className="text-xs px-2 py-0.5 rounded bg-success text-success-foreground font-medium">
                      {isEN ? "Grade" : "Nota"} {row.nota_ib}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    {isEN ? "Score" : "Punt."} {row.puntuacion_total}/20
                  </span>
                  <span>
                    A:{row.criterio_a} B:{row.criterio_b}
                  </span>
                  <span>
                    {preguntas.length} {isEN ? "questions" : "preguntas"}
                  </span>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-border pt-3">
                {preguntas.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {isEN ? "Questions & answers" : "Preguntas y respuestas"}
                    </div>
                    {preguntas.map((q, i) => (
                      <div key={i} className="bg-muted/40 rounded-md p-3 space-y-1">
                        <p className="text-sm font-medium">
                          {i + 1}. {q}
                        </p>
                        <p className="text-sm text-foreground/70 italic">{respuestas[i] ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
                {[
                  {
                    label: isEN
                      ? "Criterion A — Language in responses"
                      : "Criterio A — Lengua en las respuestas",
                    score: row.criterio_a,
                    max: 10,
                    just: row.justificacion_a,
                  },
                  {
                    label: isEN
                      ? "Criterion B — Text comprehension"
                      : "Criterio B — Comprensión del texto",
                    score: row.criterio_b,
                    max: 10,
                    just: row.justificacion_b,
                  },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {c.label}
                      </span>
                      <span className="font-serif text-lg font-semibold text-primary">
                        {c.score}
                        <span className="text-xs text-muted-foreground font-normal">/{c.max}</span>
                      </span>
                    </div>
                    {c.just && <p className="text-sm text-foreground/80">{c.just}</p>}
                  </div>
                ))}
                {row.comentario_global && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      {isEN ? "Overall comment" : "Comentario global"}
                    </div>
                    <p className="text-sm text-foreground/80">{row.comentario_global}</p>
                  </div>
                )}
                {row.fortalezas && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      {isEN ? "Strengths" : "Fortalezas"}
                    </div>
                    <p className="text-sm text-foreground/80">{row.fortalezas}</p>
                  </div>
                )}
                {row.areas_mejora && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      {isEN ? "Areas to improve" : "Áreas de mejora"}
                    </div>
                    <p className="text-sm text-foreground/80">{row.areas_mejora}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
