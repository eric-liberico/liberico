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
    return <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground/75">
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
        const { data, error } = await supabase.functions.invoke("generate-band5-essay-p2", {
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
      <Card className="p-5 bg-card border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          {isEN ? "Your essay elevated to top band" : "Tu ensayo elevado a banda alta"}
        </div>
        <div className="font-serif text-xl text-ink leading-tight">
          {isEN
            ? "Comparative version based on your response"
            : "Versión comparativa basada en tu respuesta"}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
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
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEN ? "Generating elevated version" : "Generando versión elevada"}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left sm:w-auto">
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-foreground">
                  {isEN ? "New ideas" : "Ideas nuevas"}
                </span>
                <span className="block text-[10px] leading-snug text-muted-foreground">
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
            <Button onClick={() => void generarEnsayo()} disabled={generando}>
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
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {isEN ? "Your essay elevated to top band" : "Tu ensayo elevado a banda alta"}
      </div>
      <div className="font-serif text-xl text-ink leading-tight">
        {isEN
          ? "Comparative version based on your response"
          : "Versión comparativa basada en tu respuesta"}
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm text-muted-foreground">{ensayoActual.titulo}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
        {isEN
          ? "This version does not replace your essay. It shows how your own comparative ideas can be developed with greater precision, integration and depth without losing your voice."
          : "Esta versión no sustituye tu ensayo. Muestra cómo tus propias ideas comparativas pueden desarrollarse con más precisión, integración y profundidad sin perder tu voz."}
      </p>

      <details className="group mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>{isEN ? "View elevated version" : "Ver versión completa elevada"}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-l-2 border-primary/25 pl-4">
          <MdProse className="font-serif text-ink" size="base">
            {ensayoActual.texto}
          </MdProse>
        </div>
      </details>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <section className="border-t border-border pt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEN ? "What is preserved" : "Se conserva"}
          </div>
          <ListaExplicativa items={conservado} emptyLabel={emptyLabel} />
        </section>
        <section className="border-t border-border pt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEN ? "What is transformed" : "Se transforma"}
          </div>
          <ListaExplicativa items={transformado} emptyLabel={emptyLabel} />
        </section>
        {criterios.length > 0 && (
          <section className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {isEN ? "Criteria that rise" : "Criterios que suben"}
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/75">
              {criterios.map((item, index) => (
                <div key={`${item.criterio}-${index}`}>
                  <span className="font-semibold text-primary">
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
        <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {ensayoActual.advertencia_uso}
        </p>
      )}
    </Card>
  );
}
