import { useEffect, useMemo, useState } from "react";
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
import { GuiaOralB } from "@/components/GuiaOralB";
import type { Nivel } from "@/lib/ib-courses";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowRight, History, Loader2, Mic, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

type StimulusRow = {
  id: string;
  theme: ThemeP1B;
  image_url: string | null;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
};

type ErrorLengua = {
  categoria: "gramática" | "léxico" | "registro" | "estructura" | "conector" | "otro";
  fragmento_original: string;
  correccion: string;
};

type EstructuraFeedback = {
  presentacion_ok: boolean;
  discusion_b1_ok: boolean;
  discusion_b2_ok: boolean;
  comentario_estructura: string;
  palabras_presentacion: number;
  minutos_estimados: number;
};

type EvaluacionOralB = {
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

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function SpanishBOralView() {
  const { user, loading: authLoading, refreshRol } = useAuth();
  const lang = useUiLang();
  const { canSwitch, supported, setLang } = useUiLangControl();
  const isEN = lang === "en";

  const [stimuli, setStimuli] = useState<StimulusRow[]>([]);
  const [loadingStimuli, setLoadingStimuli] = useState(true);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string | "custom" | "">("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeP1B>("experiencias");
  const [globalIssue, setGlobalIssue] = useState("");
  const [guionPresentacion, setGuionPresentacion] = useState("");
  const [guionDiscusionB1, setGuionDiscusionB1] = useState("");
  const [guionDiscusionB2, setGuionDiscusionB2] = useState("");
  const [nivel, setNivel] = useState<Nivel>("SL");
  const [submitting, setSubmitting] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionOralB | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingStimuli(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("prompts_oral_b")
        .select("id,theme,image_url,title_es,title_en,description_es,description_en")
        .order("theme", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("prompts_oral_b fetch error:", error);
      } else {
        setStimuli((data ?? []) as StimulusRow[]);
      }
      setLoadingStimuli(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const selectedStimulus = useMemo(
    () =>
      selectedStimulusId && selectedStimulusId !== "custom"
        ? (stimuli.find((s) => s.id === selectedStimulusId) ?? null)
        : null,
    [stimuli, selectedStimulusId],
  );

  const isCustom = selectedStimulusId === "custom";
  const stimulusDescription = isCustom
    ? customDescription.trim()
    : selectedStimulus
      ? isEN
        ? selectedStimulus.description_en
        : selectedStimulus.description_es
      : "";
  const theme = isCustom ? selectedTheme : (selectedStimulus?.theme ?? null);
  const isHL = nivel === "HL";

  const guionCompleto = [guionPresentacion, guionDiscusionB1, guionDiscusionB2]
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
  const wordCount = countWords(guionCompleto);
  const canSubmit =
    !!user &&
    !submitting &&
    !!theme &&
    stimulusDescription.length > 0 &&
    globalIssue.trim().length > 0 &&
    guionPresentacion.trim().length > 0 &&
    wordCount >= 50;

  const t = isEN
    ? {
        title: "Individual Oral",
        subtitle: "Spanish B · Visual stimulus + discussion",
        stimulusLabel: "Choose a visual stimulus",
        stimulusPlaceholder: "Pick a stimulus or describe your own…",
        custom: "Describe my own stimulus",
        themeLabel: "Prescribed theme",
        customDescLabel: "Describe the visual stimulus",
        customDescPlaceholder: "What does the image show? What theme does it connect to?",
        globalIssueLabel: "Global issue",
        globalIssuePlaceholder: "What global issue connects this stimulus to the theme?",
        guionLabel: "Your monologue script / oral notes",
        guionPlaceholder: "Write your monologue script and notes on the discussion here…",
        wordCount: "words",
        wordCountMin: "Write at least 50 words to submit.",
        submit: "Get feedback",
        evaluating: "Evaluating…",
        noStimuli: "No stimuli published yet. Describe your own below.",
        switchUI: "Switch UI to",
        backToForm: "New evaluation",
        score: "Score",
        ibGrade: "Grade (estimate)",
        wordsDetected: "words detected",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        history: "View my previous assessments",
      }
    : {
        title: "Oral Individual",
        subtitle: "Spanish B · Estímulo visual + discusión",
        stimulusLabel: "Elige un estímulo visual",
        stimulusPlaceholder: "Selecciona un estímulo o describe el tuyo…",
        custom: "Describir mi propio estímulo",
        themeLabel: "Tema prescrito",
        customDescLabel: "Describe el estímulo visual",
        customDescPlaceholder: "¿Qué muestra la imagen? ¿Con qué tema se relaciona?",
        globalIssueLabel: "Cuestión global",
        globalIssuePlaceholder: "¿Qué cuestión global conecta este estímulo con el tema?",
        guionLabel: "Tu guion / notas del oral",
        guionPlaceholder: "Escribe aquí tu guion del monólogo y las notas de la discusión…",
        wordCount: "palabras",
        wordCountMin: "Escribe al menos 50 palabras para enviar.",
        submit: "Pedir feedback",
        evaluating: "Evaluando…",
        noStimuli: "Aún no hay estímulos publicados. Describe el tuyo abajo.",
        switchUI: "Cambiar UI a",
        backToForm: "Nueva evaluación",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        wordsDetected: "palabras detectadas",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
        history: "Ver mis evaluaciones anteriores",
      };

  async function handleSubmit() {
    if (!canSubmit || !theme) return;
    setSubmitting(true);
    setEvaluacion(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-oral-b", {
        body: {
          course_key: "spanish-b-language",
          nivel,
          stimulus_id: isCustom ? null : (selectedStimulus?.id ?? null),
          stimulus_description: stimulusDescription,
          global_issue: globalIssue.trim(),
          theme,
          // Guion unificado (fallback/word count server-side) + las tres partes.
          guion: guionCompleto,
          guion_presentacion: guionPresentacion.trim() || null,
          guion_discusion_b1: guionDiscusionB1.trim() || null,
          guion_discusion_b2: guionDiscusionB2.trim() || null,
          ui_lang: lang,
          guardar_historial: true,
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
      setEvaluacion(data as EvaluacionOralB);
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
    setGuionPresentacion("");
    setGuionDiscusionB1("");
    setGuionDiscusionB2("");
    setGlobalIssue("");
    setSelectedStimulusId("");
    setCustomDescription("");
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
      <ResultadoOralB
        evaluacion={evaluacion}
        t={t}
        onReset={handleReset}
        isEN={isEN}
        guionOriginal={guionCompleto}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <Mic className="h-3.5 w-3.5" />
            {isEN ? "Individual Oral · Spanish B" : "Oral Individual · Spanish B"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            {isHL
              ? isEN
                ? "Spanish B HL · Literary passage + discussion"
                : "Spanish B NS · Pasaje literario + discusión"
              : t.subtitle}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <SelectorNivel value={nivel} onChange={setNivel} disabled={submitting} />
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

      <GuiaOralB isEN={isEN} isHL={isHL} />

      {/* Estímulo */}
      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>{t.stimulusLabel}</Label>
          <Select value={selectedStimulusId} onValueChange={(v) => setSelectedStimulusId(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.stimulusPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {!loadingStimuli && stimuli.length === 0 && (
                <SelectItem value="custom">{t.custom}</SelectItem>
              )}
              {stimuli.map((s) => {
                const theme = THEME_LABELS[s.theme][isEN ? "en" : "es"];
                const title = isEN ? s.title_en : s.title_es;
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {title} · {theme}
                  </SelectItem>
                );
              })}
              {stimuli.length > 0 && <SelectItem value="custom">{t.custom}</SelectItem>}
            </SelectContent>
          </Select>
          {!loadingStimuli && stimuli.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.noStimuli}</p>
          )}
        </div>

        {selectedStimulus && (
          <Card className="p-4 bg-parchment border-border">
            <p className="text-sm font-serif text-ink">
              {isEN ? selectedStimulus.description_en : selectedStimulus.description_es}
            </p>
            {selectedStimulus.image_url && (
              <img
                src={selectedStimulus.image_url}
                alt=""
                className="mt-3 rounded-md max-h-48 object-cover"
              />
            )}
          </Card>
        )}

        {isCustom && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.themeLabel}</Label>
              <Select value={selectedTheme} onValueChange={(v) => setSelectedTheme(v as ThemeP1B)}>
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
              <Label>
                {isHL
                  ? isEN
                    ? "Paste the literary passage"
                    : "Pega el pasaje literario"
                  : t.customDescLabel}
              </Label>
              <Textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={
                  isHL
                    ? isEN
                      ? "Paste the passage (≈300 words) from one of the studied literary works…"
                      : "Pega el pasaje (≈300 palabras) de una de las obras literarias estudiadas…"
                    : t.customDescPlaceholder
                }
                rows={isHL ? 6 : 3}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Cuestión global */}
      <Card className="p-5 space-y-2">
        <Label htmlFor="global-issue">{t.globalIssueLabel}</Label>
        <Textarea
          id="global-issue"
          value={globalIssue}
          onChange={(e) => setGlobalIssue(e.target.value)}
          placeholder={t.globalIssuePlaceholder}
          rows={2}
        />
      </Card>

      {/* Guion — tres partes */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">
            {isEN ? "Your oral — three parts" : "Tu oral — tres partes"}
          </Label>
          <span className="text-xs text-muted-foreground">
            {wordCount} {t.wordCount}
          </span>
        </div>

        {/* Parte 1 — Presentación (B1) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              {isEN ? "Part 1 — Presentation (3-4 min)" : "Parte 1 — Presentación (3-4 min)"}
            </Label>
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
              B1
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isHL
              ? isEN
                ? "Present the literary passage: its events, ideas and messages, and its link to the theme."
                : "Presenta el pasaje literario: sus acontecimientos, ideas y mensajes, y su relación con el tema."
              : isEN
                ? "Present the visual stimulus, connect it to Hispanic culture and your global issue."
                : "Presenta el estímulo visual, conéctalo con la cultura hispanohablante y tu cuestión global."}
          </p>
          <Textarea
            value={guionPresentacion}
            onChange={(e) => setGuionPresentacion(e.target.value)}
            placeholder={
              isEN
                ? "Write your presentation script here (aim for ~400-500 words)…"
                : "Escribe aquí tu guion de presentación (objetivo: ~400-500 palabras)…"
            }
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* Parte 2 — Discusión sobre el estímulo (B1) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              {isEN
                ? "Part 2 — Discussion on the stimulus (4-5 min)"
                : "Parte 2 — Discusión sobre el estímulo (4-5 min)"}
            </Label>
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
              B1
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEN
              ? "Notes on the questions you expect about your presentation and how you'd answer them."
              : "Notas sobre las preguntas que esperas sobre tu presentación y cómo las responderías."}
          </p>
          <Textarea
            value={guionDiscusionB1}
            onChange={(e) => setGuionDiscusionB1(e.target.value)}
            placeholder={
              isEN
                ? "e.g. Q: Why did you connect this to identity? A: Because the image shows…"
                : "p.ej. P: ¿Por qué lo conectaste con la identidad? R: Porque la imagen muestra…"
            }
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        {/* Parte 3 — Discusión general (B2) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">
              {isEN
                ? "Part 3 — General discussion on the theme (5-6 min)"
                : "Parte 3 — Discusión general sobre el tema (5-6 min)"}
            </Label>
            <span className="text-[10px] bg-accent/40 text-accent-foreground px-1.5 py-0.5 rounded font-medium">
              B2
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEN
              ? "Notes on broader questions about the prescribed theme, beyond your stimulus."
              : "Notas sobre preguntas más amplias sobre el tema prescrito, más allá de tu estímulo."}
          </p>
          <Textarea
            value={guionDiscusionB2}
            onChange={(e) => setGuionDiscusionB2(e.target.value)}
            placeholder={
              isEN
                ? "e.g. Q: What do you think about social media and identity? A: I believe…"
                : "p.ej. P: ¿Qué piensas sobre las redes sociales y la identidad? R: Creo que…"
            }
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        {wordCount > 0 && wordCount < 50 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t.wordCountMin}</p>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3">
        <CreditGate
          coste={2}
          concepto="Spanish B Oral — corrección"
          open={showCreditGate}
          onConfirm={() => {
            setShowCreditGate(false);
            void handleSubmit();
          }}
          onCancel={() => setShowCreditGate(false)}
        />
        {!submitting && <CreditCostBadge coste={2} />}
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

type OralTranslations = {
  title: string;
  backToForm: string;
  score: string;
  ibGrade: string;
  wordsDetected: string;
  strengths: string;
  improve: string;
  global: string;
};

function ResultadoOralB({
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
            {isEN ? "Your script" : "Tu guion"}
          </div>
          <p className="text-sm leading-relaxed font-serif whitespace-pre-wrap text-foreground/80">
            {guionOriginal}
          </p>
        </Card>
      )}
    </div>
  );
}

function OralCriterionCard({
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
