import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import type { Evaluacion } from "@/lib/ib";

type EnsayoBanda5Props = {
  ensayo?: Evaluacion["ensayo_banda_5"];
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

export function EnsayoBanda5({ ensayo }: EnsayoBanda5Props) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const [ensayoActual, setEnsayoActual] = useState(ensayo);

  const CRITERIO_LABEL: Record<"A" | "B" | "C" | "D", string> = {
    A: isEN ? "Understanding" : "Comprensión",
    B: isEN ? "Analysis" : "Análisis",
    C: isEN ? "Organisation" : "Organización",
    D: isEN ? "Language" : "Lenguaje",
  };

  useEffect(() => {
    setEnsayoActual(ensayo);
  }, [ensayo]);

  if (!ensayoActual?.texto?.trim()) {
    return null;
  }

  const criterios = ensayoActual.criterios_mejorados ?? [];
  const conservado = ensayoActual.que_se_conservo ?? [];
  const transformado = ensayoActual.que_se_transformo ?? [];
  const emptyLabel = isEN
    ? "No data saved for this section."
    : "No hay datos guardados para este apartado.";

  return (
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {isEN ? "Your analysis elevated to top band" : "Tu ensayo elevado a banda 5"}
      </div>
      <div className="font-serif text-xl text-ink leading-tight">
        {isEN
          ? "Complete version based on your response"
          : "Versión completa basada en tu respuesta"}
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm text-muted-foreground">{ensayoActual.titulo}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
        {isEN
          ? "This version does not replace your analysis. It shows how your own ideas can be developed with greater precision, focus and depth without losing your voice."
          : "Esta versión no sustituye tu análisis. Muestra cómo tus propias ideas pueden desarrollarse con más precisión, foco y profundidad sin perder tu voz."}
      </p>

      <details className="group mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>{isEN ? "View top-band version" : "Ver versión completa de banda 5"}</span>
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
