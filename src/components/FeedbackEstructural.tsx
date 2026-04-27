import { Card } from "@/components/ui/card";
import type {
  ElementoEstructural,
  SeccionEstructural,
  ParrafoAnalisis,
  LenguajeAnalitico,
} from "@/lib/ib";

const ESTADO_CONFIG = {
  presente: {
    label: "Presente",
    icon: "✓",
    bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  parcial: {
    label: "Parcial",
    icon: "⚠",
    bg: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  ausente: {
    label: "Ausente",
    icon: "✗",
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
  },
} as const;

// Elementos donde "presente" es un defecto (semántica invertida)
const ELEMENTOS_INVERTIDOS = new Set(["nueva_informacion"]);

const NIVEL_CONFIG = {
  descripcion: { label: "Descripción", step: 1, color: "bg-slate-400" },
  analisis: { label: "Análisis", step: 2, color: "bg-blue-500" },
  interpretacion: { label: "Interpretación", step: 3, color: "bg-violet-500" },
  evaluacion: { label: "Evaluación", step: 4, color: "bg-emerald-500" },
} as const;

const TIPO_INTERFERENCIA: Record<string, string> = {
  gerundio: "Gerundio",
  como_que: "Como/Que",
  calco_sintactico: "Calco sintáctico",
  estructura_traducida: "Estructura traducida",
  orden_palabras: "Orden de palabras",
  otro: "Otro",
};

function ElementoCard({ el }: { el: ElementoEstructural }) {
  const invertido = ELEMENTOS_INVERTIDOS.has(el.tipo);
  // Para elementos invertidos: "presente" = defecto (rojo), "ausente" = correcto (verde)
  const estadoVisual: ElementoEstructural["estado"] = invertido
    ? el.estado === "presente"
      ? "ausente"
      : el.estado === "ausente"
        ? "presente"
        : "parcial"
    : el.estado;
  const cfg = ESTADO_CONFIG[estadoVisual];
  const esDefecto = invertido && el.estado === "presente";
  return (
    <div className={`rounded-lg border p-3 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-foreground/70 capitalize">
          {el.tipo.replace(/_/g, " ")}
        </span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge} shrink-0`}
        >
          {cfg.icon} {invertido ? (esDefecto ? "Defecto" : "Correcto") : cfg.label}
        </span>
      </div>
      {el.fragmento && (
        <blockquote className="text-xs italic text-foreground/60 border-l-2 border-current pl-2 mb-2 line-clamp-2">
          "{el.fragmento}"
        </blockquote>
      )}
      <p className="text-xs text-foreground/80 leading-relaxed mb-1">{el.evaluacion}</p>
      {estadoVisual !== "presente" && el.sugerencia && (
        <p className="text-xs text-foreground/60 leading-relaxed mt-1">
          <span className="font-medium">Sugerencia:</span> {el.sugerencia}
        </p>
      )}
    </div>
  );
}

function NivelIndicator({ nivel }: { nivel: ParrafoAnalisis["nivel_analisis"] }) {
  const cfg = NIVEL_CONFIG[nivel];
  const steps = ["descripcion", "analisis", "interpretacion", "evaluacion"] as const;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 w-6 rounded-full ${i < cfg.step ? cfg.color : "bg-border"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-foreground/60">{cfg.label}</span>
    </div>
  );
}

function SeccionCard({ titulo, seccion }: { titulo: string; seccion: SeccionEstructural }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {titulo}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        {seccion.elementos.map((el) => (
          <ElementoCard key={el.tipo} el={el} />
        ))}
      </div>
      {seccion.valoracion && (
        <p className="text-sm text-foreground/70 leading-relaxed italic">{seccion.valoracion}</p>
      )}
    </div>
  );
}

function ParrafoCard({ parrafo }: { parrafo: ParrafoAnalisis }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Párrafo {parrafo.numero}
          </span>
          {parrafo.extracto_inicio && (
            <p className="text-xs italic text-foreground/50 mt-0.5 line-clamp-1">
              "{parrafo.extracto_inicio}…"
            </p>
          )}
        </div>
        <NivelIndicator nivel={parrafo.nivel_analisis} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        {parrafo.elementos.map((el) => (
          <ElementoCard key={el.tipo} el={el} />
        ))}
      </div>
      {parrafo.sugerencia_global && (
        <p className="text-xs text-foreground/65 leading-relaxed border-t border-border pt-2 mt-1">
          {parrafo.sugerencia_global}
        </p>
      )}
    </div>
  );
}

function LenguajeCard({ lenguaje }: { lenguaje: LenguajeAnalitico }) {
  return (
    <div className="space-y-5">
      {/* Verbos débiles */}
      {lenguaje.verbos_debiles.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Verbos débiles — mejorar
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
            Verbos analíticos bien usados
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
              Adverbios presentes
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
              Adverbios sugeridos
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
            Interferencias del inglés
          </div>
          <div className="space-y-2">
            {lenguaje.interferencias_ingles.map((int, i) => (
              <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <span className="text-[11px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {TIPO_INTERFERENCIA[int.tipo] ?? int.tipo}
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
  introduccion,
  parrafos,
  conclusion,
  lenguaje_analitico,
}: {
  introduccion?: SeccionEstructural;
  parrafos?: ParrafoAnalisis[];
  conclusion?: SeccionEstructural;
  lenguaje_analitico?: LenguajeAnalitico;
}) {
  if (!introduccion && !parrafos && !conclusion && !lenguaje_analitico) return null;

  return (
    <div className="space-y-6">
      {/* Análisis estructural */}
      {(introduccion || parrafos || conclusion) && (
        <Card className="p-5 bg-card border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
            Análisis estructural
          </div>
          <div className="space-y-6">
            {introduccion && <SeccionCard titulo="Introducción" seccion={introduccion} />}
            {parrafos && parrafos.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Cuerpo del ensayo
                </div>
                <div className="space-y-3">
                  {parrafos.map((p) => (
                    <ParrafoCard key={p.numero} parrafo={p} />
                  ))}
                </div>
              </div>
            )}
            {conclusion && <SeccionCard titulo="Conclusión" seccion={conclusion} />}
          </div>
        </Card>
      )}

      {/* Lenguaje analítico */}
      {lenguaje_analitico && (
        <Card className="p-5 bg-card border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
            Lenguaje analítico
          </div>
          <LenguajeCard lenguaje={lenguaje_analitico} />
        </Card>
      )}
    </div>
  );
}
