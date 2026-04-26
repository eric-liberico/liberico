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
  nivel: "Básico" | "Básico-Medio" | "Medio" | "Medio-Avanzado" | "IB";
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
    nivel: "Básico",
    fragmento:
      "Puedo escribir los versos más tristes esta noche.\n[...]\nPuedo escribir los versos más tristes esta noche.",
    pregunta:
      "¿Cómo se denomina la figura retórica que consiste en repetir una misma expresión al comienzo de versos o cláusulas sucesivas?",
    opciones: ["Epífora", "Anáfora", "Aliteración", "Paralelismo"],
    correcta: 1,
    explicacion:
      "La anáfora repite una expresión al inicio de varias unidades. En el Poema XX, el verso «Puedo escribir los versos más tristes esta noche» regresa varias veces para marcar los vaivenes emocionales del hablante: cada aparición señala un nuevo intento de distanciarse del recuerdo, y cada vez fracasa.",
    criterio: "B",
  },
  {
    id: 2,
    nivel: "Básico-Medio",
    fragmento:
      "Las maderas crujían por la desesperación de los clavos y los tornillos tratando de desenclavarse.",
    pregunta:
      "¿Qué figura retórica emplea García Márquez al atribuirle «desesperación» a los clavos?",
    opciones: ["Hipérbole", "Personificación", "Ironía", "Símil"],
    correcta: 1,
    explicacion:
      "La personificación atribuye emociones humanas a objetos inanimados. Aquí, los clavos «desesperan», lo que convierte la atracción magnética en un impulso casi volitivo. Este recurso sostiene el realismo mágico de Macondo: la naturaleza inerte reacciona como si sintiera urgencia ante lo desconocido.",
    criterio: "B",
  },
  {
    id: 3,
    nivel: "Medio",
    fragmento:
      "El diámetro del Aleph sería de dos o tres centímetros, pero el espacio cósmico estaba ahí, sin disminución de tamaño.",
    pregunta:
      "¿Qué figura retórica emplea Borges, y qué idea expresa sobre la naturaleza del conocimiento?",
    opciones: [
      "Una hipérbole: exagera el tamaño del Aleph para transmitir su importancia",
      "Una antítesis: contrapone el tamaño físico y el espacio cósmico para crear contraste visual",
      "Una paradoja: lo imposible lógicamente encierra la tesis filosófica del cuento",
      "Una metonimia: usa el Aleph para representar la experiencia mística en general",
    ],
    correcta: 2,
    explicacion:
      "La paradoja combina dos proposiciones incompatibles (dos centímetros / el cosmos entero) para enunciar algo que la lógica no puede contener. Borges no pretende describir un objeto real, sino formular una hipótesis filosófica: ¿qué ocurriría si un punto del espacio contuviera todos los demás? La contradicción es, en sí misma, la tesis del cuento.",
    criterio: "B",
  },
  {
    id: 4,
    nivel: "Medio-Avanzado",
    fragmento:
      "Verde que te quiero verde.\nVerde viento. Verdes ramas.\nEl barco sobre la mar\ny el caballo en la montaña.",
    pregunta: "¿Cómo actúa el color verde en estos versos de Lorca?",
    opciones: [
      "Como descripción realista del paisaje rural andaluz",
      "Como símbolo polisémico que acumula varios significados simultáneos sin agotarse en ninguno",
      "Como hipérbole que intensifica la percepción visual del lector",
      "Como metonimia de la muerte en la cultura gitana",
    ],
    correcta: 1,
    explicacion:
      "El verde lorquiano no es un color descriptivo sino un símbolo de múltiples capas: puede evocar la naturaleza, el deseo, lo mágico, la muerte. Esta polisemia intencional es característica del Romancero gitano: Lorca construye imágenes que el lector siente antes de comprender racionalmente.",
    criterio: "A",
  },
  {
    id: 5,
    nivel: "IB",
    fragmento:
      "Volverán las oscuras golondrinas [...]\npero aquellas que el vuelo refrenaban\ntu hermosura y mi dicha a contemplar,\naquellas que aprendieron nuestros nombres...\n¡esas... no volverán!",
    pregunta:
      "¿Qué estructura retórica organiza la estrofa de Bécquer, y cómo refuerza la tesis emocional del poema?",
    opciones: [
      "La anáfora de «volverán»: crea musicalidad y enfatiza la repetición de los fenómenos naturales",
      "La antítesis entre «volverán» y «no volverán»: contrapone lo cíclico de la naturaleza con la irreversibilidad del amor vivido",
      "La gradación ascendente: muestra una intensidad emocional creciente hasta el clímax final",
      "La alegoría de las golondrinas: representa el alma del amado que parte y no regresa",
    ],
    correcta: 1,
    explicacion:
      "La antítesis «volverán» / «¡esas... no volverán!» es el eje argumental de toda la rima. Bécquer no lamenta que el amor acabe: lamenta que lo vivido con esa persona específica sea irrepetible. La naturaleza renueva sus instancias; el amor no renueva las suyas. La antítesis le da forma retórica a esa distinción filosófica.",
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
    recurso: "Antítesis",
    recurso_en_texto: "«corto el amor» / «largo el olvido»",
    pregunta: "¿Qué efecto produce en el lector esta antítesis de Neruda?",
    respuesta_modelo:
      "La antítesis cuantifica la desproporción entre dos experiencias que el lenguaje común trata como comparables: amar y olvidar. Al reducirlas a una oposición de tamaño («corto» / «largo»), el verso convierte lo emocional en casi matemático, lo que intensifica la injusticia que el hablante siente. El lector experimenta el poema como una ley universal —no solo una queja personal— precisamente porque la antítesis tiene la economía y la contundencia de un aforismo.",
    criterio: "B",
  },
  {
    id: 2,
    fragmento:
      "Trescientas rosas morenas\nlleva tu pechera blanca.\nTu sangre rezuma y huele\nalrededor de tu faja.",
    recurso: "Metáfora",
    recurso_en_texto: "«Trescientas rosas morenas» (= la sangre)",
    pregunta:
      "¿Qué efecto produce sobre el lector la metáfora «Trescientas rosas morenas» en este fragmento de García Lorca?",
    respuesta_modelo:
      "La metáfora transforma la sangre de una herida mortal en imagen floral, estetizando la muerte. El contraste cromático —rosas oscuras sobre pechera blanca— hace la violencia visualmente intensa sin nombrarla directamente. El efecto sobre el lector es simultáneamente de belleza y de horror: la hermosura de la imagen no puede ocultar lo que representa, y esa tensión irresuelta es característica de la poética lorquiana.",
    criterio: "B",
  },
  {
    id: 3,
    fragmento: "A veces llegábamos a creer que era ella la que no nos dejaba casarnos.",
    recurso: "Personificación",
    recurso_en_texto: "la casa «no nos dejaba casarnos»",
    pregunta:
      "¿Qué efecto produce en el lector que Cortázar atribuya a la casa la decisión de no dejar casarse a los protagonistas?",
    respuesta_modelo:
      "Al concederle a la casa una voluntad propia, Cortázar invierte la jerarquía habitual: ya no son los personajes quienes habitan el espacio, sino el espacio quien los posee. Esto genera una sensación de amenaza difusa antes de que ocurra nada explícitamente sobrenatural. Además, la personificación exime a los personajes de responsabilidad psicológica: culpar a la casa es más cómodo que admitir su parálisis. El lector percibe esa evasión y entiende que el verdadero «fantasma» es la incapacidad de los protagonistas para vivir fuera de la casa.",
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
    contexto:
      "Poema XX de Neruda. Recurso: anáfora. Pregunta IB: ¿Cómo construye Neruda la ambivalencia emocional entre el amor y la pérdida?",
    respuesta_modelo:
      "La repetición anafórica del verso inicial —«Puedo escribir los versos más tristes esta noche»— no es redundancia sino estrategia estructural: cada vez que regresa, el hablante ha avanzado un paso en su vaivén emocional entre el amor y el desamor. La anáfora mimetiza en la forma el proceso psicológico del poema: el hablante vuelve una y otra vez al mismo punto de partida, incapaz de abandonar el recuerdo, igual que el olvido que todavía no llega.",
    criterio: "B",
  },
  {
    id: 2,
    descripcion_original:
      "García Márquez describe la llegada de los gitanos a Macondo con imanes que mueven objetos de metal.",
    nivel_objetivo: "interpretación",
    contexto:
      "Apertura de Cien años de soledad. El imán como primer «invento» que llega a Macondo. Pregunta IB: ¿Cómo construye García Márquez el mundo mítico de Macondo?",
    respuesta_modelo:
      "La escena del imán no describe un fenómeno físico: inaugura el proceso por el que Macondo —y por extensión América Latina— experimenta la modernidad como magia. La distancia entre el «mundo reciente» de Macondo y la tecnología europea es tan grande que lo científico se vuelve indistinguible de lo sobrenatural. El imán es así una metáfora de la irrupción del progreso en una cultura que aún «señalaba las cosas con el dedo»: el efecto no es el conocimiento, sino el asombro y la pérdida de control.",
    criterio: "A",
  },
  {
    id: 3,
    descripcion_original:
      "Bécquer dice que las golondrinas volverán al balcón, pero que las golondrinas que estuvieron antes no volverán.",
    nivel_objetivo: "análisis",
    contexto:
      "Rima LIII de Bécquer. Estructura antitética: lo que vuelve vs. lo irrepetible. Pregunta IB: ¿Cómo estructura Bécquer la idea de la irreversibilidad del amor?",
    respuesta_modelo:
      "La distinción que Bécquer establece entre las golondrinas genéricas —que regresan porque son intercambiables, parte del ciclo natural— y «aquellas» golondrinas específicas —las que «aprendieron nuestros nombres»— es el argumento central de la rima. El demostrativo «aquellas» frente al artículo genérico «las» marca la diferencia entre lo universal y lo particular. Bécquer propone que lo que hace irrepetible al amor no es el sentimiento abstracto sino la experiencia concreta y compartida, que por definición no puede repetirse.",
    criterio: "B",
  },
];

// ── DATOS: TEORÍA ────────────────────────────────────────────

type RecursoLiterario = {
  nombre: string;
  categoria: "tropos" | "repeticion" | "construccion";
  definicion: string;
  ejemplo: string;
  fuente: string;
  efecto: string;
};

const RECURSOS_LITERARIOS: RecursoLiterario[] = [
  // ── TROPOS ──
  {
    nombre: "Metáfora",
    categoria: "tropos",
    definicion: "Identifica dos realidades sin partícula comparativa (sin «como»).",
    ejemplo: "«Trescientas rosas morenas / lleva tu pechera blanca.»",
    fuente: "García Lorca, Romance sonámbulo",
    efecto: "Condensa el significado; hace concreto lo abstracto; evoca sin nombrar directamente.",
  },
  {
    nombre: "Símil (comparación)",
    categoria: "tropos",
    definicion: "Une dos realidades mediante «como», «cual» u otra partícula comparativa.",
    ejemplo: "«piedras blancas y enormes como huevos prehistóricos»",
    fuente: "García Márquez, Cien años de soledad",
    efecto:
      "Ilumina una cualidad específica; crea imagen visual precisa; ancla lo desconocido en lo conocido.",
  },
  {
    nombre: "Personificación",
    categoria: "tropos",
    definicion:
      "Atribuye cualidades, acciones o sentimientos humanos a seres inanimados o abstractos.",
    ejemplo: "«las maderas crujían por la desesperación de los clavos»",
    fuente: "García Márquez, Cien años de soledad",
    efecto:
      "Humaniza el entorno; genera empatía o inquietud; puede invertir la jerarquía sujeto-espacio.",
  },
  {
    nombre: "Hipérbole",
    categoria: "tropos",
    definicion: "Exageración deliberada que desborda la realidad.",
    ejemplo: "«En Nápoles mil y trescientas»",
    fuente: "Zorrilla, Don Juan Tenorio",
    efecto:
      "Enfatiza un rasgo; puede producir humor, ironía o dramatismo; revela la subjetividad del hablante.",
  },
  {
    nombre: "Ironía",
    categoria: "tropos",
    definicion:
      "Dice lo contrario de lo que se quiere comunicar; el lector debe descodificar el sentido real.",
    ejemplo: "«unos países se especializan en ganar y otros en perder»",
    fuente: "Galeano, Las venas abiertas de América Latina",
    efecto:
      "Crea distancia crítica; denuncia sin acusación directa; implica al lector en el juicio.",
  },
  {
    nombre: "Antítesis",
    categoria: "tropos",
    definicion: "Contrapone dos ideas, palabras o estructuras de significado opuesto.",
    ejemplo: "«Es tan corto el amor, y es tan largo el olvido.»",
    fuente: "Neruda, Poema XX",
    efecto:
      "Enfatiza el contraste; crea tensión semántica; obliga al lector a pesar las dos opciones.",
  },
  {
    nombre: "Oxímoron",
    categoria: "tropos",
    definicion: "Une dos términos que se contradicen en una sola expresión.",
    ejemplo: "«oscura claridad», «silencio ensordecedor»",
    fuente: "-",
    efecto:
      "Comprime una paradoja; sugiere que la realidad es más compleja que los opuestos simples.",
  },
  {
    nombre: "Paradoja",
    categoria: "tropos",
    definicion: "Afirmación aparentemente imposible que encierra una verdad profunda.",
    ejemplo:
      "«El diámetro del Aleph sería de dos o tres centímetros, pero el espacio cósmico estaba ahí, sin disminución de tamaño.»",
    fuente: "Borges, El Aleph",
    efecto:
      "Obliga al lector a pensar; desafía las categorías racionales; puede ser el argumento filosófico central del texto.",
  },
  {
    nombre: "Alegoría",
    categoria: "tropos",
    definicion:
      "Metáfora sostenida a lo largo de un texto: cada elemento representa algo más allá de su sentido literal.",
    ejemplo:
      "El «aldeano vanidoso» representa a los dirigentes latinoamericanos ciegos ante el imperialismo.",
    fuente: "Martí, Nuestra América",
    efecto:
      "Permite la lectura en dos niveles simultáneos; hace que ideas abstractas sean narrativamente concretas.",
  },
  {
    nombre: "Sinécdoque",
    categoria: "tropos",
    definicion: "Usa la parte por el todo, o el todo por la parte.",
    ejemplo: "«Su voz, su cuerpo claro. Sus ojos infinitos.»",
    fuente: "Neruda, Poema XX",
    efecto:
      "Concentra la evocación; la fragmentación puede sugerir pérdida o fetichización de la figura evocada.",
  },
  {
    nombre: "Metonimia",
    categoria: "tropos",
    definicion:
      "Sustituye un concepto por otro con el que tiene una relación de contigüidad (causa/efecto, continente/contenido…).",
    ejemplo: "«la pluma» por el escritor; «el cetro» por el poder real",
    fuente: "-",
    efecto:
      "Evoca sin nombrar; crea resonancias culturales; puede revelar actitudes hacia lo que representa.",
  },
  {
    nombre: "Eufemismo",
    categoria: "tropos",
    definicion: "Sustituye un término considerado tabú o desagradable por una expresión más suave.",
    ejemplo: "«simple y silencioso matrimonio de hermanos»",
    fuente: "Cortázar, Casa tomada",
    efecto:
      "Revela qué considera la sociedad innombrable; puede crear ironía al suavizar algo grave; implica al lector en el descubrimiento del tabú.",
  },
  // ── REPETICIÓN ──
  {
    nombre: "Anáfora",
    categoria: "repeticion",
    definicion:
      "Repetición de una misma palabra o expresión al comienzo de versos o cláusulas consecutivas.",
    ejemplo: "«Vi el populoso mar, vi el alba y la tarde, vi las muchedumbres de América…»",
    fuente: "Borges, El Aleph",
    efecto:
      "Crea ritmo hipnótico; enfatiza la acumulación; puede mimetizar en la forma el contenido (lo interminable, lo circular).",
  },
  {
    nombre: "Epífora",
    categoria: "repeticion",
    definicion: "Repetición de una misma palabra o expresión al final de versos o cláusulas.",
    ejemplo: "«¡esas… no volverán! / […] ¡esas… no volverán!»",
    fuente: "Bécquer, Rima LIII",
    efecto:
      "Genera cierre enfático; la insistencia final convierte el elemento repetido en el argumento emocional central.",
  },
  {
    nombre: "Paralelismo",
    categoria: "repeticion",
    definicion: "Repetición de la misma estructura sintáctica en cláusulas o versos consecutivos.",
    ejemplo: "«ante la adversidad, calla; bajo la presión, resiste»",
    fuente: "Paz, El laberinto de la soledad",
    efecto:
      "Crea equilibrio y simetría; invita a comparar los elementos paralelos; da ritmo sentencioso.",
  },
  {
    nombre: "Aliteración",
    categoria: "repeticion",
    definicion: "Repetición de sonidos consonánticos iguales o similares en palabras próximas.",
    ejemplo: "«Con el ala a sus cristales / jugando llamarán»",
    fuente: "Bécquer, Rima LIII",
    efecto:
      "Musicalidad; puede imitar sonidos (función onomatopéyica); subraya la conexión entre palabras.",
  },
  {
    nombre: "Polisíndeton",
    categoria: "repeticion",
    definicion: "Uso de más conjunciones de las gramaticalmente necesarias.",
    ejemplo: "«calderos, y las pailas, y las tenazas, y los anafes»",
    fuente: "García Márquez, Cien años de soledad",
    efecto: "Ralentiza el ritmo; transmite acumulación exhaustiva; puede expresar asombro o caos.",
  },
  {
    nombre: "Asíndeton",
    categoria: "repeticion",
    definicion: "Supresión de conjunciones entre elementos de una enumeración.",
    ejemplo: "«Su voz, su cuerpo claro. Sus ojos infinitos.»",
    fuente: "Neruda, Poema XX",
    efecto: "Acelera el ritmo; crea urgencia o fragmentación; puede sugerir lo inabarcable.",
  },
  // ── CONSTRUCCIÓN ──
  {
    nombre: "Hipérbaton",
    categoria: "construccion",
    definicion: "Alteración del orden sintáctico habitual de la oración.",
    ejemplo: "«Con la sombra en la cintura / ella sueña en su baranda»",
    fuente: "García Lorca, Romance sonámbulo",
    efecto:
      "Desplaza el énfasis hacia el término en posición anómala; confiere poeticidad o arcaísmo; puede crear ambigüedad.",
  },
  {
    nombre: "Elipsis",
    categoria: "construccion",
    definicion: "Omisión de palabras que se sobreentienden por el contexto.",
    ejemplo: "«Pensar que no la tengo. Sentir que la he perdido.»",
    fuente: "Neruda, Poema XX",
    efecto:
      "Acelera el ritmo; crea intensidad; implica al lector en la reconstrucción del sentido omitido.",
  },
  {
    nombre: "Enumeración",
    categoria: "construccion",
    definicion: "Sucesión de elementos de la misma categoría gramatical o semántica.",
    ejemplo: "«calderos, las pailas, las tenazas y los anafes»",
    fuente: "García Márquez, Cien años de soledad",
    efecto: "Acumula; puede expresar abundancia, caos o exhaustividad; da ritmo de lista.",
  },
  {
    nombre: "Gradación",
    categoria: "construccion",
    definicion:
      "Enumeración en orden ascendente (clímax) o descendente (anticlímax) de intensidad.",
    ejemplo: "Golondrinas → madreselvas → el amor mismo (de lo exterior a lo íntimo)",
    fuente: "Bécquer, Rima LIII",
    efecto: "Crea suspense o conclusión inevitable; el clímax dramatiza el argumento emocional.",
  },
  {
    nombre: "Interrogación retórica",
    categoria: "construccion",
    definicion: "Pregunta que no espera respuesta, sino que enfatiza o implica al lector.",
    ejemplo: "«¿No ves la herida que tengo / desde el pecho a la garganta?»",
    fuente: "García Lorca, Romance sonámbulo",
    efecto:
      "Implica emocionalmente al lector; enfatiza lo evidente; puede funcionar como acusación velada.",
  },
  {
    nombre: "Apóstrofe",
    categoria: "construccion",
    definicion: "Interpelación directa a una persona ausente, muerta o a una abstracción.",
    ejemplo: "«Verde que te quiero verde.»",
    fuente: "García Lorca, Romance sonámbulo",
    efecto:
      "Crea intimidad dramática; involucra emocionalmente al destinatario ficticio y al lector.",
  },
  {
    nombre: "Leitmotiv",
    categoria: "construccion",
    definicion:
      "Motivo (imagen, frase o idea) que se repite a lo largo del texto con variaciones y acumulación de significado.",
    ejemplo: "El verso «Puedo escribir los versos más tristes esta noche» como eje estructural.",
    fuente: "Neruda, Poema XX",
    efecto:
      "Unifica el texto; cada repetición añade una capa de significado; crea la sensación de circularidad o inevitabilidad.",
  },
];

// ── COLORES ──────────────────────────────────────────────────

const CRITERIO_COLOR: Record<string, string> = {
  A: "bg-blue-500/15 text-blue-700 border-blue-300",
  B: "bg-amber-500/15 text-amber-700 border-amber-300",
  C: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  D: "bg-rose-500/15 text-rose-700 border-rose-300",
};

const NIVEL_COLOR: Record<EjercicioId["nivel"], string> = {
  Básico: "bg-slate-100 text-slate-600 border-slate-200",
  "Básico-Medio": "bg-sky-50 text-sky-700 border-sky-200",
  Medio: "bg-violet-50 text-violet-700 border-violet-200",
  "Medio-Avanzado": "bg-amber-50 text-amber-700 border-amber-200",
  IB: "bg-rose-50 text-rose-700 border-rose-200",
};

const CATEGORIA_LABEL: Record<RecursoLiterario["categoria"], string> = {
  tropos: "Tropos",
  repeticion: "Repetición",
  construccion: "Construcción",
};

const CATEGORIA_COLOR: Record<RecursoLiterario["categoria"], string> = {
  tropos: "bg-violet-500/15 text-violet-700 border-violet-300",
  repeticion: "bg-amber-500/15 text-amber-700 border-amber-300",
  construccion: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
};

// ── COMPONENTES ──────────────────────────────────────────────

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
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              NIVEL_COLOR[ej.nivel],
            )}
          >
            {ej.nivel}
          </span>
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
            {ej.nivel_objetivo === "análisis" ? "análisis" : "la interpretación"} explica el
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

function TeoriaRecursos() {
  const [filtro, setFiltro] = useState<RecursoLiterario["categoria"] | "todos">("todos");

  const recursos =
    filtro === "todos"
      ? RECURSOS_LITERARIOS
      : RECURSOS_LITERARIOS.filter((r) => r.categoria === filtro);

  const categorias: Array<{ value: RecursoLiterario["categoria"] | "todos"; label: string }> = [
    { value: "todos", label: `Todos (${RECURSOS_LITERARIOS.length})` },
    {
      value: "tropos",
      label: `Tropos (${RECURSOS_LITERARIOS.filter((r) => r.categoria === "tropos").length})`,
    },
    {
      value: "repeticion",
      label: `Repetición (${RECURSOS_LITERARIOS.filter((r) => r.categoria === "repeticion").length})`,
    },
    {
      value: "construccion",
      label: `Construcción (${RECURSOS_LITERARIOS.filter((r) => r.categoria === "construccion").length})`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {categorias.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFiltro(cat.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs border transition-colors",
              filtro === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card hover:bg-accent text-foreground/80",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {recursos.map((r) => (
          <Card key={r.nombre} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-ink text-sm">{r.nombre}</span>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                  CATEGORIA_COLOR[r.categoria],
                )}
              >
                {CATEGORIA_LABEL[r.categoria]}
              </span>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed">{r.definicion}</p>

            <div className="rounded-md bg-parchment/50 px-3 py-2 border border-border/60">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                Ejemplo
              </div>
              <p className="font-serif text-[13px] text-ink leading-snug italic">{r.ejemplo}</p>
              {r.fuente !== "-" && (
                <p className="text-[10px] text-muted-foreground mt-1">— {r.fuente}</p>
              )}
            </div>

            <div className="rounded-md bg-amber-50/60 px-3 py-2 border border-amber-200/60">
              <div className="text-[10px] uppercase tracking-[0.15em] text-amber-700 mb-1">
                Efecto en el lector
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">{r.efecto}</p>
            </div>
          </Card>
        ))}
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
            Practica con preguntas de progresión gradual hasta el nivel IB, y consulta la ficha de
            recursos literarios cuando necesites repasar.
          </p>
        </div>

        <Tabs defaultValue="identificacion">
          <TabsList className="mb-6 w-full sm:w-auto flex-wrap h-auto gap-1">
            <TabsTrigger value="identificacion" className="text-xs">
              Identificación
            </TabsTrigger>
            <TabsTrigger value="efectos" className="text-xs">
              Efectos
            </TabsTrigger>
            <TabsTrigger value="reescritura" className="text-xs">
              Reescritura
            </TabsTrigger>
            <TabsTrigger value="teoria" className="text-xs">
              Recursos literarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identificacion">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">Identificación de recursos</div>
                <p className="text-xs text-muted-foreground">
                  Progresión de Básico a IB. Identifica el recurso retórico y su función.
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
                  lector. Preguntas al estilo IB.
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

          <TabsContent value="teoria">
            <Card className="p-6">
              <div className="mb-5">
                <div className="font-medium text-ink text-sm mb-1">Recursos literarios</div>
                <p className="text-xs text-muted-foreground">
                  Ficha de consulta rápida: definición, ejemplo de texto canónico y efecto en el
                  lector. Filtra por categoría.
                </p>
              </div>
              <TeoriaRecursos />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
