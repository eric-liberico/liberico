import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TextoLectura } from "@/components/TextoLectura";
import type { Evaluacion } from "@/lib/ib";

type EnsayoBanda5Props = {
  ensayo?: Evaluacion["ensayo_banda_5"];
};

const CRITERIO_LABEL: Record<"A" | "B" | "C" | "D", string> = {
  A: "Comprensión",
  B: "Análisis",
  C: "Organización",
  D: "Lenguaje",
};

export function EnsayoBanda5({ ensayo }: EnsayoBanda5Props) {
  if (!ensayo?.texto?.trim()) return null;

  const criterios = ensayo.criterios_mejorados ?? [];
  const conservado = ensayo.que_se_conservo ?? [];
  const transformado = ensayo.que_se_transformo ?? [];

  return (
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Modelo basado en tu respuesta
      </div>
      <div className="font-serif text-xl text-ink leading-tight">
        {ensayo.titulo || "Tu ensayo elevado a banda 5"}
      </div>
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
          <TextoLectura
            texto={ensayo.texto}
            className="font-serif text-[15px] leading-relaxed text-ink"
          />
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

      {ensayo.advertencia_uso && (
        <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {ensayo.advertencia_uso}
        </p>
      )}
    </Card>
  );
}
