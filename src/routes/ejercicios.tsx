import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/ejercicios")({
  head: () => ({
    meta: [
      { title: "Ejercicios — IB Literatura" },
      { name: "description", content: "Microejercicios para fortalecer tu análisis literario." },
    ],
  }),
  component: EjerciciosPage,
});

// ── DATOS: IDENTIFICACIÓN ────────────────────────────────────

type EjercicioId = {
  id: number;
  fragmento: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  criterio: "A" | "B" | "C" | "D";
};

const EJERCICIOS_IDENTIFICACION: EjercicioId[] = [
  {
    id: 1,
    fragmento:
      "Puedo escribir los versos más tristes esta noche.\n[...]\nPuedo escribir los versos más tristes esta noche.",
    pregunta:
      "¿Qué recurso retórico representa la repetición del verso inicial al final del poema?",
    opciones: ["Símil", "Anáfora", "Hipérbole", "Metonimia"],
    correcta: 1,
    explicacion:
      "La anáfora es la repetición de una misma expresión al comienzo de varios versos o unidades. En Neruda, el verso «Puedo escribir los versos más tristes esta noche» se repite estratégicamente para marcar las oscilaciones emocionales del hablante lírico, funcionando como leitmotiv estructural.",
    criterio: "B",
  },
  {
    id: 2,
    fragmento:
      "Las maderas crujían por la desesperación de los clavos y los tornillos tratando de desenclavarse.",
    pregunta: "¿Qué recurso literario aparece en este fragmento de García Márquez?",
    opciones: ["Ironía", "Personificación", "Oxímoron", "Aliteración"],
    correcta: 1,
    explicacion:
      "La personificación atribuye cualidades humanas a elementos no humanos. Aquí, «la desesperación de los clavos» atribuye emoción a objetos inanimados, reforzando el efecto mágico del imán de Melquíades: el mundo inerte reacciona como si sintiera urgencia.",
    criterio: "B",
  },
  {
    id: 3,
    fragmento:
      "El diámetro del Aleph sería de dos o tres centímetros, pero el espacio cósmico estaba ahí, sin disminución de tamaño.",
    pregunta: "¿Qué recurso emplea Borges en esta descripción del Aleph?",
    opciones: ["Paradoja", "Eufemismo", "Sinécdoque", "Pleonasmo"],
    correcta: 0,
    explicacion:
      "La paradoja combina dos ideas aparentemente contradictorias. Borges presenta un objeto de dos centímetros que contiene el espacio cósmico sin reducirlo: la contradicción lógica es intencional y es la clave filosófica del cuento, desafiando las categorías racionales de tamaño y espacio.",
    criterio: "B",
  },
  {
    id: 4,
    fragmento:
      "Verde que te quiero verde.\nVerde viento. Verdes ramas.\nEl barco sobre la mar\ny el caballo en la montaña.",
    pregunta: "¿Qué función cumple la repetición del color verde en estos versos de Lorca?",
    opciones: [
      "Descripción literal del paisaje andaluz",
      "Símbolo polisémico de múltiples significados simultáneos",
      "Hipérbole para enfatizar la intensidad visual",
      "Metonimia de la esperanza",
    ],
    correcta: 1,
    explicacion:
      "El verde en el Romancero gitano no es una descripción realista sino un símbolo polisémico: puede evocar la naturaleza, la muerte, lo mágico y el deseo simultáneamente. Esta ambigüedad semántica intencionada es característica de la poética surrealista de Lorca y enriquece el poema con múltiples lecturas posibles.",
    criterio: "A",
  },
  {
    id: 5,
    fragmento:
      "Volverán las oscuras golondrinas\nen tu balcón sus nidos a colgar,\n[...]\npero aquellas que el vuelo refrenaban\ntu hermosura y mi dicha a contemplar,\naquellas que aprendieron nuestros nombres...\n¡esas... no volverán!",
    pregunta: "¿Qué estructura retórica organiza esta estrofa de Bécquer?",
    opciones: ["Gradación ascendente", "Antítesis", "Hipérbaton", "Alegoría"],
    correcta: 1,
    explicacion:
      "La antítesis contrapone dos ideas opuestas en relación de contraste. Bécquer opone «volverán» (lo que la naturaleza renueva cíclicamente) con «¡esas... no volverán!» (lo irrepetible del amor vivido). Esta contraposición es el argumento emocional central de la Rima LIII: la naturaleza es cíclica, el amor único es irrecuperable.",
    criterio: "B",
  },
];

// ── DATOS: EFECTOS ──────────────────────────────────────────

type EjercicioEfecto = {
  id: number;
  fragmento: string;
  recurso: string;
  recurso_en_texto: string;
  pregunta: string;
  respuesta_modelo: string;
  criterio: "A" | "B" | "C" | "D";
};

const EJERCICIOS_EFECTOS: EjercicioEfecto[] = [
  {
    id: 1,
    fragmento: "Es tan corto el amor, y es tan largo el olvido.",
    recurso: "Aforismo / Antítesis",
    recurso_en_texto: "«corto el amor» / «largo el olvido»",
    pregunta:
      "¿Qué efecto produce sobre el lector la combinación de aforismo y antítesis en este verso de Neruda?",
    respuesta_modelo:
      "El aforismo condensa en una sola frase una verdad emocional universal, haciendo que el lector sienta que ha capturado algo previamente inexpresable. La antítesis entre «corto» y «largo» intensifica el dolor: cuantifica la desproporción entre la experiencia del amor y la del olvido, sugiriendo que el tiempo subjetivo del corazón no coincide con el tiempo objetivo. El resultado es que la frase final trasciende la historia personal del poeta y se convierte en un lamento colectivo que el lector puede apropiarse.",
    criterio: "B",
  },
  {
    id: 2,
    fragmento:
      "Trescientas rosas morenas\nlleva tu pechera blanca.\nTu sangre rezuma y huele\nalrededor de tu faja.",
    recurso: "Metáfora",
    recurso_en_texto: "«Trescientas rosas morenas» (la sangre)",
    pregunta:
      "¿Qué efecto produce la metáfora de las «rosas morenas» para describir la sangre en este fragmento lorquiano?",
    respuesta_modelo:
      "La metáfora transforma lo violento y crudo (la sangre de una herida mortal) en imagen floral, estetizando la muerte. Este procedimiento —convertir el dolor físico en belleza— es característico de la poética de Lorca: la muerte no se describe con realismo, sino que se eleva a categoría lírica. El contraste entre las «rosas morenas» (oscuras, abundantes, casi decorativas) y la «pechera blanca» (la tela, símbolo de pureza o cotidianidad) intensifica la violencia precisamente por no nombrarla directamente.",
    criterio: "B",
  },
  {
    id: 3,
    fragmento: "A veces llegábamos a creer que era ella la que no nos dejaba casarnos.",
    recurso: "Personificación",
    recurso_en_texto: "la casa «no nos dejaba casarnos»",
    pregunta: "¿Qué efecto produce la personificación de la casa en este fragmento de Cortázar?",
    respuesta_modelo:
      "Al atribuirle agencia propia a la casa —como si ejerciera voluntad sobre los protagonistas— Cortázar invierte la relación entre el espacio y los personajes: ya no son ellos quienes habitan la casa, sino la casa quien los posee a ellos. Este efecto crea una atmósfera inquietante incluso antes de que ocurra algo sobrenatural explícito: el lector percibe que el verdadero antagonista es el espacio doméstico. La personificación también permite al narrador evadir la responsabilidad psicológica de los protagonistas: culpar a la casa es más cómodo que reconocer su propia parálisis.",
    criterio: "B",
  },
];

// ── DATOS: REESCRITURA ──────────────────────────────────────

type EjercicioReescritura = {
  id: number;
  descripcion_original: string;
  nivel_objetivo: "análisis" | "interpretación";
  contexto: string;
  respuesta_modelo: string;
  criterio: "A" | "B" | "C" | "D";
};

const EJERCICIOS_REESCRITURA: EjercicioReescritura[] = [
  {
    id: 1,
    descripcion_original:
      "En el poema, Neruda repite el verso «Puedo escribir los versos más tristes esta noche» varias veces.",
    nivel_objetivo: "análisis",
    contexto: "Poema XX de Neruda. Recurso: anáfora.",
    respuesta_modelo:
      "La repetición anafórica del verso inicial —«Puedo escribir los versos más tristes esta noche»— no es una redundancia sino una estrategia estructural: cada vez que regresa, el hablante lírico ha avanzado un paso en su vaivén emocional entre el amor y el desamor. La anáfora mimetiza en la forma el proceso psicológico del poema: el hablante vuelve una y otra vez al mismo punto, incapaz de abandonar el recuerdo, igual que el olvido que no llega.",
    criterio: "B",
  },
  {
    id: 2,
    descripcion_original:
      "García Márquez describe la llegada de los gitanos a Macondo con imanes que mueven objetos de metal.",
    nivel_objetivo: "interpretación",
    contexto:
      "Apertura de Cien años de soledad. El imán como primer «invento» que llega a Macondo.",
    respuesta_modelo:
      "La escena del imán no es simplemente la descripción de un fenómeno físico: es la inauguración del proceso por el que Macondo —y por extensión América Latina— experimenta la modernidad como magia. García Márquez sugiere que la brecha entre el «mundo reciente» de Macondo y la tecnología europea es tan grande que lo científico se vuelve indistinguible de lo sobrenatural. La llegada del imán es así una metáfora de la irrupción del progreso en una cultura que aún «señalaba las cosas con el dedo»: el efecto no es el conocimiento, sino el asombro y la pérdida de control.",
    criterio: "A",
  },
  {
    id: 3,
    descripcion_original:
      "Bécquer dice que las golondrinas volverán al balcón, pero que las golondrinas que estuvieron antes no volverán.",
    nivel_objetivo: "análisis",
    contexto: "Rima LIII de Bécquer. Estructura antitética: lo que vuelve vs. lo irrepetible.",
    respuesta_modelo:
      "La distinción que Bécquer establece entre las golondrinas genéricas —que regresan porque son intercambiables, parte del ciclo natural— y «aquellas» golondrinas específicas —las que aprendieron nuestros nombres, las que compartieron un momento irrepetible— es el argumento central de la rima. El demostrativo «aquellas» frente al artículo genérico «las» marca la diferencia entre lo universal y lo particular. Bécquer construye así una filosofía del amor: lo que hace irreemplazable al amor no es el sentimiento abstracto sino la experiencia concreta y compartida, que por definición no puede repetirse.",
    criterio: "B",
  },
];

// ── COMPONENTES ──────────────────────────────────────────────

const CRITERIO_COLOR: Record<string, string> = {
  A: "bg-blue-500/15 text-blue-700 border-blue-300",
  B: "bg-amber-500/15 text-amber-700 border-amber-300",
  C: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  D: "bg-rose-500/15 text-rose-700 border-rose-300",
};

function EjercicioIdentificacion() {
  const [idx, setIdx] = useState(0);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const ej = EJERCICIOS_IDENTIFICACION[idx];
  const respondido = seleccionada !== null;
  const correcto = seleccionada === ej.correcta;

  const siguiente = () => {
    setIdx((i) => (i + 1) % EJERCICIOS_IDENTIFICACION.length);
    setSeleccionada(null);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + EJERCICIOS_IDENTIFICACION.length) % EJERCICIOS_IDENTIFICACION.length);
    setSeleccionada(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Ejercicio {idx + 1} de {EJERCICIOS_IDENTIFICACION.length}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
            CRITERIO_COLOR[ej.criterio],
          )}
        >
          Criterio {ej.criterio}
        </span>
      </div>

      <Card className="p-5 bg-parchment/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Fragmento
        </div>
        <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-line">
          {ej.fragmento}
        </p>
      </Card>

      <p className="text-sm font-medium text-ink">{ej.pregunta}</p>

      <div className="grid sm:grid-cols-2 gap-2">
        {ej.opciones.map((op, i) => {
          let estado = "neutral";
          if (respondido) {
            if (i === ej.correcta) estado = "correcta";
            else if (i === seleccionada) estado = "incorrecta";
          }
          return (
            <button
              key={i}
              disabled={respondido}
              onClick={() => setSeleccionada(i)}
              className={cn(
                "px-4 py-3 rounded-md border text-sm text-left transition-colors",
                estado === "neutral" && "border-border bg-card hover:bg-accent/40 text-foreground",
                estado === "correcta" && "border-emerald-400 bg-emerald-50 text-emerald-800",
                estado === "incorrecta" && "border-rose-400 bg-rose-50 text-rose-800",
              )}
            >
              <span className="flex items-center gap-2">
                {estado === "correcta" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                {estado === "incorrecta" && <Circle className="h-4 w-4 text-rose-400 shrink-0" />}
                {estado === "neutral" && (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {op}
              </span>
            </button>
          );
        })}
      </div>

      {respondido && (
        <Card
          className={cn(
            "p-4 border",
            correcto ? "border-emerald-300 bg-emerald-50/60" : "border-amber-300 bg-amber-50/60",
          )}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {correcto ? "Correcto —" : "No exactamente —"} Explicación
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.explicacion}</p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EjercicioEfectos() {
  const [idx, setIdx] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarModelo, setMostrarModelo] = useState(false);
  const ej = EJERCICIOS_EFECTOS[idx];

  const siguiente = () => {
    setIdx((i) => (i + 1) % EJERCICIOS_EFECTOS.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + EJERCICIOS_EFECTOS.length) % EJERCICIOS_EFECTOS.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Ejercicio {idx + 1} de {EJERCICIOS_EFECTOS.length}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
            CRITERIO_COLOR[ej.criterio],
          )}
        >
          Criterio {ej.criterio}
        </span>
      </div>

      <Card className="p-5 bg-parchment/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Fragmento
        </div>
        <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-line">
          {ej.fragmento}
        </p>
      </Card>

      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Recurso identificado:
        </div>
        <Badge variant="secondary">{ej.recurso}</Badge>
        <span className="text-xs text-muted-foreground">— {ej.recurso_en_texto}</span>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">{ej.pregunta}</p>
        <Textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={4}
          placeholder="Escribe aquí tu análisis del efecto (2-4 frases)…"
          className="text-[14px] leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setMostrarModelo(true)}
          disabled={!respuesta.trim() || mostrarModelo}
          variant="outline"
        >
          Ver respuesta modelo
        </Button>
      </div>

      {mostrarModelo && (
        <Card className="p-4 border-border bg-card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Respuesta modelo
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.respuesta_modelo}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Compara tu respuesta con el modelo: ¿has identificado el mismo efecto? ¿Has explicado{" "}
            <em>cómo</em> el recurso lo produce?
          </p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EjercicioReescritura() {
  const [idx, setIdx] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarModelo, setMostrarModelo] = useState(false);
  const ej = EJERCICIOS_REESCRITURA[idx];

  const siguiente = () => {
    setIdx((i) => (i + 1) % EJERCICIOS_REESCRITURA.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + EJERCICIOS_REESCRITURA.length) % EJERCICIOS_REESCRITURA.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Ejercicio {idx + 1} de {EJERCICIOS_REESCRITURA.length}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {ej.nivel_objetivo === "análisis"
              ? "Descripción → Análisis"
              : "Análisis → Interpretación"}
          </Badge>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              CRITERIO_COLOR[ej.criterio],
            )}
          >
            Criterio {ej.criterio}
          </span>
        </div>
      </div>

      <Card className="p-4 border-amber-200 bg-amber-50/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Frase descriptiva (a transformar)
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed italic">
          &ldquo;{ej.descripcion_original}&rdquo;
        </p>
      </Card>

      <div className="text-xs text-muted-foreground">
        <strong>Contexto:</strong> {ej.contexto}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">
          Reescribe la frase como {ej.nivel_objetivo === "análisis" ? "análisis" : "interpretación"}
          : explica el recurso y su efecto en el significado del texto.
        </p>
        <Textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={5}
          placeholder={
            ej.nivel_objetivo === "análisis"
              ? "Explica cómo funciona el recurso y qué efecto produce en el texto…"
              : "Interpreta qué significa este recurso en el contexto más amplio del texto o del autor…"
          }
          className="text-[14px] leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setMostrarModelo(true)}
          disabled={!respuesta.trim() || mostrarModelo}
          variant="outline"
        >
          Ver respuesta modelo
        </Button>
      </div>

      {mostrarModelo && (
        <Card className="p-4 border-border bg-card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Respuesta modelo
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.respuesta_modelo}</p>
          <p className="text-xs text-muted-foreground mt-3">
            La diferencia clave entre descripción y {ej.nivel_objetivo}: el{" "}
            {ej.nivel_objetivo === "análisis" ? "análisis" : "interpretación"} explica el
            {ej.nivel_objetivo === "análisis"
              ? " cómo (mecanismo del recurso)"
              : " por qué (significado en el texto)"}
            , no solo el qué.
          </p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────

function EjerciciosPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Microejercicios
          </div>
          <h1 className="font-serif text-3xl text-ink">Ejercicios</h1>
          <p className="text-foreground/70 mt-2 max-w-xl">
            Tres tipos de microejercicios para fortalecer tu análisis literario sin escribir un
            comentario completo.
          </p>
        </div>

        <Tabs defaultValue="identificacion">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="identificacion" className="text-xs">
              Identificación
            </TabsTrigger>
            <TabsTrigger value="efectos" className="text-xs">
              Efectos
            </TabsTrigger>
            <TabsTrigger value="reescritura" className="text-xs">
              Reescritura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identificacion">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">Identificación de recursos</div>
                <p className="text-xs text-muted-foreground">
                  Lee el fragmento e identifica qué recurso retórico se usa. Criterio B.
                </p>
              </div>
              <EjercicioIdentificacion />
            </Card>
          </TabsContent>

          <TabsContent value="efectos">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">Análisis de efectos</div>
                <p className="text-xs text-muted-foreground">
                  El recurso ya está identificado. Explica en 2-4 frases qué efecto produce en el
                  significado del texto. Criterio B.
                </p>
              </div>
              <EjercicioEfectos />
            </Card>
          </TabsContent>

          <TabsContent value="reescritura">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">
                  Descripción → Análisis → Interpretación
                </div>
                <p className="text-xs text-muted-foreground">
                  Transforma una observación descriptiva en análisis o interpretación. Criterios A y
                  B.
                </p>
              </div>
              <EjercicioReescritura />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
