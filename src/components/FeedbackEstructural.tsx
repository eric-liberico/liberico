import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Card } from "@/components/ui/card";
import type { LenguajeAnalitico } from "@/lib/ib";

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
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {isEN ? "Weak verbs — improve" : "Verbos débiles — mejorar"}
          </div>
          <div className="space-y-2">
            {lenguaje.verbos_debiles.map((v) => (
              <div key={v.verbo} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    "{v.verbo}" × {v.frecuencia}
                  </span>
                </div>
                <p className="text-xs text-foreground/70 line-through mb-1">{v.ejemplo_original}</p>
                <p className="text-xs text-emerald-700 font-medium">{v.alternativa_mejorada}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verbos fuertes */}
      {lenguaje.verbos_fuertes_usados.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {isEN ? "Strong analytical verbs used" : "Verbos analíticos bien usados"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lenguaje.verbos_fuertes_usados.map((v) => (
              <span
                key={v}
                className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium"
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
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {isEN ? "Adverbs present" : "Adverbios presentes"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lenguaje.adverbios_presentes.map((a) => (
                <span
                  key={a}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {lenguaje.adverbios_sugeridos.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {isEN ? "Suggested adverbs" : "Adverbios sugeridos"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lenguaje.adverbios_sugeridos.map((a) => (
                <span
                  key={a}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800"
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
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            {isEN ? "Common language errors" : "Interferencias del inglés"}
          </div>
          <div className="space-y-2">
            {lenguaje.interferencias_ingles.map((int, i) => (
              <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-[11px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {tipoInterferencia[int.tipo] ?? int.tipo}
                </span>
                <p className="text-xs text-foreground/70 line-through mt-2">
                  "{int.fragmento_original}"
                </p>
                <p className="text-xs text-foreground/60 mt-1">{int.explicacion}</p>
                <p className="text-xs text-emerald-700 font-medium mt-1">→ {int.correccion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lenguaje.valoracion && (
        <p className="text-sm text-foreground/70 leading-relaxed italic">{lenguaje.valoracion}</p>
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
      <Card className="p-5 bg-card border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
          {isEN ? "Analytical language" : "Lenguaje analítico"}
        </div>
        <LenguajeCard lenguaje={lenguaje_analitico} isEN={isEN} />
      </Card>
    </div>
  );
}
