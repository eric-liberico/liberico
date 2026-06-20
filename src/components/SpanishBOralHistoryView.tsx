import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import {
  LANDING as L,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import {
  ResultadoOralB,
  type ErrorLengua,
  type EstructuraFeedback,
  type EvaluacionOralB,
  type OralTranslations,
} from "@/components/oral-b/ResultadoOralB";

type OralRow = {
  id: string;
  created_at: string;
  theme: ThemeP1B;
  stimulus_description: string;
  global_issue: string;
  word_count: number;
  modo: string | null;
  guion: string | null;
  transcript_limpio: string | null;
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
  errores_lengua: ErrorLengua[] | null;
  estructura_feedback: EstructuraFeedback | null;
  preguntas_probables: string[] | null;
};

// Todas las columnas que ResultadoOralB necesita para reconstruir el resultado completo
// (no solo el subconjunto antiguo): incluye estructura/errores/preguntas y la transcripción.
const SELECT_COLS =
  "id,created_at,theme,stimulus_description,global_issue,word_count,modo,guion,transcript_limpio," +
  "criterio_a,criterio_b1,criterio_b2,criterio_c,puntuacion_total,nota_ib," +
  "comentario_global,fortalezas,areas_mejora," +
  "justificacion_a,justificacion_b1,justificacion_b2,justificacion_c," +
  "errores_lengua,estructura_feedback,preguntas_probables";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em", color: L.ink } as const;
const critBadge = { ...fontMono, backgroundColor: L.primary + "0f", color: L.primary } as const;

// Misma fuente de verdad que SpanishBOralView / oral-b-sesion: reconstruye la evaluación
// guardada para renderizarla con ResultadoOralB (feedback en Markdown, criterios, estructura,
// errores y preguntas), en vez de un acordeón con texto plano que ignoraba la mitad de los datos.
function rowToEvaluacion(row: OralRow): EvaluacionOralB {
  return {
    evaluacion_id: row.id,
    criterio_a: row.criterio_a,
    criterio_b1: row.criterio_b1,
    criterio_b2: row.criterio_b2,
    criterio_c: row.criterio_c,
    puntuacion_total: row.puntuacion_total,
    nota_ib: row.nota_ib ?? 0,
    justificacion_a: row.justificacion_a ?? "",
    justificacion_b1: row.justificacion_b1 ?? "",
    justificacion_b2: row.justificacion_b2 ?? "",
    justificacion_c: row.justificacion_c ?? "",
    comentario_global: row.comentario_global ?? "",
    fortalezas: row.fortalezas ?? "",
    areas_mejora: row.areas_mejora ?? "",
    word_count: row.word_count ?? 0,
    errores_lengua: row.errores_lengua ?? null,
    estructura_feedback: row.estructura_feedback ?? null,
    preguntas_probables: row.preguntas_probables ?? null,
  };
}

export function SpanishBOralHistoryView() {
  const { user, loading: authLoading } = useAuth();
  const isEN = useUiLang() === "en";

  const [rows, setRows] = useState<OralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OralRow | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evaluaciones_oral_b")
        .select(SELECT_COLS)
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

  const t: OralTranslations = isEN
    ? {
        title: "Individual Oral",
        backToForm: "Back to history",
        score: "Score",
        ibGrade: "Grade (estimate)",
        wordsDetected: "words detected",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
      }
    : {
        title: "Oral Individual",
        backToForm: "Volver al historial",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        wordsDetected: "palabras detectadas",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
      };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }

  // Detalle: mismo resultado completo que se ve al terminar la prueba (incluida la transcripción).
  if (selected) {
    return (
      <ResultadoOralB
        evaluacion={rowToEvaluacion(selected)}
        t={t}
        onReset={() => setSelected(null)}
        isEN={isEN}
        guionOriginal={(selected.guion || selected.transcript_limpio) ?? undefined}
      />
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
        const date = new Date(row.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const themeLabel = THEME_LABELS[row.theme]?.[isEN ? "en" : "es"] ?? row.theme;
        const headline = row.global_issue?.trim() || themeLabel;

        return (
          <button
            key={row.id}
            type="button"
            className="lib-press history-hover w-full text-left"
            onClick={() => setSelected(row)}
          >
            <Card className="history-card rounded-2xl border p-5 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-16 shrink-0 text-center">
                  <div
                    className="text-3xl font-semibold leading-none tabular-nums"
                    style={{ ...fontMono, color: L.primary }}
                  >
                    {row.nota_ib ?? "–"}
                  </div>
                  <div
                    className="mt-1 text-[10px] uppercase tracking-[0.15em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    IB
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold" style={headingStyle}>
                    {headline}
                  </div>
                  <div className="mt-0.5 truncate text-xs" style={{ color: L.muted }}>
                    {themeLabel}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: L.muted }}>
                    {date}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.modo === "conversacion" && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ ...fontMono, backgroundColor: L.ok + "14", color: L.ok }}
                      >
                        {isEN ? "Live" : "En vivo"}
                      </span>
                    )}
                    {(
                      [
                        ["A", row.criterio_a],
                        ["B1", row.criterio_b1],
                        ["B2", row.criterio_b2],
                        ["C", row.criterio_c],
                      ] as const
                    ).map(([label, val]) => (
                      <span
                        key={label}
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={critBadge}
                      >
                        {label} {val}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className="text-2xl font-semibold tabular-nums"
                    style={{ ...fontMono, color: L.ink }}
                  >
                    {row.puntuacion_total}
                    <span className="text-sm font-normal" style={{ color: L.muted }}>
                      /30
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
