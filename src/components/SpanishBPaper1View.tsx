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
import { ArrowRight, History, Loader2, PenLine, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SelectorNivel } from "@/components/SelectorNivel";
import type { Nivel } from "@/lib/ib-courses";
import {
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
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
  opciones_tipo_texto: TextTypeP1B[] | null;
  bullets_es: string[] | null;
  bullets_en: string[] | null;
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

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const softPanelStyle = { backgroundColor: L.bg2, borderColor: L.line };
const ctaStyle = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
};
const deepResultStyle = {
  backgroundColor: DEEP.bg,
  color: DEEP.text,
  borderColor: DEEP.border,
  boxShadow: "0 24px 56px -30px rgba(30,27,75,0.62)",
};

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
  const [tipoTextoElegido, setTipoTextoElegido] = useState<TextTypeP1B | null>(null);
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
      const structuredResult = await supabase
        .from("prompts_paper1_b")
        .select(
          "id,text_type,theme,title_es,title_en,context_es,context_en,opciones_tipo_texto,bullets_es,bullets_en",
        )
        .order("text_type", { ascending: true });
      let data = structuredResult.data as PromptRow[] | null;
      let error = structuredResult.error;
      if (error?.code === "42703") {
        const legacyResult = await supabase
          .from("prompts_paper1_b")
          .select("id,text_type,theme,title_es,title_en,context_es,context_en")
          .order("text_type", { ascending: true });
        const legacyData = legacyResult.data?.map((prompt) => ({
          ...prompt,
          opciones_tipo_texto: null,
          bullets_es: null,
          bullets_en: null,
        }));
        data = (legacyData ?? null) as PromptRow[] | null;
        error = legacyResult.error;
      }
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

  useEffect(() => {
    setTipoTextoElegido(null);
  }, [selectedPromptId]);

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
  const opcionesTipoTexto =
    selectedPrompt?.opciones_tipo_texto && selectedPrompt.opciones_tipo_texto.length > 0
      ? selectedPrompt.opciones_tipo_texto
      : null;
  const promptBullets = selectedPrompt
    ? isEN
      ? (selectedPrompt.bullets_en ?? selectedPrompt.bullets_es)
      : (selectedPrompt.bullets_es ?? selectedPrompt.bullets_en)
    : null;
  const effectiveTextType = isCustom
    ? customTextType
    : opcionesTipoTexto
      ? tipoTextoElegido
      : textType;

  const canSubmit =
    !!user &&
    !submitting &&
    !!textType &&
    !!effectiveTextType &&
    !!theme &&
    promptText.length > 0 &&
    response.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !textType || !theme || !effectiveTextType) return;
    setSubmitting(true);
    setEvaluacion(null);
    trackEvent("evaluation_started", "p1_spanish_b");
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper1-b", {
        body: {
          course_key: "spanish-b-language",
          nivel,
          text_type: textType,
          tipo_texto_elegido: !isCustom && opcionesTipoTexto ? effectiveTextType : null,
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
        contentPoints: "You must cover",
        chooseTextType: "Choose the text type",
        chooseTextTypeHint: "The real exam asks you to choose the most suitable format.",
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
        contentPoints: "Debes cubrir",
        chooseTextType: "Elige el tipo de texto",
        chooseTextTypeHint: "El examen real te pide escoger el formato más adecuado.",
      };

  if (submitting) {
    return (
      <Card className="rounded-2xl border p-6" style={cardStyle}>
        <JuegoEsperaEvaluacion modo="prueba1" />
      </Card>
    );
  }

  if (evaluacion) {
    return (
      <ResultadoB1
        evaluacion={evaluacion}
        t={t}
        onReset={handleReset}
        isEN={isEN}
        respuestaOriginal={response}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div
            className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            <PenLine aria-hidden="true" className="h-3.5 w-3.5" />
            {isEN ? "Written production · Paper 1" : "Producción escrita · Prueba 1"}
          </div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" style={headingStyle}>
            {t.title}
          </h1>
          <p className="mt-3 leading-relaxed" style={{ color: L.muted }}>
            {t.subtitle}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <SelectorNivel value={nivel} onChange={setNivel} disabled={submitting} />
            <Link
              to="/historial"
              className="lib-press inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: L.muted }}
            >
              <History aria-hidden="true" className="h-3.5 w-3.5" />
              {isEN ? "View my previous assessments" : "Ver mis evaluaciones anteriores"}
            </Link>
          </div>
        </div>
        {canSwitch && (
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span style={{ color: L.muted }}>{t.switchUI}</span>
            {supported.map((ln) => (
              <Button
                key={ln}
                type="button"
                size="sm"
                variant={ln === lang ? "default" : "outline"}
                className="lib-press rounded-xl"
                style={ln === lang ? ctaStyle : undefined}
                onClick={() => setLang(ln)}
              >
                {ln.toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </header>

      <Card className="space-y-4 rounded-2xl border p-5" style={cardStyle}>
        <div className="space-y-2">
          <Label htmlFor="prompt-select" style={{ color: L.ink }}>
            {t.prompt}
          </Label>
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
            <p className="text-xs" style={{ color: L.muted }}>
              {t.noPrompts}
            </p>
          )}
        </div>

        {isCustom && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: L.ink }}>{t.textTypeLabel}</Label>
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
                <Label style={{ color: L.ink }}>{t.themeLabel}</Label>
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
              <Label htmlFor="custom-prompt" style={{ color: L.ink }}>
                {t.customPromptLabel}
              </Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t.customPromptPlaceholder}
                rows={4}
                className="rounded-2xl"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
          </div>
        )}

        {selectedPrompt && (
          <div className="space-y-4">
            <Card
              className="whitespace-pre-wrap rounded-2xl border p-4 font-serif text-[15px] text-sm leading-relaxed"
              style={{ ...softPanelStyle, color: L.ink }}
            >
              {isEN ? selectedPrompt.context_en : selectedPrompt.context_es}
            </Card>

            {promptBullets && promptBullets.length === 3 && (
              <div className="space-y-2">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ ...fontMono, color: L.muted }}
                >
                  {t.contentPoints}
                </div>
                <ol className="grid gap-2 sm:grid-cols-3">
                  {promptBullets.map((bullet, index) => (
                    <li
                      key={`${selectedPrompt.id}-bullet-${index}`}
                      className="rounded-2xl border px-3 py-2 text-sm leading-relaxed"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      <span className="mr-1 font-semibold" style={{ color: L.primary }}>
                        {index + 1}.
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {opcionesTipoTexto && (
              <div className="space-y-2">
                <div>
                  <Label className="text-sm" style={{ color: L.ink }}>
                    {t.chooseTextType}
                  </Label>
                  <p className="text-xs" style={{ color: L.muted }}>
                    {t.chooseTextTypeHint}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {opcionesTipoTexto.map((tt) => (
                    <Button
                      key={tt}
                      type="button"
                      variant={tipoTextoElegido === tt ? "default" : "outline"}
                      className="lib-press min-h-10 whitespace-normal rounded-2xl text-center leading-tight"
                      style={tipoTextoElegido === tt ? ctaStyle : undefined}
                      onClick={() => setTipoTextoElegido(tt)}
                    >
                      {TEXT_TYPE_LABELS[tt][isEN ? "en" : "es"]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3 rounded-2xl border p-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <Label htmlFor="response" style={{ color: L.ink }}>
            {t.responseLabel}
          </Label>
          <span
            className="text-xs"
            style={{ color: wordCountStatus === "ok" ? L.muted : L.amberDeep }}
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
          className="rounded-2xl font-mono text-sm"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
        />
        {wordCountStatus === "low" && (
          <p className="text-xs" style={{ color: L.amberDeep }}>
            {t.wordCountLow}
          </p>
        )}
        {wordCountStatus === "high" && (
          <p className="text-xs" style={{ color: L.amberDeep }}>
            {t.wordCountHigh}
          </p>
        )}
      </Card>

      {!textType && !response && (
        <p className="text-sm" style={{ color: L.muted }}>
          {t.emptyState}
        </p>
      )}

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
        <Button
          type="button"
          onClick={() => setShowCreditGate(true)}
          disabled={!canSubmit}
          size="lg"
          className="lib-press rounded-2xl"
          style={ctaStyle}
        >
          {submitting ? (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" className="mr-2 h-4 w-4" />
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
  respuestaOriginal,
}: {
  evaluacion: EvaluacionB1;
  t: B1Translations;
  onReset: () => void;
  isEN: boolean;
  respuestaOriginal?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            {isEN ? "Written production · Paper 1" : "Producción escrita · Prueba 1"}
          </div>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl" style={headingStyle}>
            {t.title}
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="lib-press shrink-0 rounded-2xl"
        >
          <X aria-hidden="true" className="mr-1 h-4 w-4" /> {t.backToForm}
        </Button>
      </div>

      {/* Score header */}
      <Card className="rounded-3xl border p-6" style={deepResultStyle}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="mt-1 text-2xl font-semibold" style={headingStyle}>
              {isEN ? "Examiner's evaluation" : "Evaluación del examinador"}
            </div>
            <div className="mt-1 text-[11px] opacity-60" style={fontMono}>
              {evaluacion.word_count} {t.wordsDetected}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                {t.score}
              </div>
              <div className="mt-1 text-5xl font-semibold leading-none" style={fontMono}>
                {evaluacion.puntuacion_total}
                <span className="text-lg font-normal opacity-60"> / 30</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                {t.ibGrade}
              </div>
              <div className="mt-1 text-5xl font-semibold leading-none" style={fontMono}>
                <span
                  className="rounded-2xl px-3 py-1"
                  style={{ backgroundColor: L.ok, color: "#fff" }}
                >
                  {evaluacion.nota_ib}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Criterion cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <CriterionCard
          letter="A"
          name={isEN ? "Language" : "Lengua"}
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
      <Card className="rounded-2xl border p-6" style={cardStyle}>
        <div
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ ...fontMono, color: L.muted }}
        >
          {t.global}
        </div>
        <MdProse className="font-serif" size="base">
          {evaluacion.comentario_global}
        </MdProse>
      </Card>

      {/* Strengths / improvements */}
      {(evaluacion.fortalezas?.trim() || evaluacion.areas_mejora?.trim()) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.ok }}
          >
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {t.strengths}
            </div>
            <MdProse>{evaluacion.fortalezas}</MdProse>
          </Card>
          <Card
            className="rounded-2xl border border-l-4 p-5"
            style={{ ...cardStyle, borderLeftColor: L.primary }}
          >
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ ...fontMono, color: L.muted }}
            >
              {t.improve}
            </div>
            <MdProse>{evaluacion.areas_mejora}</MdProse>
          </Card>
        </div>
      )}

      {respuestaOriginal && respuestaOriginal.trim().length > 0 && (
        <Card className="space-y-3 rounded-2xl border p-6" style={cardStyle}>
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Your annotated response" : "Tu respuesta anotada"}
          </div>
          <RespuestaAnotada texto={respuestaOriginal} errores={evaluacion.errores_lengua} />
        </Card>
      )}

      {evaluacion.errores_lengua.length > 0 && (
        <Card className="space-y-3 rounded-2xl border p-5" style={cardStyle}>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {t.languageErrors}
          </div>
          <ul className="space-y-2">
            {evaluacion.errores_lengua.map((err, i) => (
              <li key={i} className="border-l-2 pl-3 text-sm" style={{ borderColor: L.amber }}>
                <span
                  className="mr-2 inline-block rounded-xl px-1.5 py-0.5 text-xs font-semibold uppercase"
                  style={{ backgroundColor: "#FEF3C7", color: L.amberDeep }}
                >
                  {err.categoria}
                </span>
                <span className="line-through" style={{ color: L.muted }}>
                  {err.fragmento}
                </span>
                <span className="mx-2">→</span>
                <span className="font-medium">{err.correccion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {evaluacion.apropiacion_tipo_texto.length > 0 && (
        <Card className="space-y-3 rounded-2xl border p-5" style={cardStyle}>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {t.textTypeAppropriacy}
          </div>
          <ul className="space-y-2">
            {evaluacion.apropiacion_tipo_texto.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="rounded-xl px-1.5 py-0.5 text-xs font-semibold uppercase"
                  style={
                    b.estado === "respeta"
                      ? { backgroundColor: "#ECFDF5", color: L.ok }
                      : b.estado === "incumple"
                        ? { backgroundColor: "#FFF1F2", color: "#BE123C" }
                        : { backgroundColor: "#FEF3C7", color: L.amberDeep }
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

type ErrorSegment = { text: string; error?: EvaluacionB1["errores_lengua"][0] };

function buildSegments(texto: string, errores: EvaluacionB1["errores_lengua"]): ErrorSegment[] {
  type Span = { start: number; end: number; error: EvaluacionB1["errores_lengua"][0] };
  const spans: Span[] = [];
  for (const err of errores) {
    if (!err.fragmento) continue;
    const idx = texto.indexOf(err.fragmento);
    if (idx === -1) continue;
    const overlaps = spans.some((s) => idx < s.end && idx + err.fragmento.length > s.start);
    if (!overlaps) spans.push({ start: idx, end: idx + err.fragmento.length, error: err });
  }
  spans.sort((a, b) => a.start - b.start);
  const result: ErrorSegment[] = [];
  let pos = 0;
  for (const span of spans) {
    if (span.start > pos) result.push({ text: texto.slice(pos, span.start) });
    result.push({ text: texto.slice(span.start, span.end), error: span.error });
    pos = span.end;
  }
  if (pos < texto.length) result.push({ text: texto.slice(pos) });
  return result;
}

function RespuestaAnotada({
  texto,
  errores,
}: {
  texto: string;
  errores: EvaluacionB1["errores_lengua"];
}) {
  const segments = buildSegments(texto, errores);
  return (
    <div
      className="whitespace-pre-wrap font-serif text-sm leading-relaxed"
      style={{ color: L.ink }}
    >
      {segments.map((seg, i) =>
        seg.error ? (
          <span
            key={i}
            className="cursor-help rounded border-b px-0.5"
            style={{ backgroundColor: CRIT.C + "26", borderColor: CRIT.C, color: L.ink }}
            title={`→ ${seg.error.correccion}`}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
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
  const criterionColor = CRIT[letter as keyof typeof CRIT] ?? L.primary;
  return (
    <Card className="flex flex-col gap-3 rounded-2xl border p-5" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? "Criterion" : "Criterio"} {letter}
          </div>
          <div className="mt-0.5 text-lg font-semibold leading-tight" style={headingStyle}>
            {name}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-4xl font-semibold leading-none"
            style={{ ...fontMono, color: criterionColor }}
          >
            {score}
          </div>
          <div className="mt-1 text-[10px]" style={{ color: L.muted }}>
            / {max}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < score ? criterionColor : L.line }}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: L.muted }}>
        {rationale}
      </p>
    </Card>
  );
}
