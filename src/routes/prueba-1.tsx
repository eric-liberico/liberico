import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditGate, CreditCostBadge } from "@/components/CreditGate";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SpanishBPaper1View } from "@/components/SpanishBPaper1View";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EvaluacionPanel } from "@/components/EvaluacionPanel";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { BotónDictado } from "@/components/BotónDictado";
import { SelectorNivel, type Nivel } from "@/components/SelectorNivel";
import { useDictado } from "@/hooks/useDictado";
import type { Evaluacion } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, History, Loader2, Sparkles, X } from "lucide-react";

type CriterioKey = "a" | "b" | "c" | "d";
const CRITERIO_LABEL: Record<
  CriterioKey,
  { letra: string; tab: "identificacion" | "efectos" | "reescritura" | "teoria"; ejercicio: string }
> = {
  a: { letra: "A", tab: "identificacion", ejercicio: "Identificación de recursos" },
  b: { letra: "B", tab: "efectos", ejercicio: "Análisis de efectos" },
  c: { letra: "C", tab: "reescritura", ejercicio: "Reescritura" },
  d: { letra: "D", tab: "teoria", ejercicio: "Recursos literarios" },
};

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/prueba-1")({
  validateSearch: (search: Record<string, unknown>): { texto_id?: string } => ({
    texto_id:
      typeof search.texto_id === "string" && UUID_RE.test(search.texto_id)
        ? search.texto_id
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "LIBerico — Literary analysis assessor · Paper 1" },
      {
        name: "description",
        content:
          "Train your literary commentary with IB-level feedback. Criteria A–D, estimated grade, and annotated solution.",
      },
    ],
  }),
  component: Prueba1Page,
});

// Dispatcher por curso. El cuerpo Lit vive en Prueba1LitPage para que React
// no rompa las reglas de hooks al cambiar de curso (los hooks Lit no se llaman
// cuando el usuario está en Spanish B, y viceversa).
function Prueba1Page() {
  const { courseKey } = useAuth();
  if (courseKey === "spanish-b-language") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
          <SpanishBPaper1View />
        </main>
      </div>
    );
  }
  return <Prueba1LitPage />;
}

function Prueba1LitPage() {
  const { user, loading: authLoading, rol, courseKey, refreshRol } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const { texto_id } = Route.useSearch();
  const [texto, setTexto] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [analisis, setAnalisis] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [textoPlanoGuardado, setTextoPlanoGuardado] = useState("");
  const [analisisPlanoGuardado, setAnalisisPlanoGuardado] = useState("");
  const [nivel, setNivel] = useState<Nivel>("SL");
  const [loading, setLoading] = useState(false);
  const [showCreditGateP1, setShowCreditGateP1] = useState(false);
  const [bannerDebil, setBannerDebil] = useState<CriterioKey | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  const {
    dictando: dictandoTexto,
    interimTexto: interimTexto1,
    toggleDictado: toggleDictadoTexto,
  } = useDictado((t) => setTexto((prev) => (prev || "") + "<p>" + t.trim() + "</p>"));
  const {
    dictando: dictandoAnalisis,
    interimTexto: interimAnalisis,
    toggleDictado: toggleDictadoAnalisis,
  } = useDictado((t) => setAnalisis((prev) => (prev || "") + "<p>" + t.trim() + "</p>"));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") navigate({ to: "/profesor" });
  }, [user, authLoading, rol, navigate]);

  // Pre-rellenar desde la biblioteca cuando llega ?texto_id=
  // Valida que el texto pertenezca al curso activo del usuario
  useEffect(() => {
    if (!texto_id || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("textos_practica_p1")
      .select("texto, pregunta, course_key")
      .eq("id", texto_id)
      .eq("activo", true)
      .eq("course_key", courseKey)
      .maybeSingle()
      .then(
        ({ data }: { data: { texto: string; pregunta: string; course_key: string } | null }) => {
          if (!data) return;
          setTexto(data.texto);
          setPregunta(data.pregunta);
          document
            .getElementById("form-p1")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      );
  }, [texto_id, user, courseKey]);

  // Banner del criterio más débil — filtrado por curso activo
  useEffect(() => {
    if (!user) return;
    supabase
      .from("evaluaciones")
      .select("banda_a, banda_b, banda_c, banda_d")
      .eq("course_key", courseKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const scores: Record<CriterioKey, number> = {
          a: data.banda_a,
          b: data.banda_b,
          c: data.banda_c,
          d: data.banda_d,
        };
        const min = Math.min(...Object.values(scores));
        const debil = (["a", "b", "c", "d"] as CriterioKey[]).find((k) => scores[k] === min)!;
        setBannerDebil(debil);
      });
  }, [user, courseKey]);

  const evaluar = async () => {
    const textoPlano = stripHtml(texto);
    const analisisPlano = stripHtml(analisis);
    if (!textoPlano || !pregunta.trim() || !analisisPlano) {
      toast.error(
        isEN
          ? "Complete all three fields before assessing."
          : "Completa los tres campos antes de evaluar.",
      );
      return;
    }
    setLoading(true);
    setEvaluacion(null);
    setTextoPlanoGuardado(textoPlano);
    setAnalisisPlanoGuardado(analisisPlano);
    trackEvent("evaluation_started", "p1_literature", { course_key: courseKey });
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-analysis", {
        body: {
          texto: textoPlano,
          pregunta,
          analisis: analisisPlano,
          texto_html: texto,
          analisis_html: analisis,
          texto_id,
          nivel,
          course_key: courseKey,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(error, "Error al evaluar.");
        console.error("Supabase functions error:", error);
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      const ev = data as Evaluacion;
      setEvaluacion(ev);
      void refreshRol();
      trackEvent("evaluation_completed", "p1_literature", {
        course_key: courseKey,
        nota_ib: ev.nota_ib,
      });
      toast.success(
        isEN
          ? `Assessment complete · ${ev.puntuacion_total}/20 · IB ${ev.nota_ib}`
          : `Evaluación completada · ${ev.puntuacion_total}/20 · IB ${ev.nota_ib}`,
      );
      setTimeout(() => {
        document
          .getElementById("resultados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : isEN ? "Error assessing." : "Error al evaluar.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || rol === "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        {/* Hero */}
        <div className="max-w-3xl mb-10">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {isEN
              ? "Literary analysis assessor · Paper 1"
              : "Corrector de análisis literario · Prueba 1"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            {isEN
              ? "Assess your commentary against the official IB criteria."
              : "Evalúa tu comentario según los criterios oficiales del IB."}
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            {isEN
              ? "Paste the literary extract, the guiding question, and your analysis. You will receive a score for each of the four criteria (A–D), your total out of 20, and the estimated grade."
              : "Pega el texto literario, la pregunta de orientación y tu análisis. Recibirás una valoración por los cuatro criterios (A–D), tu puntuación sobre 20 y la nota estimada."}
          </p>
          <Link
            to="/historial"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {isEN ? "View my previous assessments" : "Ver mis evaluaciones anteriores"}
          </Link>
        </div>

        {/* Banner: criterio débil de la última evaluación */}
        {!evaluacion &&
          bannerDebil &&
          bannerVisible &&
          (() => {
            const cfg = CRITERIO_LABEL[bannerDebil];
            const ejercicioLabels: Record<CriterioKey, { es: string; en: string }> = {
              a: { es: "Identificación de recursos", en: "Resource identification" },
              b: { es: "Análisis de efectos", en: "Effect analysis" },
              c: { es: "Reescritura", en: "Rewriting" },
              d: { es: "Recursos literarios", en: "Literary resources" },
            };
            const ejercicioLabel = isEN
              ? ejercicioLabels[bannerDebil].en
              : ejercicioLabels[bannerDebil].es;
            return (
              <div className="mb-6 relative rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
                <button
                  onClick={() => setBannerVisible(false)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={isEN ? "Close" : "Cerrar"}
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm text-foreground/80 pr-6">
                  {isEN
                    ? `Last time your weakest criterion was Criterion ${cfg.letra}. Want to practise before your next analysis?`
                    : `La última vez tu punto más débil fue el Criterio ${cfg.letra}. ¿Practicamos antes de tu siguiente análisis?`}
                </p>
                <div className="mt-3">
                  <Button
                    asChild
                    size="sm"
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white gap-1.5 h-8 text-xs"
                  >
                    <Link to="/ejercicios" search={{ tab: cfg.tab }}>
                      {ejercicioLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })()}

        {/* Form */}
        <Card id="form-p1" className="p-6 sm:p-8 border-border">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="space-y-0.5">
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {isEN ? "Course level" : "Nivel del curso"}
              </Label>
              {nivel === "HL" && (
                <p className="text-[11px] text-muted-foreground/70">
                  {isEN
                    ? "HL typically includes two unseen texts; this tool assesses one analysis at a time."
                    : "HL/NS normalmente incluye dos textos; esta herramienta evalúa un análisis a la vez."}
                </p>
              )}
            </div>
            <SelectorNivel value={nivel} onChange={setNivel} disabled={loading} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Texto literario */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {isEN ? "Literary extract" : "Texto literario"}
                </Label>
                <div className="flex items-center gap-1.5">
                  <BotónDictado
                    dictando={dictandoTexto}
                    onToggle={toggleDictadoTexto}
                    disabled={loading}
                    isEN={isEN}
                  />
                  <ImageUploadButton
                    label={isEN ? "Upload photo" : "Subir foto"}
                    onTranscripcion={(t) => setTexto(t)}
                    isEN={isEN}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70">
                {isEN
                  ? "Paste the poem, prose extract, or dramatic text from the exam. Free format, preserve the original."
                  : "Pega el poema, fragmento de prosa o texto dramático del examen. Formato libre, conserva el original."}
              </p>
              <RichTextEditor
                value={texto}
                onChange={setTexto}
                placeholder={
                  isEN ? "Paste the literary extract here…" : "Pega aquí el fragmento literario…"
                }
                minHeight="220px"
                className="font-serif"
                disabled={loading}
                isEN={isEN}
              />
              {dictandoTexto && interimTexto1 && (
                <p className="text-[11px] text-muted-foreground italic px-1">{interimTexto1}…</p>
              )}
            </div>

            <div className="space-y-6">
              {/* Pregunta */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pregunta"
                  className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {isEN ? "Guiding question" : "Pregunta de orientación"}
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  {isEN
                    ? "If the exam does not include an explicit question, write the central aspect you will develop."
                    : "Si el examen no incluye pregunta explícita, escribe el aspecto central que vas a desarrollar."}
                </p>
                <Input
                  id="pregunta"
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  placeholder={
                    isEN
                      ? "E.g.: How does the speaker construct the image of time?"
                      : "Ej.: ¿Cómo construye la voz poética la imagen del tiempo?"
                  }
                  disabled={loading}
                />
              </div>

              {/* Análisis */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {isEN ? "Your analysis" : "Tu análisis"}
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <BotónDictado
                      dictando={dictandoAnalisis}
                      onToggle={toggleDictadoAnalisis}
                      disabled={loading}
                      isEN={isEN}
                    />
                    <ImageUploadButton
                      label={isEN ? "Upload photo" : "Subir foto"}
                      onTranscripcion={(t) => setAnalisis(t)}
                      isEN={isEN}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  {isEN
                    ? "Write or paste your response as you would submit it: introduction with thesis, analytical body, and conclusion."
                    : "Escribe o pega tu respuesta tal como la entregarías: introducción con tesis, cuerpo analítico y conclusión."}
                </p>
                <RichTextEditor
                  value={analisis}
                  onChange={setAnalisis}
                  placeholder={
                    isEN
                      ? "Write your analytical commentary here…"
                      : "Escribe aquí tu comentario analítico…"
                  }
                  minHeight="180px"
                  disabled={loading}
                  showWordCount
                  isEN={isEN}
                />
                {dictandoAnalisis && interimAnalisis && (
                  <p className="text-[11px] text-muted-foreground italic px-1">
                    {interimAnalisis}…
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isEN
                ? "Your assessments are automatically saved in Progress."
                : "Tus evaluaciones se guardan automáticamente en Progreso."}
            </p>
            <div className="flex items-center gap-3">
              <CreditGate
                coste={1.5}
                concepto={
                  isEN
                    ? "Literature Paper 1 — basic assessment"
                    : "Literature Prueba 1 — corrección básica"
                }
                open={showCreditGateP1}
                onConfirm={() => {
                  setShowCreditGateP1(false);
                  void evaluar();
                }}
                onCancel={() => setShowCreditGateP1(false)}
              />
              {!loading && <CreditCostBadge coste={1.5} />}
              <Button
                onClick={() => setShowCreditGateP1(true)}
                disabled={loading}
                size="lg"
                className="sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEN ? "Assessing…" : "Evaluando…"}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {isEN ? "Assess analysis" : "Evaluar análisis"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="mt-6">
            <JuegoEsperaEvaluacion modo="prueba1" />
          </div>
        )}

        {evaluacion && (
          <section id="resultados" className="mt-12 scroll-mt-20">
            <EvaluacionPanel
              ev={evaluacion}
              textoLiterario={textoPlanoGuardado}
              analisisTexto={analisisPlanoGuardado}
              resultadoInicialBasico
              autoGenerarReescrituras
              onEvaluacionChange={setEvaluacion}
            />
          </section>
        )}
      </main>
    </div>
  );
}
