import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EvaluacionPrueba2Panel } from "@/components/EvaluacionPrueba2Panel";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { BotónDictado } from "@/components/BotónDictado";
import { SelectorNivel, type Nivel } from "@/components/SelectorNivel";
import { useDictado } from "@/hooks/useDictado";
import { SelectorPreguntaP2 } from "@/components/SelectorPreguntaP2";
import type { EvaluacionPrueba2 } from "@/lib/ib-paper2";
import type { GamificacionResultado } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, History, Loader2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

export const Route = createFileRoute("/prueba-2")({
  head: () => ({
    meta: [
      { title: "LIBerico — Prueba 2 IB Español A" },
      {
        name: "description",
        content:
          "Entrena tu ensayo comparativo de Prueba 2 con evaluación IB básica y feedback completo bajo demanda.",
      },
    ],
  }),
  component: Prueba2Page,
});

function Prueba2Page() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";
  const navigate = useNavigate();

  const [pregunta, setPregunta] = useState("");
  const [obra1, setObra1] = useState("");
  const [obra2, setObra2] = useState("");
  const [notasObra1, setNotasObra1] = useState("");
  const [notasObra2, setNotasObra2] = useState("");
  const [nivel, setNivel] = useState<Nivel>("SL");
  const [ensayo, setEnsayo] = useState("");

  const {
    dictando: dictandoEnsayo,
    interimTexto: interimEnsayo,
    toggleDictado: toggleDictadoEnsayo,
  } = useDictado((t) => setEnsayo((prev) => (prev || "") + "<p>" + t.trim() + "</p>"));
  const [evaluacion, setEvaluacion] = useState<EvaluacionPrueba2 | null>(null);
  const [gamificacion, setGamificacion] = useState<GamificacionResultado | undefined>(undefined);
  const [ensayoEnviado, setEnsayoEnviado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
    }
  }, [user, authLoading, rol, navigate]);

  const evaluar = async () => {
    const ensayoPlano = stripHtml(ensayo);
    if (!pregunta.trim() || !obra1.trim() || !obra2.trim() || !ensayoPlano) {
      toast.error(
        isEN
          ? "Question, both works, and essay are required."
          : "La pregunta, las dos obras y el ensayo son obligatorios."
      );
      return;
    }
    setLoading(true);
    setEvaluacion(null);
    setEnsayoEnviado(ensayoPlano);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-paper2", {
        body: {
          pregunta: pregunta.trim(),
          obra_1: obra1.trim(),
          obra_2: obra2.trim(),
          notas_obra_1: notasObra1.trim() || undefined,
          notas_obra_2: notasObra2.trim() || undefined,
          ensayo: ensayoPlano,
          ensayo_html: ensayo,
          nivel,
          course_key: courseKey,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(
          error,
          isEN ? "Error assessing." : "Error al evaluar."
        );
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error as string);

      const ev = data as EvaluacionPrueba2;
      setEvaluacion(ev);
      if (data?.gamificacion) setGamificacion(data.gamificacion as GamificacionResultado);
      toast.success(
        isEN ? `Assessment complete · ${ev.puntuacion_total}/25` : `Evaluación completada · ${ev.puntuacion_total}/25`
      );
      setTimeout(() => {
        document
          .getElementById("resultados-p2")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEN
            ? "Error assessing."
            : "Error al evaluar."
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
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            {isEN ? "Comparative essay assessor" : "Corrector de ensayo comparativo"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            {isEN
              ? "Assess your Paper 2 essay against the official IB criteria."
              : "Evalúa tu ensayo de Prueba 2 según los criterios oficiales del IB."}
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            {isEN
              ? "Enter the chosen question, the two works, and your comparative essay. You will receive a score for each of the five criteria (A, B1, B2, C, D), with optional full feedback."
              : "Escribe la pregunta elegida, las dos obras y tu ensayo comparativo. Recibirás una valoración por los cinco criterios (A, B1, B2, C, D), con feedback completo opcional cuando quieras profundizar."}
          </p>
          <Link
            to="/historial-prueba-2"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {isEN ? "View my previous assessments" : "Ver mis evaluaciones anteriores"}
          </Link>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8 border-border space-y-6">
          {/* Nivel */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {isEN ? "Course level" : "Nivel del curso"}
            </Label>
            <SelectorNivel value={nivel} onChange={setNivel} disabled={loading} />
          </div>
          {/* Pregunta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label
                htmlFor="pregunta"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {isEN ? "Paper 2 question" : "Pregunta de Prueba 2"}
              </Label>
              <SelectorPreguntaP2 onSeleccion={(p) => setPregunta(p)} />
            </div>
            <p className="text-xs text-muted-foreground/70">
              {isEN
                ? "Enter the exact question from the official exam paper, or write the question you'll choose in the exam."
                : "Copia la pregunta exacta del enunciado oficial, o escribe la que elegirás en el examen."}
            </p>
            <Input
              id="pregunta"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder={isEN
                ? "E.g.: In what ways do two works present the conflict between the individual and society?"
                : "Ej.: ¿De qué manera dos obras estudiadas presentan el conflicto entre individuo y sociedad?"}
              disabled={loading}
            />
          </div>

          {/* Obras */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="obra1"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {isEN ? "Work 1" : "Obra 1"}
              </Label>
              <Input
                id="obra1"
                value={obra1}
                onChange={(e) => setObra1(e.target.value)}
                placeholder={isEN ? "Title and author" : "Título y autor"}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="obra2"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {isEN ? "Work 2" : "Obra 2"}
              </Label>
              <Input
                id="obra2"
                value={obra2}
                onChange={(e) => setObra2(e.target.value)}
                placeholder={isEN ? "Title and author" : "Título y autor"}
                disabled={loading}
              />
            </div>
          </div>

          {/* Notas opcionales */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="notas1"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {isEN ? "Optional notes on Work 1" : "Notas opcionales sobre obra 1"}
              </Label>
              <Textarea
                id="notas1"
                value={notasObra1}
                onChange={(e) => setNotasObra1(e.target.value)}
                placeholder={
                  isEN
                    ? "Key scenes, characters, resources, themes or brief quotes for the assessor. Don't paste the full work."
                    : "Escenas, personajes, recursos, temas o citas breves que quieres que el corrector tenga en cuenta. No pegues la obra completa."
                }
                rows={4}
                disabled={loading}
                className="resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="notas2"
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {isEN ? "Optional notes on Work 2" : "Notas opcionales sobre obra 2"}
              </Label>
              <Textarea
                id="notas2"
                value={notasObra2}
                onChange={(e) => setNotasObra2(e.target.value)}
                placeholder={
                  isEN
                    ? "Key scenes, characters, resources, themes or brief quotes for the assessor. Don't paste the full work."
                    : "Escenas, personajes, recursos, temas o citas breves que quieres que el corrector tenga en cuenta. No pegues la obra completa."
                }
                rows={4}
                disabled={loading}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Ensayo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {isEN ? "Your comparative essay" : "Tu ensayo comparativo"}
              </Label>
              <div className="flex items-center gap-1.5">
                <BotónDictado
                  dictando={dictandoEnsayo}
                  onToggle={toggleDictadoEnsayo}
                  disabled={loading}
                />
                <ImageUploadButton label={isEN ? "Upload photo" : "Subir foto"} onTranscripcion={(t) => setEnsayo(t)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {isEN
                ? "Write or paste your essay as you would submit it: comparative thesis, arguments with textual evidence from both works, and conclusion."
                : "Escribe o pega tu ensayo tal como lo entregarías: tesis comparativa, argumentos con textualidad de ambas obras y conclusión."}
            </p>
            <RichTextEditor
              value={ensayo}
              onChange={setEnsayo}
              placeholder={isEN ? "Write your comparative essay here…" : "Escribe aquí tu ensayo comparativo…"}
              minHeight="280px"
              disabled={loading}
              showWordCount
            />
            {dictandoEnsayo && interimEnsayo && (
              <p className="text-[11px] text-muted-foreground italic px-1">{interimEnsayo}…</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {isEN
                ? "Your assessment is automatically saved in "
                : "Tu evaluación se guarda automáticamente en "}
              <Link to="/historial-prueba-2" className="text-foreground/80 hover:underline">
                {isEN ? "Paper 2 History" : "Historial P2"}
              </Link>
              .
            </p>
            <Button onClick={evaluar} disabled={loading} size="lg" className="sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEN ? "Assessing…" : "Evaluando…"}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {isEN ? "Assess essay" : "Evaluar ensayo"}
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Juego de espera */}
        {loading && (
          <div className="mt-6">
            <JuegoEsperaEvaluacion modo="prueba2" />
          </div>
        )}

        {/* Resultados */}
        {evaluacion && (
          <section id="resultados-p2" className="mt-12 scroll-mt-20">
            <EvaluacionPrueba2Panel
              ev={evaluacion}
              ensayo={ensayoEnviado}
              autoGenerar
              resultadoInicialBasico
              gamificacion={gamificacion}
              onEvaluacionChange={setEvaluacion}
              onSugerenciasChange={(sugerencias) =>
                setEvaluacion((actual) =>
                  actual ? { ...actual, sugerencias_reescritura: sugerencias } : actual,
                )
              }
              onEnsayoChange={(ensayoBanda5) =>
                setEvaluacion((actual) =>
                  actual ? { ...actual, ensayo_banda_5: ensayoBanda5 } : actual,
                )
              }
            />
          </section>
        )}
      </main>
    </div>
  );
}
