// Panel de resultado del Oral Individual de Spanish B (criterios A/B1/B2/C → /30).
// Compartido entre el modo asíncrono (SpanishBOralView) y el modo conversación en
// vivo (ruta /oral-b-sesion), para tener una única fuente de verdad del feedback.

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import { X } from "lucide-react";

export type ErrorLengua = {
  categoria: "gramática" | "léxico" | "registro" | "estructura" | "conector" | "otro";
  fragmento_original: string;
  correccion: string;
};

export type EstructuraFeedback = {
  presentacion_ok: boolean;
  discusion_b1_ok: boolean;
  discusion_b2_ok: boolean;
  comentario_estructura: string;
  palabras_presentacion: number;
  minutos_estimados: number;
};

export type EvaluacionOralB = {
  evaluacion_id: string | null;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  puntuacion_total: number;
  nota_ib: number;
  justificacion_a: string;
  justificacion_b1: string;
  justificacion_b2: string;
  justificacion_c: string;
  comentario_global: string;
  fortalezas: string;
  areas_mejora: string;
  word_count: number;
  errores_lengua: ErrorLengua[] | null;
  estructura_feedback: EstructuraFeedback | null;
  preguntas_probables: string[] | null;
};

export type OralTranslations = {
  title: string;
  backToForm: string;
  score: string;
  ibGrade: string;
  wordsDetected: string;
  strengths: string;
  improve: string;
  global: string;
};

export function ResultadoOralB({
  evaluacion,
  t,
  onReset,
  isEN,
  guionOriginal,
}: {
  evaluacion: EvaluacionOralB;
  t: OralTranslations;
  onReset: () => void;
  isEN: boolean;
  guionOriginal?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {isEN ? "Individual Oral · Spanish B" : "Oral Individual · Spanish B"}
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h2>
        </div>
        <Button variant="outline" onClick={onReset} className="shrink-0">
          <X className="h-4 w-4 mr-1" /> {t.backToForm}
        </Button>
      </div>

      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="font-serif text-2xl mt-1">
              {isEN ? "Examiner's evaluation" : "Evaluación del examinador"}
            </div>
            <div className="text-[11px] opacity-60 mt-1">
              {evaluacion.word_count} {t.wordsDetected}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.score}</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evaluacion.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 30</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.ibGrade}</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1 text-success-foreground">
                <span className="px-3 py-1 rounded-md bg-success">{evaluacion.nota_ib}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <OralCriterionCard
          letter="A"
          name={isEN ? "Language" : "Lengua"}
          score={evaluacion.criterio_a}
          max={12}
          rationale={evaluacion.justificacion_a}
          isEN={isEN}
        />
        <OralCriterionCard
          letter="B1"
          name={isEN ? "Message (stimulus)" : "Mensaje (estímulo)"}
          score={evaluacion.criterio_b1}
          max={6}
          rationale={evaluacion.justificacion_b1}
          isEN={isEN}
        />
        <OralCriterionCard
          letter="B2"
          name={isEN ? "Message (conversation)" : "Mensaje (conversación)"}
          score={evaluacion.criterio_b2}
          max={6}
          rationale={evaluacion.justificacion_b2}
          isEN={isEN}
        />
        <OralCriterionCard
          letter="C"
          name={isEN ? "Interactive skills" : "Destrezas de interacción"}
          score={evaluacion.criterio_c}
          max={6}
          rationale={evaluacion.justificacion_c}
          isEN={isEN}
        />
      </div>

      {/* Estructura del oral */}
      {evaluacion.estructura_feedback && (
        <Card className="p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN ? "Oral structure" : "Estructura del oral"}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                ok: evaluacion.estructura_feedback.presentacion_ok,
                label: isEN ? "Presentation" : "Presentación",
                badge: "B1",
              },
              {
                ok: evaluacion.estructura_feedback.discusion_b1_ok,
                label: isEN ? "Discussion (stimulus)" : "Discusión (estímulo)",
                badge: "B1",
              },
              {
                ok: evaluacion.estructura_feedback.discusion_b2_ok,
                label: isEN ? "General discussion" : "Discusión general",
                badge: "B2",
              },
            ].map((part) => (
              <div
                key={part.label}
                className={`rounded-md p-3 border text-center ${
                  part.ok ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
                }`}
              >
                <div className="text-lg">{part.ok ? "✓" : "✗"}</div>
                <div className="text-xs font-medium mt-1">{part.label}</div>
                <div className="text-[10px] text-muted-foreground">{part.badge}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {isEN ? "Presentation: ~" : "Presentación: ~"}
            {evaluacion.estructura_feedback.palabras_presentacion}
            {isEN ? " words ≈ " : " palabras ≈ "}
            {evaluacion.estructura_feedback.minutos_estimados.toFixed(1)} min
            {evaluacion.estructura_feedback.comentario_estructura
              ? ` · ${evaluacion.estructura_feedback.comentario_estructura}`
              : ""}
          </p>
        </Card>
      )}

      {/* Ejemplos de lengua (criterio A) */}
      {evaluacion.errores_lengua && evaluacion.errores_lengua.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN ? "Language examples" : "Ejemplos de lengua"}
          </div>
          <div className="space-y-2">
            {evaluacion.errores_lengua.map((e, i) => (
              <div key={i} className="bg-muted/40 rounded-md p-3 space-y-1">
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                  {e.categoria}
                </span>
                <p className="text-sm line-through text-muted-foreground">{e.fragmento_original}</p>
                <p className="text-sm text-ink">→ {e.correccion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {t.global}
        </div>
        <MdProse className="font-serif text-ink" size="base">
          {evaluacion.comentario_global}
        </MdProse>
      </Card>

      {(evaluacion.fortalezas?.trim() || evaluacion.areas_mejora?.trim()) && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {t.strengths}
            </div>
            <MdProse>{evaluacion.fortalezas}</MdProse>
          </Card>
          <Card className="p-5 border-l-4" style={{ borderLeftColor: "var(--color-primary)" }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {t.improve}
            </div>
            <MdProse>{evaluacion.areas_mejora}</MdProse>
          </Card>
        </div>
      )}

      {evaluacion.preguntas_probables && evaluacion.preguntas_probables.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN
              ? "Likely examiner questions — practise these"
              : "Preguntas probables del examinador — practica estas"}
          </div>
          <ol className="space-y-2">
            {evaluacion.preguntas_probables.map((q, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-muted-foreground font-mono shrink-0">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {guionOriginal && guionOriginal.trim().length > 0 && (
        <Card className="p-6 border-border space-y-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEN ? "Your transcript" : "Tu transcripción"}
          </div>
          <p className="text-sm leading-relaxed font-serif whitespace-pre-wrap text-foreground/80">
            {guionOriginal}
          </p>
        </Card>
      )}
    </div>
  );
}

export function OralCriterionCard({
  letter,
  name,
  score,
  max,
  rationale,
  isEN,
}: {
  letter: string;
  name: string;
  score: number;
  max: number;
  rationale: string;
  isEN: boolean;
}) {
  return (
    <Card className="p-5 bg-card border-border flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isEN ? "Criterion" : "Criterio"} {letter}
          </div>
          <div className="font-serif text-lg text-ink leading-tight mt-0.5">{name}</div>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl font-semibold text-primary leading-none">{score}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ {max}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{rationale}</p>
    </Card>
  );
}
