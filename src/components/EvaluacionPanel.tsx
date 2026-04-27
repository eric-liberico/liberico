import type { Evaluacion } from "@/lib/ib";
import { CRITERIOS } from "@/lib/ib";
import { Card } from "@/components/ui/card";
import { FeedbackEstructural } from "@/components/FeedbackEstructural";
import { AnalisisAnotado } from "@/components/AnalisisAnotado";
import { EnsayoBanda5 } from "@/components/EnsayoBanda5";

function BandaCard({
  letra,
  nombre,
  banda,
  justificacion,
}: {
  letra: string;
  nombre: string;
  banda: number;
  justificacion: string;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Criterio {letra}
          </div>
          <div className="font-serif text-lg text-ink leading-tight mt-0.5">{nombre}</div>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{banda}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ 5</div>
        </div>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= banda ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed">{justificacion}</p>
    </Card>
  );
}

export function EvaluacionPanel({ ev, analisisTexto }: { ev: Evaluacion; analisisTexto?: string }) {
  const bandas: Record<string, number> = {
    a: ev.banda_a,
    b: ev.banda_b,
    c: ev.banda_c,
    d: ev.banda_d,
  };
  const justis: Record<string, string> = {
    a: ev.justificacion_a,
    b: ev.justificacion_b,
    c: ev.justificacion_c,
    d: ev.justificacion_d,
  };

  return (
    <div className="space-y-6">
      {/* Score header */}
      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">Resultado</div>
            <div className="font-serif text-2xl mt-1">Evaluación del examinador</div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Puntuación</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {ev.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 20</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Nota IB</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">{ev.nota_ib}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bands grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {CRITERIOS.map((c) => (
          <BandaCard
            key={c.key}
            letra={c.letra}
            nombre={c.nombre}
            banda={bandas[c.key]}
            justificacion={justis[c.key]}
          />
        ))}
      </div>

      {/* Análisis anotado */}
      {analisisTexto && <AnalisisAnotado texto={analisisTexto} ev={ev} />}

      {/* Ensayo modelo basado en la respuesta del alumno */}
      <EnsayoBanda5 ensayo={ev.ensayo_banda_5} evaluacionId={ev.evaluacion_id} />

      {/* Language feedback */}
      <FeedbackEstructural lenguaje_analitico={ev.lenguaje_analitico} />

      {/* Strengths + improvements */}
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

      {/* Global comment */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Comentario global del examinador
        </div>
        <p className="font-serif text-base leading-relaxed text-ink">{ev.comentario_global}</p>
      </Card>
    </div>
  );
}
