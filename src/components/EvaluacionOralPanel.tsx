import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CRITERIOS_ORAL,
  notaIBOral,
  type EvaluacionOral,
  type EstadoElementoOral,
  type PreguntaProfesorOral,
  type ZonaDesarrolloSelfTaught,
} from "@/lib/ib-oral";
import { AlertCircle, CheckCircle2, Clock, HelpCircle, MinusCircle } from "lucide-react";

const COLORES_CRITERIO: Record<string, string> = {
  a: "bg-blue-50 border-blue-200 text-blue-800",
  b: "bg-violet-50 border-violet-200 text-violet-800",
  c: "bg-amber-50 border-amber-200 text-amber-800",
  d: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

const BARRA_CRITERIO: Record<string, string> = {
  a: "bg-blue-500",
  b: "bg-violet-500",
  c: "bg-amber-500",
  d: "bg-emerald-500",
};

function BandaCard({
  criterio,
  puntuacion,
  justificacion,
}: {
  criterio: (typeof CRITERIOS_ORAL)[number];
  puntuacion: number;
  justificacion: string;
}) {
  const pct = Math.round((puntuacion / criterio.max) * 100);
  return (
    <div className={cn("rounded-lg border p-4 space-y-3", COLORES_CRITERIO[criterio.key])}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">
            Criterio {criterio.etiqueta}
          </span>
          <p className="font-medium text-[13px] mt-0.5">{criterio.nombre}</p>
        </div>
        <div className="text-right">
          <span className="font-serif text-2xl font-semibold">{puntuacion}</span>
          <span className="text-[12px] opacity-60">/{criterio.max}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-black/10">
        <div
          className={cn("h-full rounded-full transition-all", BARRA_CRITERIO[criterio.key])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {justificacion && <p className="text-[12px] opacity-80 leading-relaxed">{justificacion}</p>}
    </div>
  );
}

function EstadoIcon({ estado }: { estado: EstadoElementoOral["estado"] }) {
  if (estado === "presente")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
  if (estado === "parcial")
    return <MinusCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
  return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
}

function EstadoBadge({ estado }: { estado: EstadoElementoOral["estado"] }) {
  if (estado === "presente")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-normal">
        Presente
      </Badge>
    );
  if (estado === "parcial")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-normal">
        Parcial
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-normal">
      Ausente
    </Badge>
  );
}

function DiagnosticoItem({ etiqueta, el }: { etiqueta: string; el: EstadoElementoOral }) {
  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <EstadoIcon estado={el.estado} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-foreground">{etiqueta}</span>
          <EstadoBadge estado={el.estado} />
        </div>
        {el.fragmento && (
          <p className="text-[12px] text-muted-foreground italic">«{el.fragmento}»</p>
        )}
        <p className="text-[12px] text-foreground/75">{el.evaluacion}</p>
        {el.sugerencia && <p className="text-[12px] text-primary">{el.sugerencia}</p>}
      </div>
    </div>
  );
}

function PreguntaProfesorItem({ pq, idx }: { pq: PreguntaProfesorOral; idx: number }) {
  return (
    <div className="p-4 border rounded-lg space-y-2 bg-background">
      <div className="flex gap-2 items-start">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0 mt-0.5">
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium text-foreground">{pq.pregunta}</p>
      </div>
      <div className="pl-7 space-y-1">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground/80">Propósito: </span>
          {pq.proposito}
        </p>
        <p className="text-[12px] text-primary leading-relaxed">
          <span className="font-medium">Cómo responder: </span>
          {pq.como_responder}
        </p>
      </div>
    </div>
  );
}

function ZonaDesarrolloItem({ zona, idx }: { zona: ZonaDesarrolloSelfTaught; idx: number }) {
  return (
    <div className="p-4 border border-amber-200 rounded-lg bg-amber-50/40 space-y-1.5">
      <div className="flex gap-2 items-start">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-[10px] font-semibold shrink-0 mt-0.5">
          {idx + 1}
        </span>
        <p className="text-[13px] font-medium text-foreground">{zona.zona}</p>
      </div>
      <div className="pl-7 space-y-1">
        <p className="text-[12px] text-foreground/75">{zona.problema}</p>
        <p className="text-[12px] text-amber-800 leading-relaxed">{zona.sugerencia}</p>
      </div>
    </div>
  );
}

export function EvaluacionOralPanel({ ev }: { ev: EvaluacionOral }) {
  const notaIB = notaIBOral(ev.puntuacion_total);
  const esTaught = ev.tipo_oral === "taught";
  const objetivoMin = esTaught ? 10 : 15;
  const duracion = ev.duracion_estimada_minutos;
  const excedeTiempo = duracion > objetivoMin + 0.5;
  const bajoDeTiempo = duracion < objetivoMin - 1.5;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Resultado · Oral Individual
        </div>

        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-5xl font-semibold text-ink">
                {ev.puntuacion_total}
              </span>
              <span className="text-lg text-muted-foreground font-normal">/40</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-serif text-xl text-foreground/80">
                Nota IB estimada: <span className="text-primary font-semibold">{notaIB}</span>
                <span className="text-sm text-muted-foreground font-normal"> /7</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 text-right">
            <div>
              {esTaught ? (
                <Badge variant="outline" className="text-[11px]">
                  Alumno con profesor
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px]">
                  Self-taught / SSST
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 justify-end text-[12px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>~{duracion} min estimados</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              objetivo:{" "}
              {esTaught ? "10 min exposición + 5 min preguntas" : "15 min exposición continua"}
            </div>
            {excedeTiempo && (
              <div className="flex items-center gap-1 justify-end text-[11px] text-amber-700">
                <AlertCircle className="h-3 w-3" />
                El guion excede el tiempo de exposición
              </div>
            )}
            {bajoDeTiempo && (
              <div className="flex items-center gap-1 justify-end text-[11px] text-amber-700">
                <AlertCircle className="h-3 w-3" />
                El guion queda corto para el tiempo disponible
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Criterios A B C D ── */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Criterios
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CRITERIOS_ORAL.map((c) => (
            <BandaCard
              key={c.key}
              criterio={c}
              puntuacion={ev[`criterio_${c.key}` as `criterio_${typeof c.key}`]}
              justificacion={ev[`justificacion_${c.key}` as `justificacion_${typeof c.key}`]}
            />
          ))}
        </div>
      </div>

      {/* ── Diagnóstico del asunto global ── */}
      {ev.diagnostico_asunto_global && (
        <Card className="p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Diagnóstico
          </div>
          <p className="font-medium text-[14px] text-foreground mb-3">Asunto global</p>
          <DiagnosticoItem
            etiqueta="Definición del asunto global"
            el={ev.diagnostico_asunto_global.definicion}
          />
          <DiagnosticoItem
            etiqueta="Especificidad"
            el={ev.diagnostico_asunto_global.especificidad}
          />
          <DiagnosticoItem
            etiqueta="Uso como lente articuladora"
            el={ev.diagnostico_asunto_global.uso_como_lente}
          />
        </Card>
      )}

      {/* ── Diagnóstico de equilibrio ── */}
      {ev.diagnostico_equilibrio && (
        <Card className="p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Diagnóstico
          </div>
          <p className="font-medium text-[14px] text-foreground mb-3">
            Equilibrio extractos y obras
          </p>
          <DiagnosticoItem etiqueta="Extracto 1" el={ev.diagnostico_equilibrio.extracto_1} />
          <DiagnosticoItem etiqueta="Obra 1 (completa)" el={ev.diagnostico_equilibrio.obra_1} />
          <DiagnosticoItem etiqueta="Extracto 2" el={ev.diagnostico_equilibrio.extracto_2} />
          <DiagnosticoItem etiqueta="Obra 2 (completa)" el={ev.diagnostico_equilibrio.obra_2} />
        </Card>
      )}

      {/* ── Diagnóstico de estructura ── */}
      {ev.diagnostico_estructura && (
        <Card className="p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Diagnóstico
          </div>
          <p className="font-medium text-[14px] text-foreground mb-3">Estructura</p>
          <DiagnosticoItem etiqueta="Apertura" el={ev.diagnostico_estructura.apertura} />
          <DiagnosticoItem etiqueta="Progresión" el={ev.diagnostico_estructura.progresion} />
          <DiagnosticoItem etiqueta="Transiciones" el={ev.diagnostico_estructura.transiciones} />
          <DiagnosticoItem etiqueta="Cierre" el={ev.diagnostico_estructura.cierre} />
        </Card>
      )}

      {/* ── Preguntas del profesor (taught) ── */}
      {esTaught && ev.preguntas_profesor && ev.preguntas_profesor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Preguntas probables del profesor
            </div>
          </div>
          {ev.preguntas_profesor.map((pq, i) => (
            <PreguntaProfesorItem key={i} pq={pq} idx={i} />
          ))}
        </div>
      )}

      {/* ── Zonas de desarrollo (self-taught) ── */}
      {!esTaught &&
        ev.zonas_desarrollo_self_taught &&
        ev.zonas_desarrollo_self_taught.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Zonas que debes desarrollar en tus 15 minutos
              </div>
            </div>
            {ev.zonas_desarrollo_self_taught.map((z, i) => (
              <ZonaDesarrolloItem key={i} zona={z} idx={i} />
            ))}
          </div>
        )}

      {/* ── Fortalezas y áreas de mejora ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {ev.fortalezas && (
          <Card className="p-4 bg-emerald-50/40 border-emerald-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
              Fortalezas
            </div>
            <p className="text-[13px] text-foreground/80 leading-relaxed">{ev.fortalezas}</p>
          </Card>
        )}
        {ev.areas_mejora && (
          <Card className="p-4 bg-amber-50/40 border-amber-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mb-2">
              Áreas de mejora
            </div>
            <p className="text-[13px] text-foreground/80 leading-relaxed">{ev.areas_mejora}</p>
          </Card>
        )}
      </div>

      {/* ── Comentario global ── */}
      {ev.comentario_global && (
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-2">
            Comentario global
          </div>
          <p className="text-[14px] text-foreground/85 leading-relaxed">{ev.comentario_global}</p>
        </Card>
      )}
    </div>
  );
}
