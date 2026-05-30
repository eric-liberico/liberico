import { useEffect, useState } from "react";
import { CreditGate, CreditCostBadge } from "@/components/CreditGate";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang, useUiLangControl } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MdProse } from "@/components/MdProse";
import { SelectorNivel } from "@/components/SelectorNivel";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import type { Nivel } from "@/lib/ib-courses";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowRight, BookOpen, History, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

type TextoRow = {
  id: string;
  theme: ThemeP1B;
  title_es: string;
  title_en: string;
  text_es: string;
  source: string | null;
};

type EvaluacionP2B = {
  evaluacion_id: string | null;
  criterio_a: number;
  criterio_b: number;
  puntuacion_total: number;
  nota_ib: number;
  justificacion_a: string;
  justificacion_b: string;
  comentario_global: string;
  fortalezas: string;
  areas_mejora: string;
};

export function SpanishBPaper2View() {
  const { user, loading: authLoading, refreshRol } = useAuth();
  const lang = useUiLang();
  const { canSwitch, supported, setLang } = useUiLangControl();
  const isEN = lang === "en";

  const [textos, setTextos] = useState<TextoRow[]>([]);
  const [loadingTextos, setLoadingTextos] = useState(true);
  const [selectedTextoId, setSelectedTextoId] = useState<string | "custom" | "">("");
  const [customText, setCustomText] = useState("");
  const [customTheme, setCustomTheme] = useState<ThemeP1B>("experiencias");
  const [nivel, setNivel] = useState<Nivel>("SL");

  const [step, setStep] = useState<"text" | "questions" | "done">("text");
  const [preguntas, setPreguntas] = useState<string[]>([]);
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [showCreditGatePreguntas, setShowCreditGatePreguntas] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionP2B | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingTextos(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("textos_paper2_b")
        .select("id,theme,title_es,title_en,text_es,source")
        .order("theme", { ascending: true });
      if (cancelled) return;
      if (error) console.error("textos_paper2_b fetch error:", error);
      else setTextos((data ?? []) as TextoRow[]);
      setLoadingTextos(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const selectedTexto =
    selectedTextoId && selectedTextoId !== "custom"
      ? (textos.find((t) => t.id === selectedTextoId) ?? null)
      : null;

  const isCustom = selectedTextoId === "custom";
  const textoContent = isCustom ? customText.trim() : (selectedTexto?.text_es ?? "");
  const theme = isCustom ? customTheme : (selectedTexto?.theme ?? null);

  const t = isEN
    ? {
        title: "Reading — Paper 2",
        subtitle: "Spanish B · Comprehension questions",
        textoLabel: "Choose a reading text",
        textoPlaceholder: "Pick a text or paste your own…",
        custom: "Paste my own text",
        themeLabel: "Prescribed theme",
        customTextLabel: "Reading text (in Spanish)",
        customTextPlaceholder: "Paste an authentic text in Spanish here…",
        generateBtn: "Generate comprehension questions",
        generating: "Generating questions…",
        questionsTitle: "Answer the following questions in Spanish:",
        responsePlaceholder: "Your answer in Spanish…",
        submit: "Get feedback",
        evaluating: "Evaluating…",
        backToForm: "New evaluation",
        score: "Score",
        ibGrade: "Grade (estimate)",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        history: "View my previous assessments",
        switchUI: "Switch UI to",
        source: "Source",
        noTextos: "No texts published yet. Paste your own below.",
      }
    : {
        title: "Lectura — Prueba 2",
        subtitle: "Spanish B · Preguntas de comprensión",
        textoLabel: "Elige un texto de lectura",
        textoPlaceholder: "Selecciona un texto o pega el tuyo…",
        custom: "Pegar mi propio texto",
        themeLabel: "Tema prescrito",
        customTextLabel: "Texto de lectura (en español)",
        customTextPlaceholder: "Pega aquí un texto auténtico en español…",
        generateBtn: "Generar preguntas de comprensión",
        generating: "Generando preguntas…",
        questionsTitle: "Responde las siguientes preguntas en español:",
        responsePlaceholder: "Tu respuesta en español…",
        submit: "Pedir feedback",
        evaluating: "Evaluando…",
        backToForm: "Nueva evaluación",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
        history: "Ver mis evaluaciones anteriores",
        switchUI: "Cambiar UI a",
        source: "Fuente",
        noTextos: "Aún no hay textos publicados. Pega el tuyo abajo.",
      };

  async function handleGenerateQuestions() {
    if (!textoContent || !theme) return;
    setGeneratingQuestions(true);
    setPreguntas([]);
    setRespuestas([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions-paper2-b", {
        body: { texto_content: textoContent, ui_lang: lang, nivel },
      });
      if (error) {
        toast.error(
          await getFunctionErrorMessage(
            error,
            isEN ? "Could not generate questions." : "No se pudieron generar las preguntas.",
          ),
        );
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const qs: string[] = Array.isArray(data?.preguntas) ? data.preguntas : [];
      if (qs.length < 2) {
        toast.error(
          isEN
            ? "Could not generate questions. Try again."
            : "No se generaron suficientes preguntas. Inténtalo de nuevo.",
        );
        return;
      }
      setPreguntas(qs);
      setRespuestas(qs.map(() => ""));
      setStep("questions");
    } catch (e) {
      console.error(e);
      toast.error(isEN ? "Something went wrong." : "Algo salió mal.");
    } finally {
      setGeneratingQuestions(false);
    }
  }

  async function handleSubmit() {
    if (!textoContent || !theme || preguntas.length < 2) return;
    setSubmitting(true);
    setEvaluacion(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper2-b", {
        body: {
          course_key: "spanish-b-language",
          nivel,
          texto_id: isCustom ? null : (selectedTexto?.id ?? null),
          texto_content: textoContent,
          theme,
          preguntas,
          respuestas,
          ui_lang: lang,
        },
      });
      if (error) {
        toast.error(
          await getFunctionErrorMessage(
            error,
            isEN ? "Could not evaluate." : "No se pudo evaluar.",
          ),
        );
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setEvaluacion(data as EvaluacionP2B);
      setStep("done");
      void refreshRol();
    } catch (e) {
      console.error(e);
      toast.error(isEN ? "Something went wrong." : "Algo salió mal.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setEvaluacion(null);
    setStep("text");
    setPreguntas([]);
    setRespuestas([]);
    setSelectedTextoId("");
    setCustomText("");
  }

  if (submitting) {
    return (
      <Card className="p-6">
        <JuegoEsperaEvaluacion modo="prueba1" />
      </Card>
    );
  }

  if (evaluacion) {
    return (
      <ResultadoP2B
        evaluacion={evaluacion}
        t={t}
        onReset={handleReset}
        isEN={isEN}
        preguntas={preguntas}
        respuestas={respuestas}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            {isEN ? "Reading comprehension · Paper 2" : "Comprensión lectora · Prueba 2"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">{t.subtitle}</p>
          <div className="flex items-center gap-3 mt-3">
            <SelectorNivel value={nivel} onChange={setNivel} disabled={step !== "text"} />
            <Link
              to="/historial"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              {t.history}
            </Link>
          </div>
        </div>
        {canSwitch && (
          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="text-muted-foreground">{t.switchUI}</span>
            {supported.map((ln) => (
              <Button
                key={ln}
                size="sm"
                variant={ln === lang ? "default" : "outline"}
                onClick={() => setLang(ln)}
              >
                {ln.toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </header>

      {/* Paso 1: selección del texto */}
      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>{t.textoLabel}</Label>
          <Select
            value={selectedTextoId}
            onValueChange={(v) => {
              setSelectedTextoId(v);
              setStep("text");
              setPreguntas([]);
              setRespuestas([]);
            }}
            disabled={step === "questions"}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.textoPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {!loadingTextos && textos.length === 0 && (
                <SelectItem value="custom">{t.custom}</SelectItem>
              )}
              {textos.map((tx) => {
                const title = isEN ? tx.title_en : tx.title_es;
                const th = THEME_LABELS[tx.theme][isEN ? "en" : "es"];
                return (
                  <SelectItem key={tx.id} value={tx.id}>
                    {title} · {th}
                  </SelectItem>
                );
              })}
              {textos.length > 0 && <SelectItem value="custom">{t.custom}</SelectItem>}
            </SelectContent>
          </Select>
          {!loadingTextos && textos.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.noTextos}</p>
          )}
        </div>

        {selectedTexto && (
          <>
            <Card className="p-4 bg-parchment border-border max-h-72 overflow-y-auto">
              <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                {selectedTexto.text_es}
              </p>
            </Card>
            {selectedTexto.source && (
              <p className="text-xs text-muted-foreground">
                {t.source}: {selectedTexto.source}
              </p>
            )}
          </>
        )}

        {isCustom && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.themeLabel}</Label>
              <Select value={customTheme} onValueChange={(v) => setCustomTheme(v as ThemeP1B)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(THEME_LABELS) as ThemeP1B[]).map((th) => (
                    <SelectItem key={th} value={th}>
                      {THEME_LABELS[th][isEN ? "en" : "es"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.customTextLabel}</Label>
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t.customTextPlaceholder}
                rows={10}
                className="font-serif text-sm"
              />
            </div>
          </div>
        )}

        {step === "text" && textoContent.length > 50 && (
          <div className="flex items-center gap-3">
            <CreditGate
              coste={0.5}
              concepto="Spanish B Paper 2 — generación de preguntas"
              open={showCreditGatePreguntas}
              onConfirm={() => {
                setShowCreditGatePreguntas(false);
                void handleGenerateQuestions();
              }}
              onCancel={() => setShowCreditGatePreguntas(false)}
            />
            {!generatingQuestions && <CreditCostBadge coste={0.5} />}
            <Button
              onClick={() => setShowCreditGatePreguntas(true)}
              disabled={generatingQuestions || !theme}
              className="gap-2"
            >
              {generatingQuestions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t.generateBtn}
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Paso 2: responder preguntas */}
      {step === "questions" && preguntas.length > 0 && (
        <>
          <Card className="p-5 space-y-5">
            <p className="text-sm font-medium text-ink">{t.questionsTitle}</p>
            {preguntas.map((q, i) => (
              <div key={i} className="space-y-1.5">
                <Label className="font-serif text-base text-ink">
                  {i + 1}. {q}
                </Label>
                <Textarea
                  value={respuestas[i] ?? ""}
                  onChange={(e) =>
                    setRespuestas((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  placeholder={t.responsePlaceholder}
                  rows={3}
                />
              </div>
            ))}
          </Card>
          <div className="flex items-center justify-end gap-3">
            <CreditGate
              coste={2}
              concepto="Spanish B Paper 2 — corrección"
              open={showCreditGate}
              onConfirm={() => {
                setShowCreditGate(false);
                void handleSubmit();
              }}
              onCancel={() => setShowCreditGate(false)}
            />
            {!submitting && <CreditCostBadge coste={2} />}
            <Button
              onClick={() => setShowCreditGate(true)}
              disabled={submitting || respuestas.some((r) => !r.trim())}
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {submitting ? t.evaluating : t.submit}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type P2Translations = {
  title: string;
  backToForm: string;
  score: string;
  ibGrade: string;
  strengths: string;
  improve: string;
  global: string;
};

function ResultadoP2B({
  evaluacion,
  t,
  onReset,
  isEN,
  preguntas,
  respuestas,
}: {
  evaluacion: EvaluacionP2B;
  t: P2Translations;
  onReset: () => void;
  isEN: boolean;
  preguntas: string[];
  respuestas: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {isEN ? "Reading comprehension · Paper 2" : "Comprensión lectora · Prueba 2"}
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
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.score}</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evaluacion.puntuacion_total}
                <span className="text-lg opacity-60 font-normal"> / 20</span>
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
        <P2CriterionCard
          letter="A"
          name={isEN ? "Language in responses" : "Lengua en las respuestas"}
          score={evaluacion.criterio_a}
          max={10}
          rationale={evaluacion.justificacion_a}
          isEN={isEN}
        />
        <P2CriterionCard
          letter="B"
          name={isEN ? "Text comprehension" : "Comprensión del texto"}
          score={evaluacion.criterio_b}
          max={10}
          rationale={evaluacion.justificacion_b}
          isEN={isEN}
        />
      </div>

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

      {preguntas.length > 0 && (
        <Card className="p-6 border-border space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEN ? "Your answers" : "Tus respuestas"}
          </div>
          {preguntas.map((pregunta, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-medium">
                {i + 1}. {pregunta}
              </p>
              <p className="text-sm text-foreground/80 pl-3 border-l-2 border-border font-serif">
                {respuestas[i] ?? "—"}
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function P2CriterionCard({
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
