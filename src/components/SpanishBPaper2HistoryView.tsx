import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";

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

const MARK_STYLE: Record<ItemResult["marca"], string> = {
  acierto: "bg-success text-success-foreground",
  parcial: "bg-amber-500 text-white",
  fallo: "bg-destructive text-destructive-foreground",
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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
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
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {titulo}
        </div>
        {items.map((it, i) => (
          <div key={it.id ?? i} className="bg-muted/40 rounded-md p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                {i + 1}. {it.enunciado}
              </p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap ${MARK_STYLE[it.marca]}`}
              >
                {marks[it.marca]} · {it.puntos_obtenidos}/{it.puntos}
              </span>
            </div>
            <p className="text-sm text-foreground/70 italic">{it.respuesta || "—"}</p>
            {it.comentario && <p className="text-xs text-muted-foreground">{it.comentario}</p>}
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
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-border pt-3">
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
