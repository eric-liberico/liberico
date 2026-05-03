import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdProse } from "@/components/MdProse";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import type { EnsayoBanda5Prueba2 as TEnsayoBanda5Prueba2 } from "@/lib/ib-paper2";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

type Props = {
  ensayo?: TEnsayoBanda5Prueba2 | null;
  evaluacionId?: string | null;
  autoGenerar?: boolean;
  onEnsayoChange?: (ensayo: TEnsayoBanda5Prueba2) => void;
};

const CRITERIO_LABEL: Record<"A" | "B1" | "B2" | "C" | "D", string> = {
  A: "Conocimiento",
  B1: "Análisis formal",
  B2: "Comparación",
  C: "Organización",
  D: "Lenguaje",
};

function ListaExplicativa({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        No hay datos guardados para este apartado.
      </p>
    );
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
  autoGenerar = false,
  onEnsayoChange,
}: Props) {
  const [ensayoActual, setEnsayoActual] = useState(ensayo);
  const [generando, setGenerando] = useState(false);
  const autoIntentadoRef = useRef(false);

  useEffect(() => {
    setEnsayoActual(ensayo);
  }, [ensayo]);

  useEffect(() => {
    autoIntentadoRef.current = false;
  }, [evaluacionId]);

  const generarEnsayo = useCallback(
    async (silencioso = false) => {
      if (!evaluacionId) {
        if (!silencioso)
          toast.error("Guarda primero la evaluación para generar el ensayo elevado.");
        return;
      }

      setGenerando(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-band5-essay-p2", {
          body: { evaluacion_id: evaluacionId },
        });

        if (error) {
          throw new Error(await getFunctionErrorMessage(error, "No se pudo generar el ensayo."));
        }
        if (data?.error) throw new Error(data.error);
        if (!data?.ensayo_banda_5?.texto) {
          throw new Error("La IA no devolvió una versión de banda alta válida.");
        }

        const resultado = data.ensayo_banda_5 as TEnsayoBanda5Prueba2;
        setEnsayoActual(resultado);
        onEnsayoChange?.(resultado);
        if (!silencioso) toast.success("Ensayo elevado generado.");
      } catch (err) {
        if (!silencioso) {
          toast.error(err instanceof Error ? err.message : "No se pudo generar el ensayo.");
        }
      } finally {
        setGenerando(false);
      }
    },
    [evaluacionId, onEnsayoChange],
  );

  useEffect(() => {
    if (
      !autoGenerar ||
      !evaluacionId ||
      ensayoActual?.texto?.trim() ||
      generando ||
      autoIntentadoRef.current
    ) {
      return;
    }
    autoIntentadoRef.current = true;
    void generarEnsayo(true);
  }, [autoGenerar, ensayoActual?.texto, evaluacionId, generando, generarEnsayo]);

  if (!ensayoActual?.texto?.trim()) {
    if (!evaluacionId) return null;

    return (
      <Card className="p-5 bg-card border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Tu ensayo elevado a banda alta
        </div>
        <div className="font-serif text-xl text-ink leading-tight">
          Versión comparativa basada en tu respuesta
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          Genera una versión completa de tu ensayo comparativo en clave de banda alta, conservando
          tus ideas, tu voz y tu argumento comparativo siempre que sea posible.
        </p>
        {!autoGenerar && (
          <Button className="mt-4" onClick={() => void generarEnsayo()} disabled={generando}>
            {generando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando versión elevada
              </>
            ) : (
              "Generar versión completa elevada"
            )}
          </Button>
        )}
        {generando && (
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
        Tu ensayo elevado a banda alta
      </div>
      <div className="font-serif text-xl text-ink leading-tight">
        Versión comparativa basada en tu respuesta
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm text-muted-foreground">{ensayoActual.titulo}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
        Esta versión no sustituye tu ensayo. Muestra cómo tus propias ideas comparativas pueden
        desarrollarse con más precisión, integración y profundidad sin perder tu voz.
      </p>

      <details className="group mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Ver versión completa elevada</span>
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
            Se conserva
          </div>
          <ListaExplicativa items={conservado} />
        </section>

        <section className="border-t border-border pt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Se transforma
          </div>
          <ListaExplicativa items={transformado} />
        </section>

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
