// Panel de resultado del Oral Individual de Spanish B (criterios A/B1/B2/C → /30).
// Compartido entre el modo asíncrono (SpanishBOralView) y el modo conversación en
// vivo (ruta /oral-b-sesion), para tener una única fuente de verdad del feedback.

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MdProse } from "@/components/MdProse";
import { X } from "lucide-react";
import {
  LANDING as L,
  CRIT,
  DEEP,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const cardStyle = {
  backgroundColor: L.surface,
  borderColor: L.line,
  boxShadow: cardShadow,
  color: L.ink,
} as const;
const eyebrowMono = { ...fontMono, color: L.muted } as const;
const critColor = (letter: string): string =>
  ({ A: CRIT.A, B: CRIT.B, C: CRIT.C, D: CRIT.D })[letter[0]] ?? L.primary;

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
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={eyebrowMono}>
            {isEN ? "Individual Oral · Spanish B" : "Oral Individual · Spanish B"}
          </div>
          <h2
            className="text-3xl leading-tight font-bold sm:text-4xl"
            style={{ ...headingStyle, color: L.ink }}
          >
            {t.title}
          </h2>
        </div>
        <Button variant="outline" onClick={onReset} className="shrink-0 rounded-2xl">
          <X className="mr-1 h-4 w-4" /> {t.backToForm}
        </Button>
      </div>

      <Card
        className="lib-reveal rounded-2xl border p-6"
        style={{
          backgroundColor: DEEP.bg,
          borderColor: DEEP.border,
          boxShadow: cardShadow,
          color: DEEP.text,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ ...fontMono, color: DEEP.muted }}
            >
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="mt-1 text-2xl" style={{ ...headingStyle, color: DEEP.text }}>
              {isEN ? "Examiner's evaluation" : "Evaluación del examinador"}
            </div>
            <div className="mt-1 text-[11px]" style={{ ...fontMono, color: DEEP.muted }}>
              {evaluacion.word_count} {t.wordsDetected}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {t.score}
              </div>
              <div
                className="mt-1 text-5xl font-semibold leading-none tabular-nums"
                style={{ ...fontMono, color: DEEP.text }}
              >
                {evaluacion.puntuacion_total}
                <span className="text-lg font-normal" style={{ color: DEEP.muted }}>
                  {" "}
                  / 30
                </span>
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {t.ibGrade}
              </div>
              <div className="mt-1">
                <span
                  className="inline-block rounded-lg px-3 py-1 text-5xl font-semibold leading-none tabular-nums"
                  style={{ ...fontMono, backgroundColor: L.ok, color: "#fff" }}
                >
                  {evaluacion.nota_ib}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Card className="lib-reveal space-y-3 rounded-2xl border p-5" style={cardStyle}>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
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
                className="rounded-xl border p-3 text-center"
                style={{
                  backgroundColor: part.ok ? L.ok + "12" : "#FEF2F2",
                  borderColor: part.ok ? L.ok + "44" : "#FCA5A5",
                  color: part.ok ? L.ok : "#B91C1C",
                }}
              >
                <div className="text-lg">{part.ok ? "✓" : "✗"}</div>
                <div className="mt-1 text-xs font-medium">{part.label}</div>
                <div className="text-[10px]" style={{ ...fontMono, color: L.muted }}>
                  {part.badge}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: L.muted }}>
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
        <Card className="lib-reveal space-y-3 rounded-2xl border p-5" style={cardStyle}>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
            {isEN ? "Language examples" : "Ejemplos de lengua"}
          </div>
          <div className="space-y-2">
            {evaluacion.errores_lengua.map((e, i) => (
              <div
                key={i}
                className="space-y-1 rounded-xl border p-3"
                style={{ backgroundColor: L.bg2, borderColor: L.line }}
              >
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: L.amber + "1F", color: L.amberDeep }}
                >
                  {e.categoria}
                </span>
                <p className="text-sm line-through" style={{ color: L.muted }}>
                  {e.fragmento_original}
                </p>
                <p className="text-sm" style={{ color: L.ink }}>
                  → {e.correccion}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="lib-reveal rounded-2xl border p-6" style={cardStyle}>
        <div className="mb-3 text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
          {t.global}
        </div>
        <MdProse size="base">{evaluacion.comentario_global}</MdProse>
      </Card>

      {(evaluacion.fortalezas?.trim() || evaluacion.areas_mejora?.trim()) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="lib-reveal rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.ok }}
          >
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
              {t.strengths}
            </div>
            <MdProse>{evaluacion.fortalezas}</MdProse>
          </Card>
          <Card
            className="lib-reveal rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.primary }}
          >
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
              {t.improve}
            </div>
            <MdProse>{evaluacion.areas_mejora}</MdProse>
          </Card>
        </div>
      )}

      {evaluacion.preguntas_probables && evaluacion.preguntas_probables.length > 0 && (
        <Card className="lib-reveal space-y-3 rounded-2xl border p-5" style={cardStyle}>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
            {isEN
              ? "Likely examiner questions — practise these"
              : "Preguntas probables del examinador — practica estas"}
          </div>
          <ol className="space-y-2">
            {evaluacion.preguntas_probables.map((q, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0" style={{ ...fontMono, color: L.muted }}>
                  {i + 1}.
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {guionOriginal && guionOriginal.trim().length > 0 && (
        <Card className="lib-reveal space-y-3 rounded-2xl border p-6" style={cardStyle}>
          <div className="text-[11px] uppercase tracking-[0.18em]" style={eyebrowMono}>
            {isEN ? "Your transcript" : "Tu transcripción"}
          </div>
          <p
            className="whitespace-pre-wrap font-serif text-sm leading-relaxed"
            style={{ color: L.ink }}
          >
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
  const color = critColor(letter);
  return (
    <Card className="lib-reveal flex flex-col gap-3 rounded-2xl border p-5" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={eyebrowMono}>
            {isEN ? "Criterion" : "Criterio"} {letter}
          </div>
          <div
            className="mt-0.5 text-lg leading-tight font-semibold"
            style={{ ...headingStyle, color: L.ink }}
          >
            {name}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-4xl leading-none font-semibold tabular-nums"
            style={{ ...fontMono, color }}
          >
            {score}
          </div>
          <div className="mt-1 text-[10px]" style={{ ...fontMono, color: L.muted }}>
            / {max}
          </div>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < score ? color : L.line }}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
        {rationale}
      </p>
    </Card>
  );
}
