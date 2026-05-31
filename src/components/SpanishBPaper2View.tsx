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
import type { Nivel } from "@/lib/ib-courses";
import { THEME_LABELS, type ThemeP1B } from "@/lib/criteria/spanish-b-language";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Headphones, History, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Seccion = "auditiva" | "lectura";

type TextoRow = {
  id: string;
  theme: ThemeP1B;
  title_es: string;
  title_en: string;
  text_es: string;
  source: string | null;
};

type AudioRow = {
  id: string;
  theme: ThemeP1B;
  title_es: string;
  title_en: string;
  source: string | null;
};

type Item = {
  id: string;
  seccion: Seccion;
  formato: "opcion_multiple" | "vf_justificacion" | "respuesta_corta";
  enunciado: string;
  opciones?: string[];
  puntos: number;
};

type ItemResult = Item & {
  respuesta: string;
  marca: "acierto" | "parcial" | "fallo";
  puntos_obtenidos: number;
  comentario: string;
};

type EvaluacionP2B = {
  evaluacion_id: string | null;
  subtotal_auditiva: number | null;
  subtotal_lectura: number | null;
  puntuacion_total: number;
  puntuacion_max: number;
  nota_ib: number;
  items_auditiva: ItemResult[];
  items_lectura: ItemResult[];
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
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const [selectedTextoId, setSelectedTextoId] = useState<string | "custom" | "">("");
  const [customText, setCustomText] = useState("");
  const [customTheme, setCustomTheme] = useState<ThemeP1B>("experiencias");
  const [selectedAudioId, setSelectedAudioId] = useState<string | "none">("none");
  const [nivel, setNivel] = useState<Nivel>("SL");

  const [step, setStep] = useState<"setup" | "answer">("setup");
  const [itemsLectura, setItemsLectura] = useState<Item[]>([]);
  const [itemsAuditiva, setItemsAuditiva] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [vfChoice, setVfChoice] = useState<Record<string, "Verdadero" | "Falso">>({});
  const [vfJustif, setVfJustif] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreditGatePrep, setShowCreditGatePrep] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionP2B | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingSources(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const [tRes, aRes] = await Promise.all([
        db
          .from("textos_paper2_b")
          .select("id,theme,title_es,title_en,text_es,source")
          .order("theme"),
        // Vista pública sin transcript_es: el alumno no debe ver el guion del audio.
        db
          .from("audios_paper2_b_publico")
          .select("id,theme,title_es,title_en,source")
          .order("theme"),
      ]);
      if (cancelled) return;
      if (tRes.error) console.error("textos_paper2_b fetch error:", tRes.error);
      else setTextos((tRes.data ?? []) as TextoRow[]);
      if (aRes.error) console.error("audios_paper2_b fetch error:", aRes.error);
      else setAudios((aRes.data ?? []) as AudioRow[]);
      setLoadingSources(false);
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
  const theme: ThemeP1B | null = isCustom ? customTheme : (selectedTexto?.theme ?? null);
  const selectedAudio =
    selectedAudioId !== "none" ? (audios.find((a) => a.id === selectedAudioId) ?? null) : null;

  const prepCost = 0.5 + (selectedAudio ? 0.5 : 0);

  const t = isEN
    ? {
        title: "Receptive skills — Paper 2",
        subtitle: "Spanish B · Listening + reading comprehension",
        textoLabel: "Reading text",
        textoPlaceholder: "Pick a text or paste your own…",
        custom: "Paste my own text",
        audioLabel: "Listening audio (optional)",
        audioPlaceholder: "No listening section",
        audioNone: "No listening section",
        themeLabel: "Prescribed theme",
        customTextLabel: "Reading text (in Spanish)",
        customTextPlaceholder: "Paste an authentic text in Spanish here…",
        prepBtn: "Prepare the paper",
        prepHint: "Paste a reading text (min. 50 characters) to continue.",
        preparing: "Preparing…",
        listeningSection: "Listening comprehension",
        readingSection: "Reading comprehension",
        listenHint: "Play the audio as many times as you need, then answer.",
        trueLbl: "True",
        falseLbl: "False",
        justifyPh: "Justify with support from the audio/text…",
        shortPh: "Your answer…",
        submit: "Mark my answers",
        evaluating: "Marking…",
        backToForm: "New paper",
        score: "Score",
        ibGrade: "Grade (estimate)",
        listening: "Listening",
        reading: "Reading",
        strengths: "Strengths",
        improve: "Areas to improve",
        global: "Overall comment",
        history: "View my previous papers",
        switchUI: "Switch UI to",
        source: "Source",
        noTextos: "No texts published yet. Paste your own below.",
        marks: { acierto: "Correct", parcial: "Partial", fallo: "Incorrect" },
        comprehensionOnly: "Only comprehension is marked, not the language of your answers.",
      }
    : {
        title: "Destrezas receptivas — Prueba 2",
        subtitle: "Spanish B · Comprensión auditiva + lectura",
        textoLabel: "Texto de lectura",
        textoPlaceholder: "Selecciona un texto o pega el tuyo…",
        custom: "Pegar mi propio texto",
        audioLabel: "Audio de comprensión auditiva (opcional)",
        audioPlaceholder: "Sin sección auditiva",
        audioNone: "Sin sección auditiva",
        themeLabel: "Tema prescrito",
        customTextLabel: "Texto de lectura (en español)",
        customTextPlaceholder: "Pega aquí un texto auténtico en español…",
        prepBtn: "Preparar la prueba",
        prepHint: "Pega un texto de lectura (mín. 50 caracteres) para continuar.",
        preparing: "Preparando…",
        listeningSection: "Comprensión auditiva",
        readingSection: "Comprensión de lectura",
        listenHint: "Reproduce el audio las veces que necesites y luego responde.",
        trueLbl: "Verdadero",
        falseLbl: "Falso",
        justifyPh: "Justifica con apoyo del audio/texto…",
        shortPh: "Tu respuesta…",
        submit: "Corregir mis respuestas",
        evaluating: "Corrigiendo…",
        backToForm: "Nueva prueba",
        score: "Puntuación",
        ibGrade: "Nota (estimada)",
        listening: "Auditiva",
        reading: "Lectura",
        strengths: "Fortalezas",
        improve: "Áreas de mejora",
        global: "Comentario global",
        history: "Ver mis pruebas anteriores",
        switchUI: "Cambiar UI a",
        source: "Fuente",
        noTextos: "Aún no hay textos publicados. Pega el tuyo abajo.",
        marks: { acierto: "Acierto", parcial: "Parcial", fallo: "Fallo" },
        comprehensionOnly: "Solo se corrige la comprensión, no la lengua de tus respuestas.",
      };

  const allItems = useMemo(
    () => [...itemsAuditiva, ...itemsLectura],
    [itemsAuditiva, itemsLectura],
  );

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function composedAnswer(it: Item): string {
    if (it.formato === "vf_justificacion") {
      const choice = vfChoice[it.id];
      if (!choice) return "";
      const justif = vfJustif[it.id]?.trim() ?? "";
      return justif ? `${choice}. ${justif}` : choice;
    }
    return answers[it.id]?.trim() ?? "";
  }

  const canSubmit = allItems.length > 0 && allItems.every((it) => composedAnswer(it).length > 0);

  async function handlePrepare() {
    if (!textoContent || !theme) return;
    setPreparing(true);
    setItemsLectura([]);
    setItemsAuditiva([]);
    setAnswers({});
    setVfChoice({});
    setVfJustif({});
    setAudioUrl(null);
    try {
      // Reading items (always).
      const lecturaRes = await supabase.functions.invoke("generate-questions-paper2-b", {
        body: { source_text: textoContent, seccion: "lectura", ui_lang: lang, nivel },
      });
      if (lecturaRes.error || lecturaRes.data?.error) {
        toast.error(
          lecturaRes.data?.error ??
            (await getFunctionErrorMessage(
              lecturaRes.error,
              isEN
                ? "Could not prepare the reading section."
                : "No se pudo preparar la sección de lectura.",
            )),
        );
        return;
      }
      const lecturaItems: Item[] = Array.isArray(lecturaRes.data?.items)
        ? lecturaRes.data.items
        : [];

      // Listening items + audio (optional).
      let auditivaItems: Item[] = [];
      if (selectedAudio) {
        const [itemsRes, ttsRes] = await Promise.all([
          supabase.functions.invoke("generate-questions-paper2-b", {
            // El cliente no recibe la transcripción: la genera el servidor leyéndola
            // de audios_paper2_b. Aquí pedimos al backend ítems para ese audio.
            body: { audio_id: selectedAudio.id, seccion: "auditiva", ui_lang: lang, nivel },
          }),
          supabase.functions.invoke("tts-listening-b", { body: { audio_id: selectedAudio.id } }),
        ]);
        if (itemsRes.error || itemsRes.data?.error) {
          toast.error(
            itemsRes.data?.error ??
              (await getFunctionErrorMessage(
                itemsRes.error,
                isEN
                  ? "Could not prepare the listening section."
                  : "No se pudo preparar la sección auditiva.",
              )),
          );
          return;
        }
        auditivaItems = Array.isArray(itemsRes.data?.items) ? itemsRes.data.items : [];
        if (ttsRes.data?.url) setAudioUrl(ttsRes.data.url as string);
        else toast.warning(isEN ? "Audio could not be loaded." : "No se pudo cargar el audio.");
      }

      if (lecturaItems.length === 0 && auditivaItems.length === 0) {
        toast.error(
          isEN
            ? "No items were generated. Try again."
            : "No se generaron ítems. Inténtalo de nuevo.",
        );
        return;
      }
      setItemsLectura(lecturaItems);
      setItemsAuditiva(auditivaItems);
      setStep("answer");
      void refreshRol();
    } catch (e) {
      console.error(e);
      toast.error(isEN ? "Something went wrong." : "Algo salió mal.");
    } finally {
      setPreparing(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !theme) return;
    setSubmitting(true);
    setEvaluacion(null);
    try {
      const buildResp = (items: Item[]) =>
        Object.fromEntries(items.map((it) => [it.id, composedAnswer(it)]));

      const body: Record<string, unknown> = {
        course_key: "spanish-b-language",
        nivel,
        theme,
        ui_lang: lang,
      };
      if (itemsLectura.length > 0) {
        body.texto_id = isCustom ? null : (selectedTexto?.id ?? null);
        body.lectura = {
          texto_content: textoContent,
          items: itemsLectura,
          respuestas: buildResp(itemsLectura),
        };
      }
      if (itemsAuditiva.length > 0 && selectedAudio) {
        body.audio_id = selectedAudio.id;
        body.auditiva = {
          items: itemsAuditiva,
          respuestas: buildResp(itemsAuditiva),
        };
      }

      const { data, error } = await supabase.functions.invoke("evaluate-paper2-b", { body });
      if (error) {
        toast.error(
          await getFunctionErrorMessage(error, isEN ? "Could not mark." : "No se pudo corregir."),
        );
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setEvaluacion(data as EvaluacionP2B);
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
    setStep("setup");
    setItemsLectura([]);
    setItemsAuditiva([]);
    setAnswers({});
    setVfChoice({});
    setVfJustif({});
    setAudioUrl(null);
    setSelectedTextoId("");
    setCustomText("");
    setSelectedAudioId("none");
  }

  if (submitting) {
    return (
      <Card className="p-6">
        <JuegoEsperaEvaluacion modo="prueba1" />
      </Card>
    );
  }

  if (evaluacion) {
    return <ResultadoP2B evaluacion={evaluacion} t={t} onReset={handleReset} isEN={isEN} />;
  }

  const renderItem = (it: Item, index: number) => (
    <div key={it.id} className="space-y-2">
      <Label className="font-serif text-base text-ink">
        {index + 1}. {it.enunciado}{" "}
        <span className="text-[11px] text-muted-foreground">({it.puntos} pt)</span>
      </Label>
      {it.formato === "opcion_multiple" && it.opciones && (
        <div className="grid gap-2">
          {it.opciones.map((op) => {
            const active = answers[it.id] === op;
            return (
              <button
                key={op}
                type="button"
                onClick={() => setAnswer(it.id, op)}
                className={`text-left text-sm rounded-md border px-3 py-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-ink"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      )}
      {it.formato === "vf_justificacion" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {(["Verdadero", "Falso"] as const).map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={vfChoice[it.id] === opt ? "default" : "outline"}
                onClick={() => setVfChoice((p) => ({ ...p, [it.id]: opt }))}
              >
                {opt === "Verdadero" ? t.trueLbl : t.falseLbl}
              </Button>
            ))}
          </div>
          <Textarea
            value={vfJustif[it.id] ?? ""}
            onChange={(e) => setVfJustif((p) => ({ ...p, [it.id]: e.target.value }))}
            placeholder={t.justifyPh}
            rows={2}
          />
        </div>
      )}
      {it.formato === "respuesta_corta" && (
        <Textarea
          value={answers[it.id] ?? ""}
          onChange={(e) => setAnswer(it.id, e.target.value)}
          placeholder={t.shortPh}
          rows={2}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            {isEN ? "Receptive skills · Paper 2" : "Destrezas receptivas · Prueba 2"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">{t.subtitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.comprehensionOnly}</p>
          <div className="flex items-center gap-3 mt-3">
            <SelectorNivel value={nivel} onChange={setNivel} disabled={step !== "setup"} />
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

      {step === "setup" && (
        <Card className="p-5 space-y-5">
          {/* Reading source */}
          <div className="space-y-2">
            <Label>{t.textoLabel}</Label>
            <Select value={selectedTextoId} onValueChange={(v) => setSelectedTextoId(v)}>
              <SelectTrigger>
                <SelectValue placeholder={t.textoPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {textos.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>
                    {isEN ? tx.title_en : tx.title_es} ·{" "}
                    {THEME_LABELS[tx.theme][isEN ? "en" : "es"]}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t.custom}</SelectItem>
              </SelectContent>
            </Select>
            {!loadingSources && textos.length === 0 && (
              <p className="text-xs text-muted-foreground">{t.noTextos}</p>
            )}
          </div>

          {selectedTexto && (
            <>
              <Card className="p-4 bg-parchment border-border max-h-60 overflow-y-auto">
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

          {/* Listening source (optional) */}
          {audios.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5" /> {t.audioLabel}
              </Label>
              <Select value={selectedAudioId} onValueChange={(v) => setSelectedAudioId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.audioPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.audioNone}</SelectItem>
                  {audios.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {isEN ? a.title_en : a.title_es} · {THEME_LABELS[a.theme][isEN ? "en" : "es"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <CreditGate
              coste={prepCost}
              concepto="Spanish B Paper 2 — preparación"
              open={showCreditGatePrep}
              onConfirm={() => {
                setShowCreditGatePrep(false);
                void handlePrepare();
              }}
              onCancel={() => setShowCreditGatePrep(false)}
            />
            {!preparing && <CreditCostBadge coste={prepCost} />}
            <Button
              onClick={() => setShowCreditGatePrep(true)}
              disabled={preparing || !theme || textoContent.length <= 50}
              className="gap-2"
            >
              {preparing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {preparing ? t.preparing : t.prepBtn}
            </Button>
            {textoContent.length <= 50 && (
              <span className="text-xs text-muted-foreground">{t.prepHint}</span>
            )}
          </div>
        </Card>
      )}

      {step === "answer" && (
        <>
          {itemsAuditiva.length > 0 && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Headphones className="h-4 w-4" /> {t.listeningSection}
                <span className="text-[11px] text-muted-foreground">/ 25</span>
              </div>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
              <p className="text-xs text-muted-foreground">{t.listenHint}</p>
              <div className="space-y-5">{itemsAuditiva.map((it, i) => renderItem(it, i))}</div>
            </Card>
          )}

          {itemsLectura.length > 0 && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <BookOpen className="h-4 w-4" /> {t.readingSection}
                <span className="text-[11px] text-muted-foreground">/ 40</span>
              </div>
              <Card className="p-4 bg-parchment border-border max-h-60 overflow-y-auto">
                <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
                  {textoContent}
                </p>
              </Card>
              <div className="space-y-5">{itemsLectura.map((it, i) => renderItem(it, i))}</div>
            </Card>
          )}

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
            <Button onClick={() => setShowCreditGate(true)} disabled={!canSubmit} size="lg">
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
  listening: string;
  reading: string;
  strengths: string;
  improve: string;
  global: string;
  marks: { acierto: string; parcial: string; fallo: string };
};

function ResultadoP2B({
  evaluacion,
  t,
  onReset,
  isEN,
}: {
  evaluacion: EvaluacionP2B;
  t: P2Translations;
  onReset: () => void;
  isEN: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {isEN ? "Receptive skills · Paper 2" : "Destrezas receptivas · Prueba 2"}
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">{t.title}</h2>
        </div>
        <Button variant="outline" onClick={onReset} className="shrink-0">
          <X className="h-4 w-4 mr-1" /> {t.backToForm}
        </Button>
      </div>

      <Card className="p-6 bg-primary text-primary-foreground border-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70">
              {isEN ? "Result" : "Resultado"}
            </div>
            <div className="font-serif text-2xl">
              {isEN ? "Examiner's marking" : "Corrección del examinador"}
            </div>
            <div className="text-[11px] opacity-70 flex gap-3">
              {evaluacion.subtotal_auditiva !== null && (
                <span>
                  {t.listening}: {evaluacion.subtotal_auditiva}/25
                </span>
              )}
              {evaluacion.subtotal_lectura !== null && (
                <span>
                  {t.reading}: {evaluacion.subtotal_lectura}/40
                </span>
              )}
            </div>
          </div>
          <div className="flex items-end gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{t.score}</div>
              <div className="font-serif text-5xl font-semibold leading-none mt-1">
                {evaluacion.puntuacion_total}
                <span className="text-lg opacity-60 font-normal">
                  {" "}
                  / {evaluacion.puntuacion_max}
                </span>
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

      {evaluacion.items_auditiva.length > 0 && (
        <SeccionResultado titulo={t.listening} items={evaluacion.items_auditiva} t={t} />
      )}
      {evaluacion.items_lectura.length > 0 && (
        <SeccionResultado titulo={t.reading} items={evaluacion.items_lectura} t={t} />
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
    </div>
  );
}

function SeccionResultado({
  titulo,
  items,
  t,
}: {
  titulo: string;
  items: ItemResult[];
  t: P2Translations;
}) {
  const markStyle: Record<ItemResult["marca"], string> = {
    acierto: "bg-success text-success-foreground",
    parcial: "bg-amber-500 text-white",
    fallo: "bg-destructive text-destructive-foreground",
  };
  return (
    <Card className="p-5 space-y-4">
      <div className="text-sm font-medium text-ink">{titulo}</div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div
            key={it.id}
            className="border-t border-border pt-3 first:border-t-0 first:pt-0 space-y-1"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink">
                {i + 1}. {it.enunciado}
              </p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap ${markStyle[it.marca]}`}
              >
                {t.marks[it.marca]} · {it.puntos_obtenidos}/{it.puntos}
              </span>
            </div>
            <p className="text-sm text-foreground/80 pl-3 border-l-2 border-border font-serif">
              {it.respuesta || "—"}
            </p>
            {it.comentario && <p className="text-xs text-muted-foreground">{it.comentario}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
