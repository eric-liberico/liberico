import { useEffect, useMemo, useState } from "react";
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
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { toast } from "sonner";
import { ArrowRight, Loader2, X } from "lucide-react";
import {
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  WORD_COUNT_RANGE_SL,
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
  const { user, loading: authLoading } = useAuth();
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
  const [submitting, setSubmitting] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionB1 | null>(null);

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
      : wordCount < WORD_COUNT_RANGE_SL.min
        ? "low"
        : wordCount > WORD_COUNT_RANGE_SL.max
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
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper1-b", {
        body: {
          course_key: "spanish-b-language",
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
        subtitle: "Spanish B SL · 250–400 words",
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
        wordCountLow: "Below 250 — your bands may drop because there's less to assess.",
        wordCountHigh: "Over 400 — be careful that the message stays focused.",
        submit: "Get feedback",
        evaluating: "Evaluating…",
        noPrompts: "No prompts have been published yet. Switch to writing your own.",
        emptyState: "Pick a prompt or write your own to start.",
        switchUI: "Switch UI to",
        backToForm: "New evaluation",
        score: "Score",
        ibGrade: "Grade (estimate)",
        criterion: "Criterion",
        languageErrors: "Language errors",
        textTypeAppropriacy: "Text-type appropriateness",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        wordsDetected: "words detected",
      }
    : {
        title: "Prueba 1 — Producción escrita",
        subtitle: "Spanish B SL · 250–400 palabras",
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
        wordCountLow:
          "Por debajo de 250 — las bandas pueden bajar porque hay menos texto que evaluar.",
        wordCountHigh: "Por encima de 400 — cuida que el mensaje no se diluya.",
        submit: "Pedir feedback",
        evaluating: "Evaluando…",
        noPrompts: "Aún no hay estímulos publicados. Cambia a escribir el tuyo.",
        emptyState: "Elige un estímulo o escribe el tuyo para empezar.",
        switchUI: "Cambiar UI a",
        backToForm: "Nueva evaluación",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        criterion: "Criterio",
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
        <div>
          <h1 className="text-2xl font-semibold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {canSwitch && (
          <div className="flex items-center gap-2 text-sm">
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
          <Card className="p-4 bg-muted/40 text-sm whitespace-pre-wrap">
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

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t.title}</h2>
        <Button variant="outline" onClick={onReset}>
          <X className="h-4 w-4 mr-1" /> {t.backToForm}
        </Button>
      </div>

      <Card className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.score}</p>
          <p className="text-3xl font-bold">{evaluacion.puntuacion_total} / 30</p>
          <p className="text-xs text-muted-foreground mt-1">
            {evaluacion.word_count} {t.wordsDetected}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t.ibGrade}</p>
          <p className="text-3xl font-bold">{evaluacion.nota_ib} / 7</p>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <CriterionCard
          letter="A"
          name={isEN ? "Language" : "Lenguaje"}
          score={evaluacion.criterio_a}
          max={12}
          rationale={evaluacion.justificacion_a}
        />
        <CriterionCard
          letter="B"
          name={isEN ? "Message" : "Mensaje"}
          score={evaluacion.criterio_b}
          max={12}
          rationale={evaluacion.justificacion_b}
        />
        <CriterionCard
          letter="C"
          name={isEN ? "Conceptual understanding" : "Comprensión conceptual"}
          score={evaluacion.criterio_c}
          max={6}
          rationale={evaluacion.justificacion_c}
        />
      </div>

      <Card className="p-5 space-y-3">
        <Section title={t.global}>{evaluacion.comentario_global}</Section>
        <Section title={t.strengths}>{evaluacion.fortalezas}</Section>
        <Section title={t.improve}>{evaluacion.areas_mejora}</Section>
      </Card>

      {evaluacion.errores_lengua.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">{t.languageErrors}</h3>
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
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">{t.textTypeAppropriacy}</h3>
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
}: {
  letter: string;
  name: string;
  score: number;
  max: number;
  rationale: string;
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">
          {letter} · {name}
        </h3>
        <span className="text-2xl font-bold">
          {score}
          <span className="text-sm text-muted-foreground"> / {max}</span>
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{rationale}</p>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  );
}
