import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import {
  CRITERIOS_ORAL,
  notaIBOral,
  type EvaluacionOral,
  type EstadoElementoOral,
  type PreguntaProfesorOral,
  type ZonaDesarrolloSelfTaught,
} from "@/lib/ib-oral";
import { AlertCircle, CheckCircle2, Clock, HelpCircle, MinusCircle } from "lucide-react";
import { ToastLogro } from "@/components/gamificacion/ToastLogro";
import { GuionAnotadoOral } from "@/components/GuionAnotadoOral";
import type { GamificacionResultado } from "@/lib/ib";
import type { AnotacionOral } from "@/lib/ib-oral";

function BandaCard({
  criterio,
  puntuacion,
  justificacion,
}: {
  criterio: (typeof CRITERIOS_ORAL)[number];
  puntuacion: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {criterio.etiqueta}
          </div>
          <div className="font-serif text-base text-ink leading-tight mt-0.5">{criterio.nombre}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{puntuacion}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {criterio.max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: criterio.max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < puntuacion ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      {justificacion && (
        <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
      )}
    </Card>
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

export function EvaluacionOralPanel({
  ev,
  gamificacion,
  guion,
  anotacionesIniciales,
  onAnotacionesChange,
}: {
  ev: EvaluacionOral;
  gamificacion?: GamificacionResultado;
  guion?: string;
  anotacionesIniciales?: AnotacionOral[] | null;
  onAnotacionesChange?: (a: AnotacionOral[]) => void;
}) {
  const notaIB = notaIBOral(ev.puntuacion_total);
  const esTaught = ev.tipo_oral === "taught";
  const objetivoMin = esTaught ? 10 : 15;
  const duracion = ev.duracion_estimada_minutos;
  const excedeTiempo = duracion > objetivoMin + 0.5;
  const bajoDeTiempo = duracion < objetivoMin - 1.5;

  return (
    <div className="space-y-6">
      <ToastLogro gamificacion={gamificacion} />

      {/* ── Header ── */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Oral Individual</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {esTaught ? (
                <Badge className="text-[11px] border-white/30 text-white/90 bg-white/10">
                  Alumno con profesor
                </Badge>
              ) : (
                <Badge className="text-[11px] border-white/30 text-white/90 bg-white/10">
                  Self-taught / SSST
                </Badge>
              )}
              <div className="flex items-center gap-1 text-[11px] opacity-70">
                <Clock className="h-3 w-3" />
                ~{duracion} min · objetivo {esTaught ? "10+5 min" : "15 min"}
              </div>
              {excedeTiempo && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Excede el tiempo
                </div>
              )}
              {bajoDeTiempo && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Guion corto
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {ev.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 40</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">{notaIB}</span>
              </div>
            </div>
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

      {/* ── Fortalezas y áreas de mejora ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {ev.fortalezas && (
          <Card className="p-4 bg-emerald-50/40 border-emerald-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
              Fortalezas
            </div>
            <MdProse>{ev.fortalezas}</MdProse>
          </Card>
        )}
        {ev.areas_mejora && (
          <Card className="p-4 bg-amber-50/40 border-amber-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mb-2">
              Áreas de mejora
            </div>
            <MdProse>{ev.areas_mejora}</MdProse>
          </Card>
        )}
      </div>

      {/* ── Comentario global ── */}
      {ev.comentario_global && (
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-2">
            Comentario global
          </div>
          <MdProse size="base">{ev.comentario_global}</MdProse>
        </Card>
      )}

      {/* ── Guion evaluado (anotado) ── */}
      {guion && (
        <GuionAnotadoOral
          guion={guion}
          evaluacionId={ev.evaluacion_id}
          anotacionesIniciales={anotacionesIniciales ?? ev.anotaciones}
          onAnotacionesChange={onAnotacionesChange}
        />
      )}

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

    </div>
  );
}
