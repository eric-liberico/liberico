import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
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
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { toast } from "sonner";
import { ArrowRight, History, Loader2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SelectorNivel } from "@/components/SelectorNivel";
import type { Nivel } from "@/lib/ib-courses";
import {
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  WORD_COUNT_RANGE_SL,
  WORD_COUNT_RANGE_HL,
  type TextTypeP1B,
  type ThemeP1B,
} from "@/lib/criteria/spanish-b-language";
import { getFunctionErrorMessage } from "@/lib/functionErrors";

type PromptRow = {
  id: string;
  text_type: TextTypeP1B;
  theme: ThemeP1B;
  title_es: string;
  title_en: string;
  context_es: string;
  context_en: string;
};

type EvaluacionB1 = {
  evaluacion_id: string | null;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  puntuacion_total: number;
  nota_ib: number;
  justificacion_a: string;
  justificacion_b: string;
  justificacion_c: string;
  comentario_global: string;
  fortalezas: string;
  areas_mejora: string;
  errores_lengua: Array<{ categoria: string; fragmento: string; correccion: string }>;
  apropiacion_tipo_texto: Array<{ nota: string; estado: "respeta" | "incumple" | "parcial" }>;
  word_count: number;
};

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function SpanishBPaper1View() {
  const { user, loading: authLoading, refreshRol } = useAuth();
  const lang = useUiLang();
  const { canSwitch, supported, setLang } = useUiLangControl();
  const isEN = lang === "en";

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | "custom" | "">("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customTextType, setCustomTextType] = useState<TextTypeP1B>("blog");
  const [customTheme, setCustomTheme] = useState<ThemeP1B>("experiencias");
  const [response, setResponse] = useState("");
  const [nivel, setNivel] = useState<Nivel>("SL");
  const [submitting, setSubmitting] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionB1 | null>(null);

  const wordCountRange = nivel === "HL" ? WORD_COUNT_RANGE_HL : WORD_COUNT_RANGE_SL;

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingPrompts(true);
      const { data, error } = await supabase
        .from("prompts_paper1_b")
        .select("id,text_type,theme,title_es,title_en,context_es,context_en")
        .order("text_type", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("prompts_paper1_b fetch error:", error);
        toast.error(isEN ? "Could not load prompts." : "No se pudieron cargar los estímulos.");
      } else {
        setPrompts((data ?? []) as PromptRow[]);
      }
      setLoadingPrompts(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, isEN]);

  const selectedPrompt = useMemo(
    () =>
      selectedPromptId && selectedPromptId !== "custom"
        ? (prompts.find((p) => p.id === selectedPromptId) ?? null)
        : null,
    [prompts, selectedPromptId],
  );

  const wordCount = countWords(response);
  const wordCountStatus: "ok" | "low" | "high" =
    wordCount === 0
      ? "ok"
      : wordCount < wordCountRange.min
        ? "low"
        : wordCount > wordCountRange.max
          ? "high"
          : "ok";

  const isCustom = selectedPromptId === "custom";
  const promptText = isCustom
    ? customPrompt.trim()
    : selectedPrompt
      ? isEN
        ? selectedPrompt.context_en
        : selectedPrompt.context_es
      : "";
  const textType = isCustom ? customTextType : (selectedPrompt?.text_type ?? null);
  const theme = isCustom ? customTheme : (selectedPrompt?.theme ?? null);

  const canSubmit =
    !!user &&
    !submitting &&
    !!textType &&
    !!theme &&
    promptText.length > 0 &&
    response.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !textType || !theme) return;
    setSubmitting(true);
    setEvaluacion(null);
    trackEvent("evaluation_started", "p1_spanish_b");
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper1-b", {
        body: {
          course_key: "spanish-b-language",
          nivel,
          text_type: textType,
          theme,
          prompt_id: isCustom ? null : (selectedPrompt?.id ?? null),
          prompt_text: promptText,
          student_response: response,
          ui_lang: lang,
          guardar_historial: true,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(
          error,
          isEN ? "Could not evaluate. Try again." : "No se pudo evaluar. Inténtalo de nuevo.",
        );
        toast.error(msg);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setEvaluacion(data as EvaluacionB1);
      trackEvent("evaluation_completed", "p1_spanish_b");
      void refreshRol();
    } catch (e) {
      console.error(e);
      toast.error(
        isEN ? "Something went wrong. Try again." : "Algo salió mal. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setEvaluacion(null);
    setResponse("");
    setSelectedPromptId("");
    setCustomPrompt("");
  }

  const t = isEN
    ? {
        title: "Paper 1 — Written production",
        subtitle: `Spanish B ${nivel} · ${wordCountRange.min}–${wordCountRange.max} words · Written production task`,
        prompt: "Choose a prompt",
        promptPlaceholder: "Pick a prompt or write your own…",
        custom: "Write my own prompt",
        textTypeLabel: "Text type",
        themeLabel: "Theme",
        customPromptLabel: "Your prompt",
        customPromptPlaceholder: "Audience, purpose, theme…",
        responseLabel: "Your response",
        responsePlaceholder: "Write your text in Spanish here…",
        wordCount: "words",
        wordCountLow: `Below ${wordCountRange.min} — your bands may drop because there's less to assess.`,
        wordCountHigh: `Over ${wordCountRange.max} — be careful that the message stays focused.`,
        submit: "Get feedback",
        evaluating: "Evaluating…",
        noPrompts: "No prompts have been published yet. Switch to writing your own.",
        emptyState: "Pick a prompt or write your own to start.",
        switchUI: "Switch UI to",
        backToForm: "New evaluation",
        score: "Score",
        ibGrade: "Grade (estimate)",
        languageErrors: "Language errors",
        textTypeAppropriacy: "Text-type appropriateness",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        wordsDetected: "words detected",
      }
    : {
        title: "Prueba 1 — Producción escrita",
        subtitle: `Spanish B ${nivel} · ${wordCountRange.min}–${wordCountRange.max} palabras · Tarea de producción escrita`,
        prompt: "Elige un estímulo",
        promptPlaceholder: "Selecciona un estímulo o escribe el tuyo…",
        custom: "Escribir mi propio estímulo",
        textTypeLabel: "Tipo de texto",
        themeLabel: "Tema",
        customPromptLabel: "Tu estímulo",
        customPromptPlaceholder: "Audiencia, propósito, tema…",
        responseLabel: "Tu respuesta",
        responsePlaceholder: "Escribe aquí tu texto en español…",
        wordCount: "palabras",
        wordCountLow: `Por debajo de ${wordCountRange.min} — las bandas pueden bajar porque hay menos texto que evaluar.`,
        wordCountHigh: `Por encima de ${wordCountRange.max} — cuida que el mensaje no se diluya.`,
        submit: "Pedir feedback",
        evaluating: "Evaluando…",
        noPrompts: "Aún no hay estímulos publicados. Cambia a escribir el tuyo.",
        emptyState: "Elige un estímulo o escribe el tuyo para empezar.",
        switchUI: "Cambiar UI a",
        backToForm: "Nueva evaluación",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        languageErrors: "Errores de lengua",
        textTypeAppropriacy: "Apropiación del tipo de texto",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
        wordsDetected: "palabras detectadas",
      };

  if (submitting) {
    return (
      <Card className="p-6">
        <JuegoEsperaEvaluacion modo="prueba1" />
      </Card>
    );
  }

  if (evaluacion) {
    return <ResultadoB1 evaluacion={evaluacion} t={t} onReset={handleReset} isEN={isEN} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {isEN ? "Written production · Paper 1" : "Producción escrita · Prueba 1"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">{t.subtitle}</p>
          <div className="flex items-center gap-3 mt-3">
            <SelectorNivel value={nivel} onChange={setNivel} disabled={submitting} />
            <Link
              to="/historial"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              {isEN ? "View my previous assessments" : "Ver mis evaluaciones anteriores"}
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

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-select">{t.prompt}</Label>
          <Select value={selectedPromptId} onValueChange={(v) => setSelectedPromptId(v as string)}>
            <SelectTrigger id="prompt-select">
              <SelectValue placeholder={t.promptPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {!loadingPrompts && prompts.length === 0 && (
                <SelectItem value="custom">{t.custom}</SelectItem>
              )}
              {prompts.map((p) => {
                const tt = TEXT_TYPE_LABELS[p.text_type][isEN ? "en" : "es"];
                const th = THEME_LABELS[p.theme][isEN ? "en" : "es"];
                const title = isEN ? p.title_en : p.title_es;
                return (
                  <SelectItem key={p.id} value={p.id}>
                    {title} · {tt} · {th}
                  </SelectItem>
                );
              })}
              {prompts.length > 0 && <SelectItem value="custom">{t.custom}</SelectItem>}
            </SelectContent>
          </Select>
          {!loadingPrompts && prompts.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.noPrompts}</p>
          )}
        </div>

        {isCustom && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.textTypeLabel}</Label>
                <Select
                  value={customTextType}
                  onValueChange={(v) => setCustomTextType(v as TextTypeP1B)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TEXT_TYPE_LABELS) as TextTypeP1B[]).map((tt) => (
                      <SelectItem key={tt} value={tt}>
                        {TEXT_TYPE_LABELS[tt][isEN ? "en" : "es"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-prompt">{t.customPromptLabel}</Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t.customPromptPlaceholder}
                rows={4}
              />
            </div>
          </div>
        )}

        {selectedPrompt && (
          <Card className="p-4 bg-parchment border-border text-sm whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink">
            {isEN ? selectedPrompt.context_en : selectedPrompt.context_es}
          </Card>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="response">{t.responseLabel}</Label>
          <span
            className={
              wordCountStatus === "ok"
                ? "text-xs text-muted-foreground"
                : "text-xs text-amber-600 dark:text-amber-400"
            }
          >
            {wordCount} {t.wordCount}
          </span>
        </div>
        <Textarea
          id="response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder={t.responsePlaceholder}
          rows={14}
          className="font-mono text-sm"
        />
        {wordCountStatus === "low" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t.wordCountLow}</p>
        )}
        {wordCountStatus === "high" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t.wordCountHigh}</p>
        )}
      </Card>

      {!textType && !response && <p className="text-sm text-muted-foreground">{t.emptyState}</p>}

      <div className="flex items-center justify-end gap-3">
        <CreditGate
          coste={1.5}
          concepto="Spanish B Paper 1 — corrección básica"
          open={showCreditGate}
          onConfirm={() => {
            setShowCreditGate(false);
            void handleSubmit();
          }}
          onCancel={() => setShowCreditGate(false)}
        />
        {!submitting && <CreditCostBadge coste={1.5} />}
        <Button onClick={() => setShowCreditGate(true)} disabled={!canSubmit} size="lg">
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
          )}
          {submitting ? t.evaluating : t.submit}
        </Button>
      </div>
    </div>
  );
}

type B1Translations = {
  title: string;
  backToForm: string;
  score: string;
  ibGrade: string;
  languageErrors: string;
  textTypeAppropriacy: string;
  strengths: string;
  improve: string;
  global: string;
  wordsDetected: string;
};

function ResultadoB1({
  evaluacion,
  t,
  onReset,
  isEN,
}: {
  evaluacion: EvaluacionB1;
  t: B1Translations;
  onReset: () => void;
  isEN: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {isEN ? "Written production · Paper 1" : "Producción escrita · Prueba 1"}
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h2>
        </div>
        <Button variant="outline" onClick={onReset} className="shrink-0">
          <X className="h-4 w-4 mr-1" /> {t.backToForm}
        </Button>
      </div>

      {/* Score header */}
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

      {/* Criterion cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <CriterionCard
          letter="A"
          name={isEN ? "Language" : "Lenguaje"}
          score={evaluacion.criterio_a}
          max={12}
          rationale={evaluacion.justificacion_a}
          isEN={isEN}
        />
        <CriterionCard
          letter="B"
          name={isEN ? "Message" : "Mensaje"}
          score={evaluacion.criterio_b}
          max={12}
          rationale={evaluacion.justificacion_b}
          isEN={isEN}
        />
        <CriterionCard
          letter="C"
          name={isEN ? "Conceptual understanding" : "Comprensión conceptual"}
          score={evaluacion.criterio_c}
          max={6}
          rationale={evaluacion.justificacion_c}
          isEN={isEN}
        />
      </div>

      {/* Global comment */}
      <Card className="p-6 bg-parchment border-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {t.global}
        </div>
        <MdProse className="font-serif text-ink" size="base">
          {evaluacion.comentario_global}
        </MdProse>
      </Card>

      {/* Strengths / improvements */}
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

      {evaluacion.errores_lengua.length > 0 && (
        <Card className="p-5 bg-parchment border-border space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t.languageErrors}
          </div>
          <ul className="space-y-2">
            {evaluacion.errores_lengua.map((err, i) => (
              <li key={i} className="text-sm border-l-2 border-amber-500 pl-3">
                <span className="inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-900 rounded mr-2 uppercase">
                  {err.categoria}
                </span>
                <span className="line-through text-muted-foreground">{err.fragmento}</span>
                <span className="mx-2">→</span>
                <span className="font-medium">{err.correccion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {evaluacion.apropiacion_tipo_texto.length > 0 && (
        <Card className="p-5 bg-parchment border-border space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t.textTypeAppropriacy}
          </div>
          <ul className="space-y-2">
            {evaluacion.apropiacion_tipo_texto.map((b, i) => (
              <li key={i} className="text-sm flex gap-2 items-start">
                <span
                  className={
                    b.estado === "respeta"
                      ? "px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-900 rounded uppercase"
                      : b.estado === "incumple"
                        ? "px-1.5 py-0.5 text-xs bg-rose-100 text-rose-900 rounded uppercase"
                        : "px-1.5 py-0.5 text-xs bg-amber-100 text-amber-900 rounded uppercase"
                  }
                >
                  {b.estado}
                </span>
                <span>{b.nota}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CriterionCard({
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
