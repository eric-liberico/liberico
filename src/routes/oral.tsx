import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluacionOralPanel } from "@/components/EvaluacionOralPanel";
import { GuiaOral } from "@/components/GuiaOral";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { BotónDictado } from "@/components/BotónDictado";
import { SelectorNivel, type Nivel } from "@/components/SelectorNivel";
import { useDictado } from "@/hooks/useDictado";
import { SugeridorOral } from "@/components/SugeridorOral";
import { PanelApuntesOral } from "@/components/PanelApuntesOral";
import type { EvaluacionOral, TipoOral, TipoObraOral } from "@/lib/ib-oral";
import type { GamificacionResultado } from "@/lib/ib";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { COURSES, getObraTipoOpciones } from "@/lib/ib-courses";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, History, Loader2, Mic, Sparkles, Upload, X } from "lucide-react";

export const Route = createFileRoute("/oral")({
  head: () => ({
    meta: [
      { title: "LIBerico — Individual Oral IB" },
      {
        name: "description",
        content:
          "Prepare and assess your Individual Oral for Language A: Literature with IB-level feedback. Four criteria, global issue diagnostic, and preparation guide.",
      },
    ],
  }),
  component: OralPage,
});

function leerDuracionAudio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duracion = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null;
      cleanup();
      resolve(duracion);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = url;
  });
}

function OralPage() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const oralEnabled = COURSES[courseKey].capabilities.oralEnabled;

  const [nivel, setNivel] = useState<Nivel>("SL");
  const [tipoOral, setTipoOral] = useState<TipoOral>("taught");
  const [asuntoGlobal, setAsuntoGlobal] = useState("");
  const [obra1Titulo, setObra1Titulo] = useState("");
  const [obra1Autor, setObra1Autor] = useState("");
  const [obra1Tipo, setObra1Tipo] = useState<TipoObraOral>("original_language");
  const [extracto1, setExtracto1] = useState("");
  const [notasObra1, setNotasObra1] = useState("");
  const [obra2Titulo, setObra2Titulo] = useState("");
  const [obra2Autor, setObra2Autor] = useState("");
  const [obra2Tipo, setObra2Tipo] = useState<TipoObraOral>("in_translation");
  const [extracto2, setExtracto2] = useState("");
  const [notasObra2, setNotasObra2] = useState("");
  const [guionOral, setGuionOral] = useState("");
  const [duracionReal, setDuracionReal] = useState("");

  const {
    dictando: dictandoGuion,
    interimTexto: interimGuion,
    toggleDictado: toggleDictadoGuion,
  } = useDictado((t) => setGuionOral((prev) => prev + (prev.trim() ? "\n\n" : "") + t.trim()));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionOral | null>(null);
  const [gamificacion, setGamificacion] = useState<GamificacionResultado | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState<"sugeridor" | "formulario">("formulario");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
      return;
    }
    if (!oralEnabled) {
      navigate({ to: "/asignaturas" });
    }
  }, [user, authLoading, rol, oralEnabled, navigate]);

  // Advertencias de validación
  const advertencias: string[] = [];
  if (obra1Tipo !== "unspecified" && obra2Tipo !== "unspecified") {
    if (obra1Tipo === obra2Tipo) {
      advertencias.push(
        isEN
          ? "Both works have the same type. Language A: Literature requires one work in the language of study and one in translation."
          : "Las dos obras tienen el mismo tipo. Para Language A: Literature se necesita una obra en la lengua del curso y una en traducción.",
      );
    } else {
      const hayOriginal = obra1Tipo === "original_language" || obra2Tipo === "original_language";
      const hayTraducida = obra1Tipo === "in_translation" || obra2Tipo === "in_translation";
      if (!hayOriginal)
        advertencias.push(
          isEN
            ? "No work is marked as written in the language of study."
            : "Ninguna obra está marcada como escrita en la lengua del curso.",
        );
      if (!hayTraducida)
        advertencias.push(
          isEN
            ? "No work is marked as studied in translation."
            : "Ninguna obra está marcada como estudiada en traducción.",
        );
    }
  }
  if (asuntoGlobal.trim().length > 0 && asuntoGlobal.trim().length < 15) {
    advertencias.push(
      isEN
        ? "The global issue seems too short. Try to be more specific and concrete."
        : "El asunto global parece demasiado corto. Intenta ser más específico y concreto.",
    );
  }
  if (asuntoGlobal.trim().split(/\s+/).length < 4 && asuntoGlobal.trim().length > 0) {
    advertencias.push(
      isEN
        ? "The global issue seems too broad. A good global issue has at least 8-12 words."
        : "El asunto global parece demasiado amplio. Un buen asunto global tiene al menos 8-12 palabras.",
    );
  }

  const transcribir = async () => {
    if (!audioFile || !user) return;
    if (audioFile.size > 25 * 1024 * 1024) {
      toast.error(
        isEN
          ? "File exceeds 25 MB. Compress the audio before uploading."
          : "El archivo supera 25 MB. Comprime el audio antes de subir.",
      );
      return;
    }
    setTranscribiendo(true);
    let storagePath: string | null = null;
    try {
      const duracionArchivo = await leerDuracionAudio(audioFile);

      // 1. Subir el audio directamente a Storage (sin pasar por edge function)
      const ext = audioFile.name.split(".").pop() ?? "webm";
      storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-oral")
        .upload(storagePath, audioFile, { contentType: audioFile.type, upsert: false });
      if (uploadError)
        throw new Error(
          isEN
            ? "Could not upload file. Try again."
            : "No se pudo subir el archivo. Inténtalo de nuevo.",
        );

      // 2. Llamar al edge function con el path (descarga, transcribe y borra en servidor)
      const { data, error } = await supabase.functions.invoke("transcribe-oral", {
        body: {
          storage_path: storagePath,
          duracion_segundos: duracionArchivo,
          course_key: courseKey,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(
          error,
          isEN ? "Error transcribing." : "Error al transcribir.",
        );
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error as string);

      storagePath = null; // el edge function ya lo borró
      const transcript = (data?.transcript as string | undefined) ?? "";
      const durSeg = (data?.duracion_segundos as number | null | undefined) ?? duracionArchivo;
      setGuionOral(transcript);
      if (durSeg != null) {
        setDuracionReal(String(Math.round((durSeg / 60) * 10) / 10));
      }
      const palabras = transcript.trim().split(/\s+/).filter(Boolean).length;
      toast.success(
        `Transcripción lista · ${palabras} palabras${durSeg != null ? ` · ${Math.round((durSeg / 60) * 10) / 10} min` : ""}`,
      );
    } catch (err) {
      // Si quedó un archivo huérfano en Storage, borrarlo como fallback
      if (storagePath) {
        void supabase.storage.from("audio-oral").remove([storagePath]);
      }
      toast.error(
        err instanceof Error ? err.message : isEN ? "Error transcribing." : "Error al transcribir.",
      );
    } finally {
      setTranscribiendo(false);
    }
  };

  const evaluar = async () => {
    if (!asuntoGlobal.trim()) {
      toast.error(isEN ? "The global issue is required." : "El asunto global es obligatorio.");
      return;
    }
    if (!obra1Titulo.trim() || !obra2Titulo.trim()) {
      toast.error(
        isEN ? "Work titles are required." : "Los títulos de las dos obras son obligatorios.",
      );
      return;
    }
    if (!guionOral.trim()) {
      toast.error(
        isEN ? "The oral script is required." : "El guion o transcripción del oral es obligatorio.",
      );
      return;
    }

    setLoading(true);
    setEvaluacion(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-oral", {
        body: {
          nivel,
          tipo_oral: tipoOral,
          asunto_global: asuntoGlobal.trim(),
          obra_1_titulo: obra1Titulo.trim(),
          obra_1_autor: obra1Autor.trim() || undefined,
          obra_1_tipo: obra1Tipo,
          extracto_1: extracto1.trim() || undefined,
          notas_obra_1: notasObra1.trim() || undefined,
          obra_2_titulo: obra2Titulo.trim(),
          obra_2_autor: obra2Autor.trim() || undefined,
          obra_2_tipo: obra2Tipo,
          extracto_2: extracto2.trim() || undefined,
          notas_obra_2: notasObra2.trim() || undefined,
          guion_oral: guionOral,
          duracion_real_minutos: duracionReal.trim() ? Number(duracionReal.trim()) : undefined,
          course_key: courseKey,
        },
      });

      if (error) {
        const msg = await getFunctionErrorMessage(
          error,
          isEN ? "Error assessing." : "Error al evaluar.",
        );
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error as string);

      const ev = data as EvaluacionOral;
      setEvaluacion(ev);
      if (data?.gamificacion) setGamificacion(data.gamificacion as GamificacionResultado);
      toast.success(
        isEN
          ? `Assessment complete · ${ev.puntuacion_total}/40`
          : `Evaluación completada · ${ev.puntuacion_total}/40`,
      );
      setTimeout(() => {
        document
          .getElementById("resultados-oral")
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

  if (authLoading || !user || rol === "profesor" || !oralEnabled) {
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
        <div className="max-w-3xl mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <Mic className="h-3.5 w-3.5" />
            {isEN
              ? "Individual Oral · English A: Literature"
              : "Oral Individual · Español A Literatura"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            {isEN
              ? "Prepare and assess your Individual Oral."
              : "Prepara y evalúa tu Trabajo Oral Individual."}
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            {isEN
              ? "Read the preparation guide before assessing your script. You will receive scores for the four criteria (A, B, C, D), a global issue diagnostic, work balance and structure."
              : "Lee la guía de preparación antes de evaluar tu guion. Recibirás valoración por los cuatro criterios (A, B, C, D), diagnóstico del asunto global, equilibrio de obras y estructura."}
          </p>
          <Link
            to="/historial-oral"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            {isEN ? "View my previous assessments" : "Ver mis evaluaciones anteriores"}
          </Link>
        </div>

        {/* Tabs principales */}
        <Tabs defaultValue="guia">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="guia" className="flex-1 sm:flex-none">
              {isEN ? "Preparation guide" : "Guía de preparación"}
            </TabsTrigger>
            <TabsTrigger value="evaluar" className="flex-1 sm:flex-none">
              {isEN ? "Assess my script" : "Evaluar mi guion"}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab Guía ── */}
          <TabsContent value="guia">
            <GuiaOral isEN={isEN} />
          </TabsContent>

          {/* ── Tab Evaluar ── */}
          <TabsContent value="evaluar" className="space-y-6">
            {paso === "sugeridor" && (
              <SugeridorOral
                isEN={isEN}
                standalone
                obra1={{ titulo: obra1Titulo, autor: obra1Autor }}
                obra2={{ titulo: obra2Titulo, autor: obra2Autor }}
                onSeleccion={(asuntoGlobal, obra1, obra2) => {
                  setAsuntoGlobal(asuntoGlobal);
                  setObra1Titulo(obra1.titulo);
                  setObra1Autor(obra1.autor);
                  setObra2Titulo(obra2.titulo);
                  setObra2Autor(obra2.autor);
                  setPaso("formulario");
                }}
                onSaltar={() => setPaso("formulario")}
              />
            )}
            {paso === "formulario" && (
              <>
                <Card className="p-5 border-border bg-muted/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        {isEN ? "Topic suggester" : "Sugeridor de temas"}
                      </div>
                      <p className="text-sm text-foreground/70">
                        {isEN
                          ? "Use a separate suggester to choose a global issue after entering the two works."
                          : "Usa el sugeridor separado para elegir un asunto global después de indicar las dos obras."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="shrink-0"
                      onClick={() => setPaso("sugeridor")}
                      disabled={loading}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEN ? "Open suggester" : "Abrir sugeridor"}
                    </Button>
                  </div>
                </Card>

                <Card className="p-5 border-border bg-muted/20 space-y-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                      {isEN
                        ? "Extra · Review my oral notes"
                        : "Extra · Revisar mis apuntes del oral"}
                    </div>
                    <p className="text-xs text-foreground/60">
                      {isEN
                        ? "Optional support: paste your preparation outline or bullet points if you want feedback before assessing the full script."
                        : "Apoyo opcional: pega tu esquema o bullets de preparación si quieres feedback antes de evaluar el guion completo."}
                    </p>
                  </div>
                  <PanelApuntesOral
                    nivel={nivel}
                    tipoOral={tipoOral}
                    asuntoGlobal={asuntoGlobal}
                    obra1Titulo={obra1Titulo}
                    obra1Autor={obra1Autor}
                    obra1Tipo={obra1Tipo}
                    extracto1={extracto1}
                    obra2Titulo={obra2Titulo}
                    obra2Autor={obra2Autor}
                    obra2Tipo={obra2Tipo}
                    extracto2={extracto2}
                    disabled={loading}
                  />
                </Card>

                <Card className="p-6 sm:p-8 border-border space-y-6">
                  {/* Nivel */}
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {isEN ? "Course level" : "Nivel del curso"}
                    </Label>
                    <SelectorNivel value={nivel} onChange={setNivel} disabled={loading} />
                  </div>
                  {/* Tipo de oral */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {isEN ? "Oral modality" : "Modalidad del oral"}
                    </Label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTipoOral("taught")}
                        disabled={loading}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                          tipoOral === "taught"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-accent/30"
                        }`}
                      >
                        <p className="font-medium text-[13px]">
                          {isEN ? "Taught student" : "Alumno con profesor"}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {isEN
                            ? "10 min presentation + 5 min teacher questions"
                            : "10 min de exposición + 5 min de preguntas del profesor"}
                        </p>
                        <p className="text-[11px] text-primary mt-1">
                          {isEN
                            ? "We will include probable teacher questions."
                            : "Incluiremos preguntas probables del profesor."}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoOral("self_taught")}
                        disabled={loading}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                          tipoOral === "self_taught"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-accent/30"
                        }`}
                      >
                        <p className="font-medium text-[13px]">
                          {isEN
                            ? "School-supported self-taught"
                            : "Aprendizaje autodidacta con apoyo del colegio"}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {isEN
                            ? "15 min continuous presentation, no teacher questions"
                            : "15 min de exposición continua, sin preguntas del profesor"}
                        </p>
                        <p className="text-[11px] text-primary mt-1">
                          {isEN
                            ? "We will highlight areas to develop within your 15 min."
                            : "Señalaremos zonas que debes desarrollar dentro de tus 15 min."}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Asunto global */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="asunto-global"
                      className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {isEN ? "Global issue" : "Asunto global"}
                    </Label>
                    <Input
                      id="asunto-global"
                      value={asuntoGlobal}
                      onChange={(e) => setAsuntoGlobal(e.target.value)}
                      placeholder={
                        isEN
                          ? "E.g.: The erasure of individual identity under authoritarian power structures."
                          : "Ej.: La deshumanización del individuo bajo estructuras de poder autoritarias."
                      }
                      disabled={loading}
                      maxLength={500}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {isEN
                        ? "Be specific and debatable. Avoid overly broad terms such as 'identity' or 'power'."
                        : 'Sé específico y debatible. Evita términos demasiado amplios como "la identidad" o "el poder".'}
                    </p>
                  </div>

                  {/* Obras */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Obra 1 */}
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground border-b pb-1">
                        {isEN ? "Work 1" : "Obra 1"}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="obra1-titulo" className="text-[12px] text-muted-foreground">
                          {isEN ? "Title *" : "Título *"}
                        </Label>
                        <Input
                          id="obra1-titulo"
                          value={obra1Titulo}
                          onChange={(e) => setObra1Titulo(e.target.value)}
                          placeholder={isEN ? "Work title" : "Título de la obra"}
                          disabled={loading}
                          maxLength={300}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="obra1-autor" className="text-[12px] text-muted-foreground">
                          {isEN ? "Author" : "Autor/a"}
                        </Label>
                        <Input
                          id="obra1-autor"
                          value={obra1Autor}
                          onChange={(e) => setObra1Autor(e.target.value)}
                          placeholder={isEN ? "Author name" : "Nombre del autor o autora"}
                          disabled={loading}
                          maxLength={300}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-muted-foreground">
                          {isEN ? "Work type" : "Tipo de obra"}
                        </Label>
                        <div className="space-y-1">
                          {getObraTipoOpciones(isEN).map((op) => (
                            <label
                              key={op.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="obra1-tipo"
                                value={op.value}
                                checked={obra1Tipo === op.value}
                                onChange={() => setObra1Tipo(op.value)}
                                disabled={loading}
                                className="text-primary"
                              />
                              <span className="text-[13px]">{op.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="extracto1" className="text-[12px] text-muted-foreground">
                          {isEN ? "Extract 1 (optional)" : "Extracto 1 (opcional)"}
                        </Label>
                        <Textarea
                          id="extracto1"
                          value={extracto1}
                          onChange={(e) => setExtracto1(e.target.value)}
                          placeholder={
                            isEN
                              ? "Paste the extract you will analyze. Max 5000 characters."
                              : "Pega aquí el fragmento que analizarás. Máximo 5000 caracteres."
                          }
                          rows={4}
                          disabled={loading}
                          className="resize-none text-sm"
                          maxLength={5000}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="notas1" className="text-[12px] text-muted-foreground">
                          {isEN ? "Notes on Work 1 (optional)" : "Notas sobre la obra 1 (opcional)"}
                        </Label>
                        <Textarea
                          id="notas1"
                          value={notasObra1}
                          onChange={(e) => setNotasObra1(e.target.value)}
                          placeholder={
                            isEN
                              ? "Key scenes, characters, resources or relevant themes. Don't paste the full work."
                              : "Escenas, personajes, recursos o temas relevantes. No pegues la obra completa."
                          }
                          rows={3}
                          disabled={loading}
                          className="resize-none text-sm"
                          maxLength={8000}
                        />
                      </div>
                    </div>

                    {/* Obra 2 */}
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground border-b pb-1">
                        {isEN ? "Work 2" : "Obra 2"}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="obra2-titulo" className="text-[12px] text-muted-foreground">
                          {isEN ? "Title *" : "Título *"}
                        </Label>
                        <Input
                          id="obra2-titulo"
                          value={obra2Titulo}
                          onChange={(e) => setObra2Titulo(e.target.value)}
                          placeholder={isEN ? "Work title" : "Título de la obra"}
                          disabled={loading}
                          maxLength={300}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="obra2-autor" className="text-[12px] text-muted-foreground">
                          {isEN ? "Author" : "Autor/a"}
                        </Label>
                        <Input
                          id="obra2-autor"
                          value={obra2Autor}
                          onChange={(e) => setObra2Autor(e.target.value)}
                          placeholder={isEN ? "Author name" : "Nombre del autor o autora"}
                          disabled={loading}
                          maxLength={300}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-muted-foreground">
                          {isEN ? "Work type" : "Tipo de obra"}
                        </Label>
                        <div className="space-y-1">
                          {getObraTipoOpciones(isEN).map((op) => (
                            <label
                              key={op.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="obra2-tipo"
                                value={op.value}
                                checked={obra2Tipo === op.value}
                                onChange={() => setObra2Tipo(op.value)}
                                disabled={loading}
                                className="text-primary"
                              />
                              <span className="text-[13px]">{op.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="extracto2" className="text-[12px] text-muted-foreground">
                          {isEN ? "Extract 2 (optional)" : "Extracto 2 (opcional)"}
                        </Label>
                        <Textarea
                          id="extracto2"
                          value={extracto2}
                          onChange={(e) => setExtracto2(e.target.value)}
                          placeholder={
                            isEN
                              ? "Paste the extract you will analyze. Max 5000 characters."
                              : "Pega aquí el fragmento que analizarás. Máximo 5000 caracteres."
                          }
                          rows={4}
                          disabled={loading}
                          className="resize-none text-sm"
                          maxLength={5000}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="notas2" className="text-[12px] text-muted-foreground">
                          {isEN ? "Notes on Work 2 (optional)" : "Notas sobre la obra 2 (opcional)"}
                        </Label>
                        <Textarea
                          id="notas2"
                          value={notasObra2}
                          onChange={(e) => setNotasObra2(e.target.value)}
                          placeholder={
                            isEN
                              ? "Key scenes, characters, resources or relevant themes. Don't paste the full work."
                              : "Escenas, personajes, recursos o temas relevantes. No pegues la obra completa."
                          }
                          rows={3}
                          disabled={loading}
                          className="resize-none text-sm"
                          maxLength={8000}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advertencias de validación */}
                  {advertencias.length > 0 && (
                    <div className="space-y-1.5">
                      {advertencias.map((a, i) => (
                        <div
                          key={i}
                          className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800"
                        >
                          <span className="shrink-0">⚠</span>
                          {a}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transcribir desde audio */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {isEN
                        ? "Transcribe from audio file (optional)"
                        : "Transcribir desde archivo de audio (opcional)"}
                    </Label>
                    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                      <p className="text-[12px] text-muted-foreground leading-snug">
                        {isEN
                          ? "Upload a recording of your oral (MP3, M4A, WAV, WebM — max. 25 MB). The audio is uploaded, transcribed, and "
                          : "Sube una grabación de tu oral (MP3, M4A, WAV, WebM — máx. 25 MB). El audio se sube, se transcribe y se "}
                        <strong>{isEN ? "deleted immediately" : "elimina de inmediato"}</strong>
                        {isEN
                          ? ". It is not stored on any server permanently."
                          : ". No se almacena en ningún servidor de forma permanente."}
                      </p>
                      {!audioFile ? (
                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                          <input
                            type="file"
                            accept="audio/*,video/webm,video/mp4"
                            className="sr-only"
                            disabled={loading || transcribiendo}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              setAudioFile(f);
                              e.target.value = "";
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-[13px] hover:bg-accent/40 transition-colors">
                            <Upload className="h-3.5 w-3.5" />
                            {isEN ? "Select file" : "Seleccionar archivo"}
                          </span>
                        </label>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5 text-[13px] text-foreground/80 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{audioFile.name}</span>
                            <span className="text-muted-foreground shrink-0">
                              · {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={transcribir}
                              disabled={transcribiendo || loading}
                              className="h-7 text-[12px]"
                            >
                              {transcribiendo ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {isEN ? "Transcribing…" : "Transcribiendo…"}
                                </>
                              ) : (
                                <>
                                  <Mic className="h-3 w-3" />
                                  {isEN ? "Transcribe" : "Transcribir"}
                                </>
                              )}
                            </Button>
                            <button
                              type="button"
                              onClick={() => setAudioFile(null)}
                              disabled={transcribiendo || loading}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={isEN ? "Remove file" : "Quitar archivo"}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guion oral */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="guion-oral"
                        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {isEN ? "Script or oral transcript *" : "Guion o transcripción del oral *"}
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <BotónDictado
                          dictando={dictandoGuion}
                          onToggle={toggleDictadoGuion}
                          disabled={loading || transcribiendo}
                          isEN={isEN}
                        />
                        <ImageUploadButton
                          label={isEN ? "Upload photo" : "Subir foto"}
                          onTranscripcion={(t) => setGuionOral(t)}
                          isEN={isEN}
                        />
                      </div>
                    </div>
                    <Textarea
                      id="guion-oral"
                      value={guionOral}
                      onChange={(e) => setGuionOral(e.target.value)}
                      placeholder={
                        isEN
                          ? "Write or paste your prepared script or oral transcript here. It will be assessed as written text using oral criteria."
                          : "Escribe o pega aquí tu guion preparado o la transcripción de tu oral. Se evaluará como texto escrito con criterios del oral."
                      }
                      rows={14}
                      disabled={loading}
                      className="resize-y text-sm font-serif leading-relaxed"
                      maxLength={30000}
                    />
                    {dictandoGuion && interimGuion && (
                      <p className="text-[11px] text-muted-foreground italic px-1">
                        {interimGuion}…
                      </p>
                    )}
                    {(() => {
                      const palabras = guionOral.trim().split(/\s+/).filter(Boolean).length;
                      return (
                        <>
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>
                              {palabras} {isEN ? "words" : "palabras"}
                            </span>
                            <span>{guionOral.length}/30000</span>
                          </div>
                          {guionOral.trim() && palabras < 100 && (
                            <p className="text-[11px] text-amber-700">
                              {isEN
                                ? "Minimum 100 words to assess. Paste your script or oral transcript."
                                : "Mínimo 100 palabras para evaluar. Pega tu guion o transcripción del oral."}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Duración real */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="duracion-real"
                      className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {isEN
                        ? "Actual oral duration (min) — optional"
                        : "Duración real del oral (min) — opcional"}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="duracion-real"
                        type="number"
                        min={1}
                        max={30}
                        step={0.5}
                        value={duracionReal}
                        onChange={(e) => setDuracionReal(e.target.value)}
                        placeholder={isEN ? "e.g. 15" : "ej. 15"}
                        disabled={loading}
                        className="w-28 text-sm"
                      />
                      <p className="text-[12px] text-muted-foreground leading-snug">
                        {isEN
                          ? "If you've already practised your oral, enter how many minutes it took. This is used for time alerts and to give context to the AI examiner."
                          : "Si ya has practicado el oral, introduce cuántos minutos duró. Se usa para la alerta de tiempo y para dar contexto al examinador IA."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <p className="text-xs text-muted-foreground">
                      {isEN
                        ? "Your assessment is automatically saved in "
                        : "Tu evaluación se guarda automáticamente en "}
                      <Link to="/historial-oral" className="text-foreground/80 hover:underline">
                        {isEN ? "Oral History" : "Historial Oral"}
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
                          {isEN ? "Assess oral" : "Evaluar oral"}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Juego de espera */}
                {loading && (
                  <div className="mt-6">
                    <JuegoEsperaEvaluacion modo="oral" />
                  </div>
                )}

                {/* Resultados */}
                {evaluacion && (
                  <section id="resultados-oral" className="mt-12 scroll-mt-20">
                    <EvaluacionOralPanel
                      ev={evaluacion}
                      gamificacion={gamificacion}
                      guion={guionOral}
                    />
                  </section>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
