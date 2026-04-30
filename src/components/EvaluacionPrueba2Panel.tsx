import { Card } from "@/components/ui/card";
import type { AnotacionPrueba2, EstadoElementoPrueba2, EvaluacionPrueba2 } from "@/lib/ib-paper2";
import { CRITERIOS_PRUEBA2, notaIBPrueba2 } from "@/lib/ib-paper2";
import { EnsayoAnotadoPrueba2 } from "@/components/EnsayoAnotadoPrueba2";
import { EnsayoBanda5Prueba2 } from "@/components/EnsayoBanda5Prueba2";

function BandaCard({
  etiqueta,
  nombre,
  valor,
  max,
  justificacion,
}: {
  etiqueta: string;
  nombre: string;
  valor: number;
  max: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {etiqueta}
          </div>
          <div className="font-serif text-base text-ink leading-tight mt-0.5">{nombre}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{valor}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < valor ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
    </Card>
  );
}

const ESTADO_STYLES = {
  presente: "text-emerald-700 bg-emerald-50 border-emerald-200",
  parcial: "text-amber-700 bg-amber-50 border-amber-200",
  ausente: "text-rose-700 bg-rose-50 border-rose-200",
} as const;

const ESTADO_LABELS = {
  presente: "Presente",
  parcial: "Parcial",
  ausente: "Ausente",
} as const;

const DIAGNOSTICO_ETIQUETAS: Record<keyof EvaluacionPrueba2["diagnostico_comparativo"], string> = {
  tesis_comparativa: "Tesis comparativa",
  equilibrio_obras: "Equilibrio entre obras",
  respuesta_pregunta: "Respuesta a la pregunta",
  uso_evidencia: "Uso de evidencia",
  comparacion_integrada: "Comparación integrada",
};

function DiagnosticoItem({
  etiqueta,
  elemento,
}: {
  etiqueta: string;
  elemento: EstadoElementoPrueba2;
}) {
  const estadoStyle = ESTADO_STYLES[elemento.estado];
  const estadoLabel = ESTADO_LABELS[elemento.estado];
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-ink">{etiqueta}</span>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${estadoStyle}`}
        >
          {estadoLabel}
        </span>
      </div>
      {elemento.fragmento && (
        <p className="text-xs italic text-foreground/60 mb-2 leading-relaxed">
          "{elemento.fragmento}"
        </p>
      )}
      <p className="text-xs text-foreground/75 mb-1 leading-relaxed">{elemento.evaluacion}</p>
      {elemento.sugerencia && (
        <p className="text-xs text-primary/80 leading-relaxed">{elemento.sugerencia}</p>
      )}
    </div>
  );
}

const CRITERIO_CHIP_STYLES: Record<AnotacionPrueba2["criterio"], string> = {
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B1: "bg-purple-100 text-purple-700 border-purple-200",
  B2: "bg-indigo-100 text-indigo-700 border-indigo-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-rose-100 text-rose-700 border-rose-200",
};

function AnotacionItem({ anotacion }: { anotacion: AnotacionPrueba2 }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 mb-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${CRITERIO_CHIP_STYLES[anotacion.criterio]}`}
        >
          {anotacion.criterio}
        </span>
        <p className="text-xs italic text-foreground/60 leading-relaxed">
          "{anotacion.fragmento_original}"
        </p>
      </div>
      <p className="text-sm text-foreground/80 mb-1 leading-relaxed">{anotacion.problema}</p>
      <p className="text-xs text-primary/80 leading-relaxed">{anotacion.sugerencia}</p>
    </div>
  );
}

export function EvaluacionPrueba2Panel({
  ev,
  ensayo,
  autoGenerar = false,
  onSugerenciasChange,
  onEnsayoChange,
}: {
  ev: EvaluacionPrueba2;
  ensayo?: string;
  autoGenerar?: boolean;
  onSugerenciasChange?: (s: import("@/lib/ib-paper2").SugerenciaReescrituraPrueba2[]) => void;
  onEnsayoChange?: (e: import("@/lib/ib-paper2").EnsayoBanda5Prueba2) => void;
}) {
  const valores: Record<string, number> = {
    a: ev.criterio_a,
    b1: ev.criterio_b1,
    b2: ev.criterio_b2,
    c: ev.criterio_c,
    d: ev.criterio_d,
  };
  const justificaciones: Record<string, string> = {
    a: ev.justificacion_a,
    b1: ev.justificacion_b1,
    b2: ev.justificacion_b2,
    c: ev.justificacion_c,
    d: ev.justificacion_d,
  };

  const diagnosticoEntries = Object.entries(DIAGNOSTICO_ETIQUETAS) as [
    keyof EvaluacionPrueba2["diagnostico_comparativo"],
    string,
  ][];

  const anotacionesOrdenadas = [...(ev.anotaciones ?? [])].sort(
    (a, b) => b.prioridad - a.prioridad,
  );

  return (
    <div className="space-y-6">
      {/* Header de puntuación */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Prueba 2 · Ensayo comparativo</div>
          </div>
          <div className="flex items-end gap-6 sm:flex-col sm:items-end sm:gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {ev.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 25</span>
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB est.</div>
              <div className="font-serif text-3xl font-semibold leading-none mt-1">
                {notaIBPrueba2(ev.puntuacion_total)}
                <span className="text-sm opacity-60 font-normal"> / 7</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Ensayo anotado */}
      {ensayo && (
        <EnsayoAnotadoPrueba2
          texto={ensayo}
          anotaciones={ev.anotaciones ?? []}
          evaluacionId={ev.evaluacion_id}
          sugerenciasIniciales={ev.sugerencias_reescritura}
          autoGenerar={autoGenerar}
          onSugerenciasChange={onSugerenciasChange}
        />
      )}

      {/* Ensayo elevado a banda alta */}
      <EnsayoBanda5Prueba2
        ensayo={ev.ensayo_banda_5}
        evaluacionId={ev.evaluacion_id}
        onEnsayoChange={onEnsayoChange}
      />

      {/* Tarjetas de criterios */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CRITERIOS_PRUEBA2.map((c) => (
          <BandaCard
            key={c.key}
            etiqueta={c.etiqueta}
            nombre={c.nombre}
            valor={valores[c.key]}
            max={c.max}
            justificacion={justificaciones[c.key]}
          />
        ))}
      </div>

      {/* Diagnóstico comparativo */}
      {ev.diagnostico_comparativo && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Diagnóstico comparativo
          </div>
          <div className="space-y-3">
            {diagnosticoEntries.map(([key, etiqueta]) => (
              <DiagnosticoItem
                key={key}
                etiqueta={etiqueta}
                elemento={ev.diagnostico_comparativo[key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Anotaciones localizables */}
      {anotacionesOrdenadas.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Anotaciones prioritarias
          </div>
          <div className="space-y-3">
            {anotacionesOrdenadas.map((a, i) => (
              <AnotacionItem key={i} anotacion={a} />
            ))}
          </div>
        </div>
      )}

      {/* Fortalezas y áreas de mejora */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Fortalezas
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
            {ev.fortalezas}
          </p>
        </Card>
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-primary)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Áreas de mejora
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
            {ev.areas_mejora}
          </p>
        </Card>
      </div>

      {/* Comentario global */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Comentario global del examinador
        </div>
        <p className="font-serif text-base leading-relaxed text-ink">{ev.comentario_global}</p>
      </Card>
    </div>
  );
}
