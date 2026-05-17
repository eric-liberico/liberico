import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";

type OralRow = {
  id: string;
  created_at: string;
  theme: ThemeP1B;
  stimulus_description: string;
  global_issue: string;
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

export function SpanishBOralHistoryView() {
  const { user, loading: authLoading } = useAuth();
  const isEN = useUiLang() === "en";

  const [rows, setRows] = useState<OralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evaluaciones_oral_b")
        .select(
          "id,created_at,theme,stimulus_description,global_issue,word_count,criterio_a,criterio_b,criterio_c,puntuacion_total,nota_ib,comentario_global,fortalezas,areas_mejora,justificacion_a,justificacion_b,justificacion_c",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("evaluaciones_oral_b history error:", error);
      else setRows((data ?? []) as OralRow[]);
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
        {isEN ? "No oral evaluations yet." : "Aún no hay evaluaciones del oral."}
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
                <p className="text-sm text-foreground/80 line-clamp-1">{row.global_issue}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    {isEN ? "Score" : "Punt."} {row.puntuacion_total}/30
                  </span>
                  <span>
                    A:{row.criterio_a} B:{row.criterio_b} C:{row.criterio_c}
                  </span>
                  <span>
                    {row.word_count} {isEN ? "words" : "palabras"}
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
                {[
                  {
                    label: isEN ? "Criterion A — Language" : "Criterio A — Lengua",
                    score: row.criterio_a,
                    max: 10,
                    just: row.justificacion_a,
                  },
                  {
                    label: isEN ? "Criterion B — Message" : "Criterio B — Mensaje",
                    score: row.criterio_b,
                    max: 10,
                    just: row.justificacion_b,
                  },
                  {
                    label: isEN
                      ? "Criterion C — Interactive skills"
                      : "Criterio C — Habilidades interactivas",
                    score: row.criterio_c,
                    max: 10,
                    just: row.justificacion_c,
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
