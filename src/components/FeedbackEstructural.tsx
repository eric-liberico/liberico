import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Card } from "@/components/ui/card";
import type { LenguajeAnalitico } from "@/lib/ib";
import {
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
} as const;

const softCardStyle = {
  backgroundColor: L.bg2,
  borderColor: L.line,
} as const;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const TIPO_INTERFERENCIA_ES: Record<string, string> = {
  gerundio: "Gerundio",
  como_que: "Como/Que",
  calco_sintactico: "Calco sintáctico",
  estructura_traducida: "Estructura traducida",
  orden_palabras: "Orden de palabras",
  otro: "Otro",
};

const TIPO_INTERFERENCIA_EN: Record<string, string> = {
  gerundio: "Gerund misuse",
  como_que: "Like/that overuse",
  calco_sintactico: "Syntactic calque",
  estructura_traducida: "Translated structure",
  orden_palabras: "Word order",
  otro: "Other",
};

function LenguajeCard({ lenguaje, isEN }: { lenguaje: LenguajeAnalitico; isEN: boolean }) {
  const tipoInterferencia = isEN ? TIPO_INTERFERENCIA_EN : TIPO_INTERFERENCIA_ES;

  return (
    <div className="space-y-5">
      {/* Verbos débiles */}
      {lenguaje.verbos_debiles.length > 0 && (
        <div>
          <div
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.amberDeep }}
          >
            {isEN ? "Weak verbs — improve" : "Verbos débiles — mejorar"}
          </div>
          <div className="space-y-2">
            {lenguaje.verbos_debiles.map((v) => (
              <div
                key={v.verbo}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: L.amber + "12",
                  borderColor: L.amber + "4d",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ ...fontMono, backgroundColor: L.amber + "1f", color: L.amberDeep }}
                  >
                    "{v.verbo}" × {v.frecuencia}
                  </span>
                </div>
                <p className="mb-1 text-xs line-through" style={{ color: L.muted }}>
                  {v.ejemplo_original}
                </p>
                <p className="text-xs font-medium" style={{ color: L.ok }}>
                  {v.alternativa_mejorada}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verbos fuertes */}
      {lenguaje.verbos_fuertes_usados.length > 0 && (
        <div>
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Strong analytical verbs used" : "Verbos analíticos bien usados"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lenguaje.verbos_fuertes_usados.map((v) => (
              <span
                key={v}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: L.ok + "14", color: L.ok }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Adverbios */}
      <div className="grid sm:grid-cols-2 gap-4">
        {lenguaje.adverbios_presentes.length > 0 && (
          <div>
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Adverbs present" : "Adverbios presentes"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lenguaje.adverbios_presentes.map((a) => (
                <span
                  key={a}
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ backgroundColor: L.primary + "12", color: L.primary }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {lenguaje.adverbios_sugeridos.length > 0 && (
          <div>
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Suggested adverbs" : "Adverbios sugeridos"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lenguaje.adverbios_sugeridos.map((a) => (
                <span
                  key={a}
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ backgroundColor: L.primary + "0f", color: L.primary }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interferencias del inglés */}
      {lenguaje.interferencias_ingles.length > 0 && (
        <div>
          <div
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: "#B91C1C" }}
          >
            {isEN ? "Common language errors" : "Interferencias del inglés"}
          </div>
          <div className="space-y-2">
            {lenguaje.interferencias_ingles.map((int, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4"
                style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}
              >
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
                >
                  {tipoInterferencia[int.tipo] ?? int.tipo}
                </span>
                <p className="mt-2 text-xs line-through" style={{ color: L.muted }}>
                  "{int.fragmento_original}"
                </p>
                <p className="mt-1 text-xs" style={{ color: L.muted }}>
                  {int.explicacion}
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: L.ok }}>
                  → {int.correccion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lenguaje.valoracion && (
        <p className="text-sm leading-relaxed italic" style={{ color: L.muted }}>
          {lenguaje.valoracion}
        </p>
      )}
    </div>
  );
}

export function FeedbackEstructural({
  lenguaje_analitico,
}: {
  lenguaje_analitico?: LenguajeAnalitico;
}) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  if (!lenguaje_analitico) return null;

  return (
    <div className="space-y-6">
      {/* Lenguaje analítico */}
      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.primary }}
        >
          {isEN ? "Analytical language" : "Lenguaje analítico"}
        </div>
        <h3 className="mb-5 text-2xl font-semibold leading-tight" style={headingStyle}>
          {isEN ? "Precision and register" : "Precisión y registro"}
        </h3>
        <LenguajeCard lenguaje={lenguaje_analitico} isEN={isEN} />
      </Card>
    </div>
  );
}
