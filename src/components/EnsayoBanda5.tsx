import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import type { Evaluacion } from "@/lib/ib";
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

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const criterioColor: Record<"A" | "B" | "C" | "D", string> = {
  A: CRIT.A,
  B: CRIT.B,
  C: CRIT.C,
  D: CRIT.D,
};

type EnsayoBanda5Props = {
  ensayo?: Evaluacion["ensayo_banda_5"];
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
    <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.primary }}
      >
        {isEN ? "Your analysis elevated to top band" : "Tu ensayo elevado a banda alta"}
      </div>
      <div className="text-2xl font-semibold leading-tight" style={headingStyle}>
        {isEN
          ? "Complete version based on your response"
          : "Versión completa basada en tu respuesta"}
      </div>
      {ensayoActual.titulo && (
        <p className="mt-1 text-sm" style={{ color: L.muted }}>
          {ensayoActual.titulo}
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
        {isEN
          ? "This version does not replace your analysis. It shows how your own ideas can be developed with greater precision, focus and depth without losing your voice."
          : "Esta versión no sustituye tu análisis. Muestra cómo tus propias ideas pueden desarrollarse con más precisión, foco y profundidad sin perder tu voz."}
      </p>

      <details className="group mt-5">
        <summary
          className="lib-press flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden"
          style={{ backgroundColor: L.bg2, borderColor: L.line, color: L.ink }}
        >
          <span>{isEN ? "View top-band version" : "Ver versión completa de banda alta"}</span>
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
