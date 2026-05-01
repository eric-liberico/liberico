import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdProse } from "@/components/MdProse";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import type { Evaluacion } from "@/lib/ib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

type EnsayoBanda5Props = {
  ensayo?: Evaluacion["ensayo_banda_5"];
  evaluacionId?: string | null;
  onEnsayoChange?: (ensayo: Evaluacion["ensayo_banda_5"]) => void;
};

const CRITERIO_LABEL: Record<"A" | "B" | "C" | "D", string> = {
  A: "Comprensión",
  B: "Análisis",
  C: "Organización",
  D: "Lenguaje",
};

export function EnsayoBanda5({ ensayo, evaluacionId, onEnsayoChange }: EnsayoBanda5Props) {
  const [ensayoActual, setEnsayoActual] = useState(ensayo);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    setEnsayoActual(ensayo);
  }, [ensayo]);

  const generarEnsayo = async () => {
    if (!evaluacionId) {
      toast.error("Guarda primero la evaluación para generar el ensayo de banda 5.");
      return;
    }

    setGenerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-band5-essay", {
        body: { evaluacion_id: evaluacionId },
      });

      if (error) {
        throw new Error(await getFunctionErrorMessage(error, "No se pudo generar el ensayo."));
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.ensayo_banda_5?.texto) {
        throw new Error("La IA no devolvió una versión de banda 5 válida.");
      }

      setEnsayoActual(data.ensayo_banda_5);
      onEnsayoChange?.(data.ensayo_banda_5);
      toast.success("Ensayo de banda 5 generado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el ensayo.");
    } finally {
      setGenerando(false);
    }
  };

  if (!ensayoActual?.texto?.trim()) {
    if (!evaluacionId) return null;

    return (
      <Card className="p-5 bg-card border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Tu ensayo elevado a banda 5
        </div>
        <div className="font-serif text-xl text-ink leading-tight">
          Versión completa basada en tu respuesta
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          Genera una versión completa de tu ensayo en clave de banda alta, conservando tus ideas, tu
          voz y la estructura de tu respuesta siempre que sea posible.
        </p>
        <Button className="mt-4" onClick={generarEnsayo} disabled={generando}>
          {generando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando versión de banda 5
            </>
          ) : (
            "Generar versión completa de banda 5"
          )}
        </Button>
        {generando && (
          <div className="mt-4">
            <JuegoEsperaEvaluacion modo="prueba1" />
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
        Tu ensayo elevado a banda 5
      </div>
      <div className="font-serif text-xl text-ink leading-tight">
        Versión completa basada en tu respuesta
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm text-muted-foreground">{ensayoActual.titulo}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
        Esta versión no sustituye tu análisis. Muestra cómo tus propias ideas pueden desarrollarse
        con más precisión, foco y profundidad sin perder tu voz.
      </p>

      <details className="group mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Ver versión completa de banda 5</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-5 border-l-2 border-primary/25 pl-4">
          <MdProse className="font-serif text-ink" size="base">
            {ensayoActual.texto}
          </MdProse>
        </div>
      </details>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {conservado.length > 0 && (
          <section className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Se conserva
            </div>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground/75">
              {conservado.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {transformado.length > 0 && (
          <section className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Se transforma
            </div>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground/75">
              {transformado.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {criterios.length > 0 && (
          <section className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Criterios que suben
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
