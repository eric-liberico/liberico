import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

type OralRow = {
  id: string;
  created_at: string;
  theme: ThemeP1B;
  stimulus_description: string;
  global_issue: string;
  word_count: number;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  puntuacion_total: number;
  nota_ib: number | null;
  comentario_global: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  justificacion_a: string | null;
  justificacion_b1: string | null;
  justificacion_b2: string | null;
  justificacion_c: string | null;
};

const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };

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
          "id,created_at,theme,stimulus_description,global_issue,word_count,criterio_a,criterio_b1,criterio_b2,criterio_c,puntuacion_total,nota_ib,comentario_global,fortalezas,areas_mejora,justificacion_a,justificacion_b1,justificacion_b2,justificacion_c",
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
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: L.muted }}>
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
          <Card key={row.id} className="space-y-3 rounded-2xl border p-4" style={cardStyle}>
            <button
              type="button"
              className="lib-press flex w-full items-start justify-between gap-3 rounded-2xl text-left"
              onClick={() => setExpanded(isOpen ? null : row.id)}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    {date}
                  </span>
                  <span
                    className="rounded-xl px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: L.bg2, color: L.ink }}
                  >
                    {themeLabel}
                  </span>
                  {row.nota_ib && (
                    <span
                      className="rounded-xl px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: "#ECFDF5", color: L.ok }}
                    >
                      {isEN ? "Grade" : "Nota"} {row.nota_ib}
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-sm" style={{ color: L.ink }}>
                  {row.global_issue}
                </p>
                <div className="flex gap-4 text-xs" style={{ color: L.muted }}>
                  <span>
                    {isEN ? "Score" : "Punt."} {row.puntuacion_total}/30
                  </span>
                  <span>
                    A:{row.criterio_a} B1:{row.criterio_b1} B2:{row.criterio_b2} C:{row.criterio_c}
                  </span>
                  <span>
                    {row.word_count} {isEN ? "words" : "palabras"}
                  </span>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: L.muted }}
                />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: L.muted }}
                />
              )}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t pt-3" style={{ borderColor: L.line }}>
                {[
                  {
                    label: isEN ? "Criterion A — Language" : "Criterio A — Lengua",
                    score: row.criterio_a,
                    max: 12,
                    just: row.justificacion_a,
                  },
                  {
                    label: isEN
                      ? "Criterion B1 — Message (stimulus)"
                      : "Criterio B1 — Mensaje (estímulo)",
                    score: row.criterio_b1,
                    max: 6,
                    just: row.justificacion_b1,
                  },
                  {
                    label: isEN
                      ? "Criterion B2 — Message (conversation)"
                      : "Criterio B2 — Mensaje (conversación)",
                    score: row.criterio_b2,
                    max: 6,
                    just: row.justificacion_b2,
                  },
                  {
                    label: isEN
                      ? "Criterion C — Interactive skills"
                      : "Criterio C — Destrezas de interacción",
                    score: row.criterio_c,
                    max: 6,
                    just: row.justificacion_c,
                  },
                ].map((c) => (
                  <div key={c.label}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                        style={{ ...fontMono, color: L.muted }}
                      >
                        {c.label}
                      </span>
                      <span
                        className="text-lg font-semibold"
                        style={{ ...fontMono, color: L.primary }}
                      >
                        {c.score}
                        <span className="text-xs font-normal" style={{ color: L.muted }}>
                          /{c.max}
                        </span>
                      </span>
                    </div>
                    {c.just && (
                      <p className="text-sm" style={{ color: L.ink }}>
                        {c.just}
                      </p>
                    )}
                  </div>
                ))}
                {row.comentario_global && (
                  <div>
                    <div
                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {isEN ? "Overall comment" : "Comentario global"}
                    </div>
                    <p className="text-sm" style={{ color: L.ink }}>
                      {row.comentario_global}
                    </p>
                  </div>
                )}
                {row.fortalezas && (
                  <div>
                    <div
                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {isEN ? "Strengths" : "Fortalezas"}
                    </div>
                    <p className="text-sm" style={{ color: L.ink }}>
                      {row.fortalezas}
                    </p>
                  </div>
                )}
                {row.areas_mejora && (
                  <div>
                    <div
                      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {isEN ? "Areas to improve" : "Áreas de mejora"}
                    </div>
                    <p className="text-sm" style={{ color: L.ink }}>
                      {row.areas_mejora}
                    </p>
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
