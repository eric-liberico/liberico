import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

type ItemResult = {
  id: string;
  enunciado: string;
  puntos: number;
  respuesta: string;
  marca: "acierto" | "parcial" | "fallo";
  puntos_obtenidos: number;
  comentario: string;
};

type P2Row = {
  id: string;
  created_at: string;
  theme: ThemeP1B;
  subtotal_auditiva: number | null;
  subtotal_lectura: number | null;
  puntuacion_total: number;
  puntuacion_max: number | null;
  nota_ib: number | null;
  items_auditiva: ItemResult[] | null;
  items_lectura: ItemResult[] | null;
  comentario_global: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
};

const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };

const MARK_STYLE: Record<ItemResult["marca"], { bg: string; color: string }> = {
  acierto: { bg: "#ECFDF5", color: L.ok },
  parcial: { bg: "#FEF3C7", color: L.amberDeep },
  fallo: { bg: "#FFF1F2", color: "#BE123C" },
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
          "id,created_at,theme,subtotal_auditiva,subtotal_lectura,puntuacion_total,puntuacion_max,nota_ib,items_auditiva,items_lectura,comentario_global,fortalezas,areas_mejora",
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
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: L.muted }}>
        {isEN ? "No Paper 2 papers yet." : "Aún no hay pruebas de la Prueba 2."}
      </div>
    );
  }

  const marks = isEN
    ? { acierto: "Correct", parcial: "Partial", fallo: "Incorrect" }
    : { acierto: "Acierto", parcial: "Parcial", fallo: "Fallo" };

  const renderSection = (titulo: string, items: ItemResult[] | null) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ ...fontMono, color: L.muted }}
        >
          {titulo}
        </div>
        {items.map((it, i) => (
          <div
            key={it.id ?? i}
            className="space-y-1 rounded-2xl border p-3"
            style={{ backgroundColor: L.bg2, borderColor: L.line }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: L.ink }}>
                {i + 1}. {it.enunciado}
              </p>
              <span
                className="whitespace-nowrap rounded-xl px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: MARK_STYLE[it.marca].bg,
                  color: MARK_STYLE[it.marca].color,
                }}
              >
                {marks[it.marca]} · {it.puntos_obtenidos}/{it.puntos}
              </span>
            </div>
            <p className="text-sm italic" style={{ color: L.muted }}>
              {it.respuesta || "—"}
            </p>
            {it.comentario && (
              <p className="text-xs" style={{ color: L.muted }}>
                {it.comentario}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

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
        const max = row.puntuacion_max ?? 65;

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
                <div className="flex gap-4 text-xs" style={{ color: L.muted }}>
                  <span>
                    {isEN ? "Score" : "Punt."} {row.puntuacion_total}/{max}
                  </span>
                  {row.subtotal_auditiva !== null && (
                    <span>
                      {isEN ? "Listening" : "Auditiva"}: {row.subtotal_auditiva}/25
                    </span>
                  )}
                  {row.subtotal_lectura !== null && (
                    <span>
                      {isEN ? "Reading" : "Lectura"}: {row.subtotal_lectura}/40
                    </span>
                  )}
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
                {renderSection(
                  isEN ? "Listening comprehension" : "Comprensión auditiva",
                  row.items_auditiva,
                )}
                {renderSection(
                  isEN ? "Reading comprehension" : "Comprensión de lectura",
                  row.items_lectura,
                )}
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
