import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MdProse } from "@/components/MdProse";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import type { EnsayoBanda5Prueba2 as TEnsayoBanda5Prueba2 } from "@/lib/ib-paper2";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import {
  LANDING as L,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const criterioColor: Record<"A" | "B1" | "B2" | "C" | "D", string> = {
  A: CRIT.A,
  B1: CRIT.B,
  B2: L.primary,
  C: CRIT.C,
  D: CRIT.D,
};

type Props = {
  ensayo?: TEnsayoBanda5Prueba2 | null;
  evaluacionId?: string | null;
  onEnsayoChange?: (ensayo: TEnsayoBanda5Prueba2) => void;
  cargando?: boolean;
  modoIdeas?: "conservar" | "ideas_nuevas";
  onModoIdeasChange?: (modo: "conservar" | "ideas_nuevas") => void;
};

function ListaExplicativa({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed" style={{ color: L.muted }}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function EnsayoBanda5Prueba2({
  ensayo,
  evaluacionId,
  onEnsayoChange,
  cargando = false,
  modoIdeas = "conservar",
  onModoIdeasChange,
}: Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";

  const CRITERIO_LABEL: Record<"A" | "B1" | "B2" | "C" | "D", string> = {
    A: isEN ? "Knowledge" : "Conocimiento",
    B1: isEN ? "Formal analysis" : "Análisis formal",
    B2: isEN ? "Comparison" : "Comparación",
    C: isEN ? "Organisation" : "Organización",
    D: isEN ? "Language" : "Lenguaje",
  };

  const [ensayoActual, setEnsayoActual] = useState(ensayo);
  const [modoIdeasLocal, setModoIdeasLocal] = useState<"conservar" | "ideas_nuevas">(modoIdeas);
  const [generando, setGenerando] = useState(false);
  const emptyLabel = isEN
    ? "No data saved for this section."
    : "No hay datos guardados para este apartado.";
  const modoIdeasActual = onModoIdeasChange ? modoIdeas : modoIdeasLocal;

  const setModo = (modo: "conservar" | "ideas_nuevas") => {
    setModoIdeasLocal(modo);
    onModoIdeasChange?.(modo);
  };

  useEffect(() => {
    setEnsayoActual(ensayo);
  }, [ensayo]);

  const generarEnsayo = useCallback(
    async (silencioso = false) => {
      if (!evaluacionId) {
        if (!silencioso)
          toast.error(
            isEN
              ? "Save the assessment first to generate the elevated essay."
              : "Guarda primero la evaluación para generar el ensayo elevado.",
          );
        return;
      }
      setGenerando(true);
      try {
        const { data, error } = await supabase.functions.invoke("lita-p2-model-essay", {
          body: { evaluacion_id: evaluacionId, modo_ideas: modoIdeasActual },
        });
        if (error) {
          throw new Error(
            await getFunctionErrorMessage(
              error,
              isEN ? "Could not generate the essay." : "No se pudo generar el ensayo.",
            ),
          );
        }
        if (data?.error) throw new Error(data.error);
        if (!data?.ensayo_banda_5?.texto) {
          throw new Error(
            isEN
              ? "The AI did not return a valid top-band version."
              : "La IA no devolvió una versión de banda alta válida.",
          );
        }
        const resultado = data.ensayo_banda_5 as TEnsayoBanda5Prueba2;
        setEnsayoActual(resultado);
        onEnsayoChange?.(resultado);
        if (!silencioso)
          toast.success(isEN ? "Elevated essay generated." : "Ensayo elevado generado.");
      } catch (err) {
        if (!silencioso) {
          toast.error(
            err instanceof Error
              ? err.message
              : isEN
                ? "Could not generate the essay."
                : "No se pudo generar el ensayo.",
          );
        }
      } finally {
        setGenerando(false);
      }
    },
    [evaluacionId, onEnsayoChange, isEN, modoIdeasActual],
  );

  if (!ensayoActual?.texto?.trim()) {
    if (!evaluacionId) return null;
    const enProceso = generando || cargando;
    return (
      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.primary }}
        >
          {isEN ? "Your essay elevated to top band" : "Tu ensayo elevado a banda alta"}
        </div>
        <div className="text-2xl font-semibold leading-tight" style={headingStyle}>
          {isEN
            ? "Comparative version based on your response"
            : "Versión comparativa basada en tu respuesta"}
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
          {enProceso
            ? isEN
              ? "Generating your elevated comparative version. This may take a minute."
              : "Generando tu versión comparativa elevada. Esto puede tardar un minuto."
            : isEN
              ? modoIdeasActual === "ideas_nuevas"
                ? "Generate a complete top-band version with original, persuasive new ideas where your essay needs more depth."
                : "Generate a complete top-band version of your comparative essay, preserving your ideas, voice and comparative argument wherever possible."
              : modoIdeasActual === "ideas_nuevas"
                ? "Genera una versión completa de banda alta con ideas nuevas, originales y persuasivas donde tu ensayo necesite más profundidad."
                : "Genera una versión completa de tu ensayo comparativo en clave de banda alta, conservando tus ideas, tu voz y tu argumento comparativo siempre que sea posible."}
        </p>
        {enProceso ? (
          <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: L.muted }}>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {isEN ? "Generating elevated version" : "Generando versión elevada"}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              className="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left sm:w-auto"
              style={{ backgroundColor: L.bg2, borderColor: L.line }}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-medium" style={{ color: L.ink }}>
                  {isEN ? "New ideas" : "Ideas nuevas"}
                </span>
                <span
                  className="block text-[10px] leading-snug"
                  style={{ ...fontMono, color: L.muted }}
                >
                  {modoIdeasActual === "ideas_nuevas"
                    ? isEN
                      ? "On"
                      : "Activadas"
                    : isEN
                      ? "Keep my voice"
                      : "Mantener mi voz"}
                </span>
              </span>
              <Switch
                checked={modoIdeasActual === "ideas_nuevas"}
                onCheckedChange={(checked) => setModo(checked ? "ideas_nuevas" : "conservar")}
                disabled={generando}
                aria-label={
                  isEN
                    ? "Toggle new ideas in top-band rewrite"
                    : "Activar ideas nuevas en la reescritura de banda alta"
                }
              />
            </label>
            <Button
              type="button"
              className="lib-press rounded-2xl"
              style={ctaPrimary}
              onClick={() => void generarEnsayo()}
              disabled={generando}
            >
              {isEN ? "Generate elevated version" : "Generar versión completa elevada"}
            </Button>
          </div>
        )}
        {enProceso && (
          <div className="mt-4">
            <JuegoEsperaEvaluacion modo="prueba2" />
          </div>
        )}
      </Card>
    );
  }

  const criterios = ensayoActual.criterios_mejorados ?? [];
  const conservado = ensayoActual.que_se_conservo ?? [];
  const transformado = ensayoActual.que_se_transformo ?? [];

  return (
    <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.primary }}
      >
        {isEN ? "Your essay elevated to top band" : "Tu ensayo elevado a banda alta"}
      </div>
      <div className="text-2xl font-semibold leading-tight" style={headingStyle}>
        {isEN
          ? "Comparative version based on your response"
          : "Versión comparativa basada en tu respuesta"}
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm" style={{ color: L.muted }}>
          {ensayoActual.titulo}
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
        {isEN
          ? "This version does not replace your essay. It shows how your own comparative ideas can be developed with greater precision, integration and depth without losing your voice."
          : "Esta versión no sustituye tu ensayo. Muestra cómo tus propias ideas comparativas pueden desarrollarse con más precisión, integración y profundidad sin perder tu voz."}
      </p>

      <details className="group mt-5">
        <summary
          className="lib-press flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden"
          style={{ backgroundColor: L.bg2, borderColor: L.line, color: L.ink }}
        >
          <span>{isEN ? "View elevated version" : "Ver versión completa elevada"}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-open:rotate-180"
            style={{ color: L.muted }}
          />
        </summary>
        <div className="mt-5 border-l-2 pl-4" style={{ borderColor: L.primary + "40" }}>
          <MdProse className="font-serif text-ink" size="base">
            {ensayoActual.texto}
          </MdProse>
        </div>
      </details>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <section className="border-t pt-3" style={{ borderColor: L.line }}>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "What is preserved" : "Se conserva"}
          </div>
          <ListaExplicativa items={conservado} emptyLabel={emptyLabel} />
        </section>
        <section className="border-t pt-3" style={{ borderColor: L.line }}>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "What is transformed" : "Se transforma"}
          </div>
          <ListaExplicativa items={transformado} emptyLabel={emptyLabel} />
        </section>
        {criterios.length > 0 && (
          <section className="border-t pt-3" style={{ borderColor: L.line }}>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Criteria that rise" : "Criterios que suben"}
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed" style={{ color: L.muted }}>
              {criterios.map((item, index) => (
                <div key={`${item.criterio}-${index}`}>
                  <span className="font-semibold" style={{ color: criterioColor[item.criterio] }}>
                    {item.criterio} · {CRITERIO_LABEL[item.criterio]}
                  </span>
                  <span> — {item.mejora}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {ensayoActual.advertencia_uso && (
        <p
          className="mt-5 border-t pt-3 text-xs leading-relaxed"
          style={{ borderColor: L.line, color: L.muted }}
        >
          {ensayoActual.advertencia_uso}
        </p>
      )}
    </Card>
  );
}
