import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { COURSES } from "@/lib/ib-courses";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

const TABS_VALIDOS = ["identificacion", "efectos", "reescritura", "teoria"] as const;
type TabEjercicios = (typeof TABS_VALIDOS)[number];

export const Route = createFileRoute("/ejercicios")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabEjercicios } => ({
    tab: TABS_VALIDOS.includes(search.tab as TabEjercicios)
      ? (search.tab as TabEjercicios)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Exercises — LIBerico" },
      { name: "description", content: "Practice exercises to strengthen your literary analysis." },
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
      "¿Cómo se denomina la figura retórica que repite una misma expresión al comienzo de versos o cláusulas sucesivas?",
    opciones: ["Epífora", "Anáfora", "Aliteración", "Paralelismo"],
    correcta: 1,
    explicacion:
      "La anáfora repite una expresión al inicio de varias unidades. En el Poema XX, el verso «Puedo escribir los versos más tristes esta noche» regresa varias veces para marcar los vaivenes emocionales del hablante: cada aparición señala un nuevo intento de distanciarse del recuerdo, y cada vez fracasa. La epífora, en cambio, repite al final de las unidades.",
    criterio: "B",
  },
  {
    id: 2,
    nivel: "Básico",
    fragmento: "Sus dientes eran blancos como marfil y sus labios como coral encendido.",
    pregunta: "¿Qué figura retórica une las descripciones mediante la palabra «como»?",
    opciones: ["Metáfora", "Símil", "Hipérbole", "Personificación / prosopopeya"],
    correcta: 1,
    explicacion:
      "El símil establece una comparación explícita mediante partículas como «como», «cual» o «parecía». A diferencia de la metáfora, no identifica los dos términos sino que los acerca señalando la similitud. Aquí el símil no solo describe físicamente a la persona, sino que la equipara a materiales preciosos —marfil, coral—, elevando la descripción a una dimensión casi escultórica.",
    criterio: "B",
  },
  {
    id: 3,
    nivel: "Básico-Medio",
    fragmento:
      "Las maderas crujían por la desesperación de los clavos y los tornillos tratando de desenclavarse.",
    pregunta:
      "¿Qué figura retórica emplea García Márquez al atribuirle «desesperación» a los clavos?",
    opciones: ["Hipérbole", "Personificación / prosopopeya", "Ironía", "Símil"],
    correcta: 1,
    explicacion:
      "La personificación / prosopopeya atribuye emociones o acciones humanas a objetos inanimados. Aquí, los clavos «desesperan», convirtiendo la atracción magnética en un impulso casi volitivo. Este recurso sostiene el realismo mágico de Macondo: la naturaleza inerte reacciona como si sintiera urgencia. La hipérbole, en cambio, exageraría sin necesariamente humanizar.",
    criterio: "B",
  },
  {
    id: 4,
    nivel: "Básico-Medio",
    fragmento:
      "Verde que te quiero verde.\nVerde viento. Verdes ramas.\nEl barco sobre la mar\ny el caballo en la montaña.",
    pregunta:
      "¿Cuál de estas opciones describe con mayor precisión el recurso de repetición empleado en los dos primeros versos?",
    opciones: [
      "Anáfora: «verde» se repite al inicio de cada unidad, acumulando significados",
      "Aliteración: se repiten sonidos consonánticos similares entre palabras próximas",
      "Polisíndeton: se acumulan conjunciones para ralentizar el ritmo",
      "Elipsis: se omite el verbo para crear suspense narrativo",
    ],
    correcta: 0,
    explicacion:
      "La anáfora repite «verde» al inicio de versos y cláusulas. Pero en Lorca la distinción entre anáfora y símbolo es inseparable: la repetición no es solo un recurso sonoro, sino el mecanismo por el que el color acumula significados (deseo, naturaleza, muerte). La anáfora convierte «verde» en una obsesión que el lector siente antes de descifrar racionalmente.",
    criterio: "B",
  },
  {
    id: 5,
    nivel: "Básico-Medio",
    fragmento: "Con el ala a sus cristales / jugando llamarán.",
    pregunta:
      "¿Qué figura retórica altera el orden gramatical habitual de esta oración de Bécquer?",
    opciones: ["Anáfora", "Hipérbaton", "Elipsis", "Asíndeton"],
    correcta: 1,
    explicacion:
      "El hipérbaton invierte el orden esperado: la oración normativa sería «las golondrinas llamarán jugando con el ala a sus cristales». Bécquer desplaza el complemento circunstancial al inicio para que lo primero que el lector reciba sea la imagen concreta del ala tocando el cristal, antes que el sujeto y el verbo. Ese desplazamiento crea una textura más poética y focaliza el detalle sensorial.",
    criterio: "B",
  },
  {
    id: 6,
    nivel: "Medio",
    fragmento: "Vivo sin vivir en mí,\ny tan alta vida espero,\nque muero porque no muero.",
    pregunta:
      "¿Qué figura retórica organiza estos versos, y qué idea expresa sobre la experiencia espiritual?",
    opciones: [
      "Una hipérbole: exagera el deseo de morir para crear dramatismo",
      "Una antítesis: contrapone vida y muerte sin relacionarlas",
      "Una paradoja: vivir y morir se vuelven compatibles para expresar una verdad espiritual",
      "Una metonimia: usa la muerte para representar la experiencia religiosa en general",
    ],
    correcta: 2,
    explicacion:
      "La paradoja combina proposiciones incompatibles —vivir sin vivir, morir porque no se muere— para expresar una verdad que no cabe en la lógica cotidiana. La voz poética no busca morir literalmente: formula la tensión mística entre la vida terrenal y una vida espiritual más alta. La antítesis solo yuxtapondría opuestos; aquí la contradicción produce el sentido.",
    criterio: "B",
  },
  {
    id: 7,
    nivel: "Medio",
    fragmento:
      "Macondo era entonces una aldea de veinte casas de barro y cañabrava construidas a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos.",
    pregunta:
      "¿Qué efecto tiene el símil «como huevos prehistóricos» en la construcción del mundo de Macondo?",
    opciones: [
      "Describe con precisión científica el tamaño y la forma de las piedras del río",
      "Introduce un toque de humor absurdo al comparar piedras con algo doméstico",
      "Conecta el mundo de Macondo con un tiempo anterior a la historia humana, situando el pueblo en un origen mítico",
      "Crea una hipérbole que exagera la belleza del río para enaltecer el lugar fundacional",
    ],
    correcta: 2,
    explicacion:
      "Los «huevos prehistóricos» no describen el tamaño sino el tiempo: Macondo se sitúa antes de la historia humana, en un momento primigenio donde todo está naciendo. García Márquez establece así, en la primera oración de la novela, que Macondo no es un pueblo realista sino un espacio mítico fundacional. El símil no es decorativo: es el primer gesto del realismo mágico.",
    criterio: "A",
  },
  {
    id: 8,
    nivel: "Medio",
    fragmento:
      "Pensar que no la tengo. Sentir que la he perdido.\nOír la noche inmensa, más inmensa sin ella.",
    pregunta:
      "¿Qué dos recursos combinados refuerzan el vaciamiento emocional del hablante en estos versos de Neruda?",
    opciones: [
      "Anáfora e hipérbole: la repetición inicial y la exageración crean dramatismo",
      "Elipsis y gradación: la omisión del sujeto y la intensificación progresiva del vacío",
      "Antítesis y aliteración: el contraste entre tener y perder, subrayado por sonidos similares",
      "Personificación / prosopopeya y símil: la noche actúa como personaje y se compara con el dolor",
    ],
    correcta: 1,
    explicacion:
      "La elipsis suprime el sujeto «yo» en los infinitivos —«Pensar», «Sentir», «Oír»— disolviendo al hablante: ya no hay un yo que actúe, solo acciones que le ocurren. La gradación avanza desde el pensamiento (abstracto) a la emoción a la percepción sensorial, y culmina en la noche «más inmensa sin ella». La noche no crece: el hablante se hace más pequeño.",
    criterio: "B",
  },
  {
    id: 9,
    nivel: "Medio-Avanzado",
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
      "La antítesis «volverán» / «¡esas... no volverán!» es el eje argumental de toda la rima. Bécquer no lamenta que el amor acabe: lamenta que lo vivido con esa persona específica sea irrepetible. La naturaleza renueva sus instancias; el amor no renueva las suyas. La antítesis le da forma retórica a esa distinción filosófica entre lo universal y lo particular.",
    criterio: "B",
  },
  {
    id: 10,
    nivel: "Medio-Avanzado",
    fragmento:
      "¿Y qué decir de la Iglesia, que abandonó el latinoamérica real para instalarse en el latinoamérica abstracto?",
    pregunta:
      "¿Qué estrategia retórica usa Martí y por qué resulta más eficaz que una afirmación directa?",
    opciones: [
      "Una hipérbole: exagera el error de la Iglesia para ridiculizarla",
      "Una interrogación retórica: formula una acusación en forma de pregunta para implicar al lector en el juicio sin declararlo explícitamente",
      "Una antítesis: contrapone dos Américas Latinas —la real y la abstracta— como espacios equivalentes",
      "Un eufemismo: suaviza la crítica a la Iglesia para no provocar rechazo inmediato",
    ],
    correcta: 1,
    explicacion:
      "La interrogación retórica no espera respuesta: es una acusación disfrazada de pregunta. Al no afirmar directamente «la Iglesia abandonó la realidad», Martí involucra al lector en el juicio: quien lee la pregunta ya sabe la respuesta, y al articularla mentalmente se convierte en cómplice del argumento. Es más eficaz que la afirmación porque obliga al lector a pronunciar el veredicto por sí mismo.",
    criterio: "B",
  },
  {
    id: 11,
    nivel: "Medio-Avanzado",
    fragmento: "Vine, vi, vencí.",
    pregunta:
      "Además de ser una gradación ascendente (llegar → ver → vencer), ¿qué otro recurso fonético refuerza la contundencia de esta sentencia?",
    opciones: [
      "Rima consonante entre los tres verbos al final de cada sílaba",
      "Aliteración del sonido /v/ en los tres verbos, que crea un ritmo percusivo",
      "Hipérbaton que invierte el orden temporal de las acciones",
      "Polisíndeton que acumula los verbos con conjunciones para ralentizar la lectura",
    ],
    correcta: 1,
    explicacion:
      "La gradación (llegar → ver → vencer) comunica la velocidad y eficacia de la campaña. Pero la aliteración del sonido /v/ —«Vine, vi, vencí»— añade un efecto percusivo que mimetiza en el sonido la contundencia del contenido: tres golpes breves, sin vacilación. El lector no solo entiende la rapidez del triunfo, la escucha en el ritmo.",
    criterio: "B",
  },
  {
    id: 12,
    nivel: "IB",
    fragmento:
      "Hoy la tierra y los cielos me sonríen,\nhoy llega al fondo de mi alma el sol,\nhoy la he visto..., la he visto y me ha mirado...\n¡hoy creo en Dios!",
    pregunta:
      "¿Cómo construye Bécquer la estructura climática de esta estrofa y qué implica el verso final sobre la experiencia amorosa?",
    opciones: [
      "Mediante una gradación descendente: el poema va de lo cósmico a lo íntimo para mostrar que el amor es pequeño frente al cosmos",
      "Mediante una gradación ascendente con anáfora de «hoy»: los fenómenos cósmicos son escalones hacia la experiencia amorosa, que se equipara a la revelación religiosa",
      "Mediante una antítesis entre el mundo exterior (cielos, sol) y el mundo interior (el alma), que demuestra la separación entre ambos planos",
      "Mediante una hipérbole que compara el amor con Dios para ironizar sobre las convenciones románticas",
    ],
    correcta: 1,
    explicacion:
      "La anáfora de «hoy» marca cuatro escalones: naturaleza (tierra y cielos), calor interior (el sol en el alma), el encuentro visual (la he visto), la consecuencia teológica (creo en Dios). La gradación convierte el poema en un argumento: el amor no se añade a la lista de experiencias bellas, sino que las genera y las corona. Al afirmar «creo en Dios» después de «la he visto», Bécquer propone que la experiencia amorosa es la forma más directa de la revelación. La fe llega por los ojos, no por la doctrina.",
    criterio: "A",
  },
  {
    id: 13,
    nivel: "IB",
    fragmento:
      "No hay cómplices más activos que los cómplices inocentes. El latinoamericano que cree que su continente no tiene historia o que la historia comenzó con la conquista europea, no sabe que está siendo cómplice de quienes lo despojaron de su memoria.",
    pregunta:
      "¿Qué recurso organiza el argumento de Galeano y cuál es su función ideológica en el contexto de la obra?",
    opciones: [
      "La paradoja «cómplices inocentes»: invierte las categorías morales para demostrar que la ignorancia es una forma activa de colaboración con el poder",
      "La hipérbole del «latinoamericano» genérico: exagera la pasividad política para provocar al lector",
      "La anáfora de «cómplice»: la repetición acumula la acusación hasta hacerla irrefutable",
      "El eufemismo «inocente»: suaviza la crítica para que el lector no se sienta directamente atacado",
    ],
    correcta: 0,
    explicacion:
      "«Cómplices inocentes» es un oxímoron con consecuencias argumentativas: si alguien es inocente, no puede ser cómplice; si es cómplice, no es inocente. Galeano resuelve la contradicción redefiniendo la inocencia: quien no sabe —pero podría saber— ya eligió no saber. Este movimiento retórico convierte la ignorancia en una decisión política, que es el argumento central de Las venas abiertas: el subdesarrollo no es un accidente sino el resultado de elecciones, incluida la de no recordar.",
    criterio: "A",
  },
  {
    id: 14,
    nivel: "IB",
    fragmento:
      "Puedo escribir los versos más tristes esta noche.\nEscribir, por ejemplo: «La noche está estrellada,\ny tiritan, azules, los astros, a lo lejos».\n[...] Puedo escribir los versos más tristes esta noche.",
    pregunta:
      "¿Qué efecto produce la anáfora de «Puedo escribir» en la construcción del duelo en el Poema XX de Neruda?",
    opciones: [
      "Crea una simple musicalidad ornamental sin relación con el sentido",
      "La anáfora muestra que la voz poética vuelve una y otra vez al mismo gesto de escribir para controlar un recuerdo que se le escapa",
      "Introduce una gradación que va de lo pequeño a lo cósmico para mostrar la magnitud del amor",
      "Produce un efecto de cierre definitivo porque la repetición elimina la ambivalencia emocional",
    ],
    correcta: 1,
    explicacion:
      "La anáfora de «Puedo escribir» no afirma dominio; muestra un intento repetido de dominar el duelo mediante la escritura. Cada regreso del verso reabre la herida: la voz poética parece capaz de escribir, pero no de cerrar el recuerdo. El efecto es una oscilación clara entre control formal y desbordamiento emocional.",
    criterio: "B",
  },
  {
    id: 15,
    nivel: "IB",
    fragmento:
      "A veces llegábamos a creer que era ella la que no nos dejaba casarnos.\nIrene rechazó dos pretendientes sin mayor explicación.",
    pregunta:
      "¿Qué recurso narrativo usa Cortázar en estos versos y qué función tiene en la economía del relato?",
    opciones: [
      "La personificación / prosopopeya de la casa, que le atribuye voluntad propia para invertir la jerarquía entre espacio y personajes",
      "La ironía del narrador, que critica la pasividad de los personajes sin declararlo abiertamente",
      "La elipsis narrativa, que omite las razones reales del rechazo para crear suspense",
      "La hipérbole de la influencia de la casa, exagerada para crear efecto gótico",
    ],
    correcta: 0,
    explicacion:
      "Al concederle a la casa una voluntad propia («era ella la que no nos dejaba»), Cortázar invierte la jerarquía habitual: no son los personajes quienes habitan el espacio, sino el espacio quien los posee. Esto genera amenaza difusa antes de que ocurra nada explícitamente sobrenatural. Además, la personificación / prosopopeya exime a los personajes de responsabilidad psicológica: culpar a la casa es más cómodo que admitir su parálisis. El lector percibe esa evasión y entiende que el verdadero «fantasma» es la incapacidad de vivir fuera de ella.",
    criterio: "B",
  },
];

const EJERCICIOS_IDENTIFICACION_EN: EjercicioId[] = [
  {
    id: 1,
    nivel: "Básico",
    fragmento: "We cannot dedicate—we cannot consecrate—we cannot hallow—this ground.",
    pregunta:
      "What is the name of the rhetorical figure that repeats the same expression at the beginning of successive clauses?",
    opciones: ["Epistrophe", "Anaphora", "Alliteration", "Parallelism"],
    correcta: 1,
    explicacion:
      "Anaphora repeats an expression at the start of consecutive units. In Lincoln's Gettysburg Address, «we cannot» opens three successive clauses, building rhetorical force through cumulative denial: each repetition sharpens the speaker's humility before the dead. Epistrophe, by contrast, repeats at the end of the units.",
    criterio: "B",
  },
  {
    id: 2,
    nivel: "Básico",
    fragmento: "O my Luve is like a red, red rose / That's newly sprung in June.",
    pregunta: "Which rhetorical figure links the descriptions through the word «like»?",
    opciones: ["Metaphor", "Simile", "Hyperbole", "Personification"],
    correcta: 1,
    explicacion:
      "A simile establishes an explicit comparison through markers such as «like», «as», or «seems». Unlike a metaphor, it does not identify the two terms but draws them close by pointing to their resemblance. Burns does not say his love is a rose: he says she is like one, and the simile holds the human and the floral side by side, freshness and all.",
    criterio: "B",
  },
  {
    id: 3,
    nivel: "Básico-Medio",
    fragmento:
      "I am silver and exact. I have no preconceptions. / Whatever I see I swallow immediately.",
    pregunta:
      "Which rhetorical figure does Plath use when she gives the mirror a first-person voice that «swallows» what it sees?",
    opciones: ["Hyperbole", "Personification", "Irony", "Simile"],
    correcta: 1,
    explicacion:
      "Personification attributes human qualities, voice, or volition to inanimate objects. Plath's mirror does not merely reflect: it speaks, claims objectivity, and «swallows» images, turning passive reflection into an act with appetite. The device makes the mirror an unsettling moral witness, which is the conceit of the poem.",
    criterio: "B",
  },
  {
    id: 4,
    nivel: "Básico-Medio",
    fragmento: "Quoth the Raven, 'Nevermore.'\n[...]\nQuoth the Raven, 'Nevermore.'",
    pregunta:
      "Which option most precisely describes the device of repetition used across these lines from Poe's poem?",
    opciones: [
      "Refrain (a form of structural repetition): the same line returns at fixed points, accumulating new resonance with each appearance",
      "Alliteration: similar consonant sounds repeat across nearby words",
      "Polysyndeton: conjunctions accumulate to slow the rhythm",
      "Ellipsis: the verb is omitted to create narrative suspense",
    ],
    correcta: 0,
    explicacion:
      "The refrain «Nevermore» returns at fixed structural points, but its meaning is not fixed: each return answers a different question and acquires a darker semantic weight, until the bird's single word indicts the speaker's hopes one by one. The repetition is not decorative — it converts a sound into a sentence.",
    criterio: "B",
  },
  {
    id: 5,
    nivel: "Básico-Medio",
    fragmento:
      "Of man's first disobedience, and the fruit / Of that forbidden tree, whose mortal taste / Brought death into the World, and all our woe...",
    pregunta:
      "Which rhetorical figure alters the usual grammatical order of this opening from Milton's Paradise Lost?",
    opciones: ["Anaphora", "Hyperbaton", "Ellipsis", "Asyndeton"],
    correcta: 1,
    explicacion:
      "Hyperbaton inverts the expected order: ordinary English would place subject and verb first («Sing, Heavenly Muse, of man's first disobedience…», which Milton supplies only later). By delaying the main verb across many lines, Milton forces the reader through the entire weight of the Fall before the sentence resolves: form mimics theological gravity.",
    criterio: "B",
  },
  {
    id: 6,
    nivel: "Medio",
    fragmento:
      "Death, be not proud, though some have called thee / Mighty and dreadful, for thou art not so.",
    pregunta:
      "Which rhetorical figure does Donne use, and what idea does it express about the nature of death?",
    opciones: [
      "A hyperbole: it exaggerates death's power to convey the speaker's terror",
      "An antithesis: it juxtaposes pride and humility to create visual contrast",
      "A paradox: the apparently weaker speaker addresses and overrides the very power that should silence him",
      "A metonymy: it uses death to represent loss in general",
    ],
    correcta: 2,
    explicacion:
      "Donne's sonnet is built on the paradox that mortal speech can humiliate Death itself. The speaker accepts that death is «mighty and dreadful» in reputation but immediately denies the substance of that reputation. The contradiction is the argument: faith reverses the apparent hierarchy between mortal and mortality. An antithesis would simply juxtapose opposites without resolving the impossibility.",
    criterio: "B",
  },
  {
    id: 7,
    nivel: "Medio",
    fragmento: "Shall I compare thee to a summer's day? / Thou art more lovely and more temperate.",
    pregunta:
      "What effect does the extended comparison to a summer's day have on the construction of the beloved in Shakespeare's Sonnet 18?",
    opciones: [
      "It describes the season with botanical precision to ground the poem in nature",
      "It introduces a touch of humour by reducing the beloved to weather conditions",
      "It opens an extended metaphor that the poem then exceeds: the beloved surpasses the season the speaker proposed as a measure",
      "It creates a hyperbole that exaggerates the season's beauty in order to denigrate the beloved",
    ],
    correcta: 2,
    explicacion:
      "The opening simile is only a starting point: Shakespeare immediately announces that the beloved exceeds it («more lovely and more temperate»). The poem then enumerates summer's flaws — short lease, rough winds, dimmed gold — so that comparison becomes a measure the beloved breaks. The device is structural: the sonnet's argument is that ordinary metaphors are inadequate, which is why poetic language must intervene to preserve what the season cannot.",
    criterio: "A",
  },
  {
    id: 8,
    nivel: "Medio",
    fragmento:
      "I heard a Fly buzz – when I died – / The Stillness in the Room / Was like the Stillness in the Air – / Between the Heaves of Storm –",
    pregunta:
      "Which two combined devices reinforce the suspended atmosphere of this stanza by Dickinson?",
    opciones: [
      "Anaphora and hyperbole: an initial repetition and an exaggeration create drama",
      "Ellipsis (the dashes that suppress connectives) and climax (the building stillness toward the storm's heave)",
      "Antithesis and alliteration: the contrast between life and death, underscored by similar sounds",
      "Personification and simile: the storm is a character compared to the room",
    ],
    correcta: 1,
    explicacion:
      "Dickinson's dashes function as ellipses: they suppress the syntactic glue and force the reader to inhabit each pause. The climax is achieved through accumulation toward a single image — «the Heaves of Storm» — which freezes the moment before death. The grammar imitates the held breath of the dying speaker; nothing moves except the fly.",
    criterio: "B",
  },
  {
    id: 9,
    nivel: "Medio-Avanzado",
    fragmento:
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity...",
    pregunta:
      "Which rhetorical structure organizes Dickens's opening, and how does it reinforce the novel's argumentative thesis?",
    opciones: [
      "The anaphora of «it was»: it creates musicality and emphasizes the historical moment",
      "Antithesis sustained through parallel pairs («best/worst», «wisdom/foolishness», «belief/incredulity»): it juxtaposes incompatible judgements as simultaneously true, refusing the reader a single moral lens on the era",
      "An ascending climax: the pairs intensify until reaching a final clause",
      "An allegory of the French Revolution: the abstractions stand for historical figures",
    ],
    correcta: 1,
    explicacion:
      "The string of antitheses is the argumentative axis of the novel's opening. Dickens does not lament an ambiguous era: he insists that the same period truly is both extremes at once, and the parallel grammar makes the contradictions inseparable. Antithesis here is not a rhetorical flourish but a historiographical claim: revolutionary times resist single interpretations.",
    criterio: "B",
  },
  {
    id: 10,
    nivel: "Medio-Avanzado",
    fragmento: "What happens to a dream deferred? / Does it dry up / like a raisin in the sun?",
    pregunta:
      "Which rhetorical strategy does Hughes use, and why is it more effective than a direct statement?",
    opciones: [
      "A hyperbole: it exaggerates the failure of the dream to ridicule it",
      "A rhetorical question: it formulates a political accusation in question form, drawing the reader into delivering the verdict instead of imposing it",
      "An antithesis: it juxtaposes the dream and the raisin as equivalent objects",
      "A euphemism: it softens the criticism of the system to avoid provoking immediate rejection",
    ],
    correcta: 1,
    explicacion:
      "A rhetorical question expects no answer: it is an indictment in interrogative form. By not stating directly that segregation kills the dream, Hughes draws the reader into the judgement — anyone who reads the question already knows the answer, and articulating it mentally makes the reader complicit in the argument. The device is more powerful than direct assertion because it forces the reader to pronounce the verdict.",
    criterio: "B",
  },
  {
    id: 11,
    nivel: "Medio-Avanzado",
    fragmento: "I came, I saw, I conquered.",
    pregunta:
      "Beyond an ascending climax (arriving → seeing → conquering), which other phonetic device reinforces the force of this maxim in English translation?",
    opciones: [
      "Consonant rhyme between the three verbs at the end of each syllable",
      "Asyndeton (the deletion of conjunctions) combined with the parallel /aɪ/ vowel of «I», creating a percussive triple beat",
      "Hyperbaton that inverts the temporal order of the actions",
      "Polysyndeton that piles up the verbs with conjunctions to slow the reading",
    ],
    correcta: 1,
    explicacion:
      "The climax (arriving → seeing → conquering) communicates the speed of the campaign. But the asyndeton — no «and» between the verbs — combined with the repeated «I» pronoun produces a percussive triple beat that mimics in sound the force of the content: three short blows, without hesitation. The reader does not just understand the swiftness of the triumph: they hear it.",
    criterio: "B",
  },
  {
    id: 12,
    nivel: "IB",
    fragmento:
      "Stop all the clocks, cut off the telephone, / Prevent the dog from barking with a juicy bone, / Silence the pianos and with muffled drum / Bring out the coffin, let the mourners come.",
    pregunta:
      "How does Auden build the imperative structure of this stanza, and what does the cumulative grammar imply about grief?",
    opciones: [
      "Through a descending climax: the poem moves from the cosmic to the intimate to show that grief is small in the face of death",
      "Through an accumulation of imperatives that demand the world conform to the speaker's loss: the inability of public reality to reflect private grief is what the syntax tries — and fails — to correct",
      "Through an antithesis between the outer world and the inner world, which proves their separation",
      "Through a hyperbole that compares grief to apocalypse in order to ironize mourning conventions",
    ],
    correcta: 1,
    explicacion:
      "Auden's imperatives — stop, cut off, prevent, silence, bring out — pile up because the speaker cannot accept that the world keeps moving while the beloved is dead. The grammar is the argument: grief demands a universal silencing it can never actually impose. Each imperative is more impossible than the last, and that escalating impossibility is precisely the texture of bereavement.",
    criterio: "A",
  },
  {
    id: 13,
    nivel: "IB",
    fragmento: "O brawling love! O loving hate! / O anything, of nothing first create!",
    pregunta:
      "Which device organizes Romeo's complaint, and what is its function within the play's exploration of love?",
    opciones: [
      "The oxymoron «brawling love» / «loving hate»: it fuses contraries into single phrases, dramatizing love as a state that cannot be reasoned out of its contradictions",
      "The hyperbole of love's power: it exaggerates passion to provoke laughter",
      "The anaphora of «O»: the repetition piles up the lament until it becomes excessive",
      "The euphemism of «brawling»: it softens the violence so the listener does not feel attacked",
    ],
    correcta: 0,
    explicacion:
      "«Brawling love» and «loving hate» are oxymorons with dramaturgical consequences: they compress into a single phrase the impossibility Romeo is experiencing. Logic cannot resolve them, and that is the point — the play insists that love is precisely the experience in which contraries coexist without synthesis. Shakespeare makes the rhetorical figure carry the thematic argument.",
    criterio: "A",
  },
  {
    id: 14,
    nivel: "IB",
    fragmento:
      "I celebrate myself, and sing myself, / [...] / I am of old and young, of the foolish as much as the wise, / [...] / I am the poet of the Body and I am the poet of the Soul...",
    pregunta:
      "What effect does the anaphora of «I am», combined with an apparently inexhaustible enumeration, produce in Whitman's Song of Myself?",
    opciones: [
      "It creates an autobiographical catalogue that demonstrates the narrator's erudition",
      "The anaphora dissolves the bounded self into a multiplicity it claims to contain, and the enumeration imitates in syntax the democratic simultaneity Whitman wants to enact: the «I» becomes capacious enough to be the «we»",
      "It introduces a climax that moves from the small to the cosmic to show the magnitude of the speaker",
      "It produces a hypnotic effect through repetition that prepares the reader for a final revelation",
    ],
    correcta: 1,
    explicacion:
      "Whitman's anaphora of «I am» does not assert a single identity: it accommodates contraries — old and young, foolish and wise, body and soul — within one grammatical subject. The enumeration has no hierarchical order because the «I» Whitman invents has no exclusions. The effect is that the speaker stops being a person and becomes a method: a way of holding multitudes within a single voice, which is the poem's democratic argument.",
    criterio: "B",
  },
  {
    id: 15,
    nivel: "IB",
    fragmento:
      "Thus she passed from generation to generation — dear, inescapable, impervious, tranquil, and perverse.",
    pregunta:
      "Which narrative device does Faulkner use in this closing description of the Grierson house in «A Rose for Emily», and what function does it serve in the economy of the story?",
    opciones: [
      "The personification of the house and its occupant, granting the past its own will and inverting the hierarchy between space and townspeople",
      "The narrator's irony, which criticizes the town's curiosity without stating it openly",
      "Narrative ellipsis, which omits the real reasons for Emily's isolation in order to create suspense",
      "The hyperbole of Emily's resistance, exaggerated to create a Gothic effect",
    ],
    correcta: 0,
    explicacion:
      "By piling the adjectives «dear, inescapable, impervious, tranquil, and perverse» onto Emily — and by extension onto the house she will not leave — Faulkner inverts the usual hierarchy: it is no longer the people who inhabit the South but a Southern past that possesses them. The personification produces a diffuse menace before anything explicitly Gothic occurs. The reader senses that the real subject of the story is not Emily but the town's complicity in keeping her — and its own past — undisturbed.",
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
    fragmento:
      "Puedo escribir los versos más tristes esta noche.\nElla me quiso, a veces yo también la quería.\n[...]\nEs tan corto el amor, y es tan largo el olvido.",
    recurso: "Antítesis",
    recurso_en_texto: "«corto el amor» / «largo el olvido»",
    pregunta:
      "¿Qué efecto produce en el lector la antítesis final de este fragmento del Poema XX de Neruda?",
    respuesta_modelo:
      "La antítesis cuantifica la desproporción entre dos experiencias que el lenguaje común trata como comparables: amar y olvidar. Al reducirlas a una oposición de tamaño («corto» / «largo»), el verso convierte lo emocional en casi matemático, lo que intensifica la injusticia que el hablante siente. El lector experimenta el verso como una ley universal —no solo una queja personal— precisamente porque la antítesis tiene la economía y la contundencia de un aforismo. Además, la antítesis cierra un poema construido sobre el vaivén emocional: llega como una conclusión que el hablante pronuncia desde la amargura, no desde la sabiduría.",
    criterio: "B",
  },
  {
    id: 2,
    fragmento:
      "¡Antonio Torres Heredia,\nhijo y nieto de Camborios,\ncon una vara de mimbre\nva a Sevilla a ver los toros!\n[...]\nTrescientas rosas morenas\nlleva tu pechera blanca.\nTu sangre rezuma y huele\nalrededor de tu faja.",
    recurso: "Metáfora",
    recurso_en_texto: "«Trescientas rosas morenas» (= la sangre de las heridas)",
    pregunta:
      "¿Qué efecto produce en el lector la metáfora «Trescientas rosas morenas» en el Romance de la prendimiento de Antoñito el Camborio de García Lorca?",
    respuesta_modelo:
      "La metáfora transforma la sangre de una herida mortal en imagen floral, estetizando la violencia. El contraste cromático —rosas oscuras sobre pechera blanca— hace la muerte visualmente intensa sin nombrarla directamente. El efecto sobre el lector es simultáneamente de belleza y de horror: la hermosura de la imagen no puede ocultar lo que representa, y esa tensión irresuelta es característica de la poética lorquiana. El hablante lírico no se escandaliza ante la muerte sino que la embellece, lo que revela un código cultural donde la violencia y la estética conviven sin contradicción.",
    criterio: "B",
  },
  {
    id: 3,
    fragmento:
      "Desde el primer domingo en que llegaron, nosotros habíamos pensado tímidamente en casarnos, pero no tardamos en comprender que no podíamos. La casa nos hacía falta, no teníamos más remedio que vivir en ella. A veces llegábamos a creer que era ella la que no nos dejaba casarnos.\nIrene rechazó dos pretendientes sin mayor explicación.",
    recurso: "Personificación / prosopopeya",
    recurso_en_texto: "la casa «no nos dejaba casarnos»",
    pregunta:
      "¿Qué efecto produce en el lector que Cortázar atribuya a la casa la decisión de no dejar casarse a los protagonistas?",
    respuesta_modelo:
      "Al concederle a la casa una voluntad propia, Cortázar invierte la jerarquía habitual: ya no son los personajes quienes habitan el espacio, sino el espacio quien los posee. Esto genera una sensación de amenaza difusa antes de que ocurra nada explícitamente sobrenatural. Además, la personificación / prosopopeya exime a los personajes de responsabilidad psicológica: culpar a la casa es más cómodo que admitir su parálisis. El lector percibe esa evasión y entiende que el verdadero «fantasma» es la incapacidad de los protagonistas para vivir fuera de ella. El detalle de Irene rechazando pretendientes «sin mayor explicación» refuerza la misma lógica: los personajes nunca articulan sus razones porque no desean examinarlas.",
    criterio: "B",
  },
  {
    id: 4,
    fragmento:
      "Verde que te quiero verde.\nVerde viento. Verdes ramas.\nEl barco sobre la mar\ny el caballo en la montaña.\nCon la sombra en la cintura\nella sueña en su baranda,\nverde carne, pelo verde,\ncon ojos de fría plata.",
    recurso: "Símbolo polisémico",
    recurso_en_texto: "«verde» repetido en distintos contextos (deseo, naturaleza, muerte)",
    pregunta:
      "¿Qué efecto produce en el lector la acumulación del color verde en múltiples registros semánticos a lo largo de estos versos del Romance sonámbulo de Lorca?",
    respuesta_modelo:
      "El verde lorquiano no es un color descriptivo sino un símbolo que acumula significados sin agotarse en ninguno: evoca la naturaleza (viento, ramas), el deseo erótico (verde que te quiero verde), lo sobrenatural (ojos de fría plata) y, en otros momentos del poema, la muerte. Esta polisemia intencional provoca en el lector una sensación de ensoñación: no puede fijar el significado del color porque el poema no lo fija. El efecto es que el lector siente el verde antes de comprenderlo, que es exactamente lo que el Romancero gitano pretende: crear imágenes que afectan emocionalmente antes de ser descifradas racionalmente.",
    criterio: "B",
  },
  {
    id: 5,
    fragmento:
      "Puedo escribir los versos más tristes esta noche.\nEscribir, por ejemplo: «La noche está estrellada,\ny tiritan, azules, los astros, a lo lejos».\n[...] Puedo escribir los versos más tristes esta noche.",
    recurso: "Anáfora",
    recurso_en_texto: "«Puedo escribir…» repetido como gesto de control emocional",
    pregunta:
      "¿Qué efecto produce en el lector la anáfora de «Puedo escribir» en el Poema XX de Neruda?",
    respuesta_modelo:
      "La anáfora de «Puedo escribir» convierte la escritura en un gesto repetido de control: la voz poética intenta ordenar el dolor mediante una fórmula que vuelve una y otra vez. El lector percibe que esa repetición no cierra el duelo, sino que lo mantiene activo. Cada regreso del verso parece empezar de nuevo el mismo esfuerzo por separar el presente de la pérdida, y esa insistencia hace visible la dificultad de olvidar.",
    criterio: "B",
  },
  {
    id: 6,
    fragmento:
      "No quisimos llevar nada más, y antes de salir me arrepentí y tiré la llave a la alcantarilla. No fuese que a algún pobre diablo se le ocurriera robar y se metiera en la casa, a esa hora y con la casa tomada.",
    recurso: "Ironía",
    recurso_en_texto:
      "preocuparse de proteger a posibles ladrones de entrar en la casa que acaban de abandonar aterrados",
    pregunta:
      "¿Qué efecto produce en el lector que el narrador, después de huir aterrado de la casa, tire la llave para proteger a posibles ladrones de entrar en ella?",
    respuesta_modelo:
      "La ironía funciona por inversión de valores: quien debería proteger su propiedad de ladrones la abandona e intenta proteger a esos mismos ladrones de entrar en ella. Esto revela la magnitud del miedo que la casa inspira —tan aterrador que incluso un ladrón merece ser protegido de ella— sin que el narrador lo admita explícitamente. La ironía también señala la disociación psicológica del narrador: en el momento más dramático de la historia, piensa en normas sociales. Cortázar usa ese desajuste para sugerir que los personajes nunca fueron capaces de confrontar la realidad que los rodeaba: incluso al huir, siguen siendo las personas que organizaban su vida en torno a la corrección y el orden.",
    criterio: "B",
  },
  {
    id: 7,
    fragmento:
      "No te muevas, no respires, no quieras;\nnada me es tan ajeno como tu mano,\nnada me ata a la vida\ncomo este miedo de perderte.",
    recurso: "Paradoja",
    recurso_en_texto: "«nada me ata a la vida / como este miedo de perderte»",
    pregunta: "¿Qué efecto produce en el lector la paradoja que cierra este poema de Octavio Paz?",
    respuesta_modelo:
      "La paradoja propone que el miedo —una emoción negativa asociada a la pérdida— es precisamente lo que hace sentir vivo al hablante. Esto subvierte la idea convencional de que el amor genera plenitud: en Paz, genera ansiedad, y esa ansiedad es la prueba de que se ama. El efecto sobre el lector es de incomodidad reconocible: quien ha amado sabe que el miedo a perder al otro no es una señal de debilidad sino de la intensidad del vínculo. La paradoja lo articula con una precisión que la descripción directa no podría alcanzar. Además, el contraste con los imperativos del principio —«no te muevas, no respires»— añade otra capa: el hablante quiere detener al otro en el tiempo para no tener que tener miedo, pero eso mismo convierte el amor en una forma de posesión paralizante.",
    criterio: "B",
  },
  {
    id: 8,
    fragmento:
      "El aldeano vanidoso aprende en la ciudad los mandatos de la moda, y vuelve dando lástima, a vestirse de ideas y formas que no le caben, a los que no les sientan bien, que le quedan largas por los lados, que suenan al andar.",
    recurso: "Alegoría",
    recurso_en_texto:
      "el aldeano que se viste con ropa ajena = el latinoamericano que copia modelos europeos",
    pregunta:
      "¿Qué efecto produce en el lector la alegoría del «aldeano vanidoso» en Nuestra América de Martí?",
    respuesta_modelo:
      "La alegoría de la ropa que «suena al andar» convierte un argumento político abstracto —la dependencia cultural de América Latina respecto a Europa— en una imagen física concreta y ridícula. El lector puede ver al aldeano con ropa que le queda larga; y ese detalle visual hace más eficaz la crítica que cualquier argumento teórico. Martí no acusa: describe, y al describir provoca vergüenza por identificación. El lector latinoamericano reconoce la imagen y, al hacerlo, acepta el diagnóstico sin necesidad de que se lo impongan. Más profundo aún: si la ropa «suena», el aldeano no puede ocultarse ni a sí mismo su impostura. Martí propone que copiar modelos ajenos no solo es ineficaz sino que expone la falta de identidad propia al escrutinio de todos.",
    criterio: "A",
  },
  {
    id: 9,
    fragmento:
      "Calderos, y las pailas, y las tenazas, y los anafes;\nherramientas del carpintero, del armero, del barbero;\njaulas para pájaros desconocidos, bombas de succión para extraer el agua de las entrañas de la tierra;\nuna balanza de platillos y grabados en relieve de una mujer con los ojos vendados.",
    recurso: "Polisíndeton + enumeración caótica",
    recurso_en_texto:
      "«y… y… y…» acumulando objetos heterogéneos de los gitanos que llegan a Macondo",
    pregunta:
      "¿Qué efecto produce en el lector el polisíndeton y la acumulación de objetos cuando los gitanos llegan a Macondo por primera vez?",
    respuesta_modelo:
      "El polisíndeton —la acumulación de «y»— ralentiza el ritmo y obliga al lector a detenerse en cada objeto antes de pasar al siguiente. Esta ralentización imita el asombro de los habitantes de Macondo: cada objeto nuevo merece ser considerado por separado porque todos son igualmente desconocidos e igualmente maravillosos. La enumeración caótica —desde calderos hasta una balanza de la justicia con los ojos vendados— refuerza que lo que llega no es un inventario ordenado sino una avalancha de modernidad que Macondo no puede clasificar. El polisíndeton hace que el lector experimente ese desbordamiento: la sintaxis no organiza, acumula, igual que el asombro no analiza, recibe.",
    criterio: "B",
  },
  {
    id: 10,
    fragmento:
      "Aquí nada ha cambiado, Hortensia.\nSigo viendo las mismas flores en el mismo jardín.\nSolo tú no estás.\nSolo eso.",
    recurso: "Asíndeton y elipsis",
    recurso_en_texto: "«Solo tú no estás. / Solo eso.» — sin conjunciones, con omisión del verbo",
    pregunta:
      "¿Qué efecto produce en el lector la combinación de asíndeton y elipsis en los dos últimos versos?",
    respuesta_modelo:
      "El asíndeton suprime las conjunciones entre las oraciones finales, creando una secuencia de golpes cortos sin amortiguación gramatical. La elipsis —«Solo eso» omite el verbo— comprime la idea hasta el hueso: el hablante no puede o no quiere desarrollar más. El efecto es de contención emocional extrema: el dolor no se despliega ni se dramatiza, simplemente se anuncia con la brevedad de lo inevitable. El contraste con la descripción del jardín al inicio —que sí tiene verbos y adjetivos— hace que ese final escueto resulte más devastador: el lenguaje se colapsa en el momento preciso en que el hablante más lo necesitaría.",
    criterio: "B",
  },
  {
    id: 11,
    fragmento:
      "¿No ves la herida que tengo\ndesde el pecho a la garganta?\n¡Trescientas rosas morenas\nlleva tu pechera blanca!\nTu sangre rezuma y huele\nalrededor de tu faja.\nPero yo ya no soy yo,\nni mi casa es ya mi casa.",
    recurso: "Interrogación retórica + paradoja",
    recurso_en_texto: "«¿No ves la herida?» y «yo ya no soy yo / ni mi casa es ya mi casa»",
    pregunta:
      "¿Cómo funcionan juntos la interrogación retórica y la paradoja final en este fragmento del Romance sonámbulo de Lorca?",
    respuesta_modelo:
      "La interrogación retórica —«¿No ves la herida?»— no pide una respuesta sino que hace de la herida algo evidente que el interlocutor está ignorando. Esto coloca al lector en posición de testigo de una injusticia visible. La paradoja final —«yo ya no soy yo / ni mi casa es ya mi casa»— amplía la herida física hasta convertirla en una crisis de identidad: el personaje no solo está herido en el cuerpo sino en su sentido de sí mismo y de su pertenencia al mundo. Ambos recursos juntos producen la sensación de que la violencia que el romance describe no es solo física sino ontológica: destruye no solo el cuerpo sino el sujeto.",
    criterio: "B",
  },
];

const EJERCICIOS_EFECTOS_EN: EjercicioEfecto[] = [
  {
    id: 1,
    fragmento:
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness...",
    recurso: "Antithesis",
    recurso_en_texto:
      "«best of times» / «worst of times»; «wisdom» / «foolishness»; «Light» / «Darkness»",
    pregunta:
      "What effect does the chain of antitheses produce on the reader at the opening of A Tale of Two Cities?",
    respuesta_modelo:
      "The antitheses refuse the reader a single moral judgement on the era. By insisting that the same period is simultaneously the best and the worst, the age of wisdom and of foolishness, Dickens turns ordinary historical evaluation into a category error: the French Revolution cannot be filed under one verdict. The grammar enacts the thesis. The parallel pairs also have the economy of an aphorism, so the opening reads as both rhetorical performance and historiographical claim — Dickens making the reader weigh both options at once instead of choosing.",
    criterio: "B",
  },
  {
    id: 2,
    fragmento:
      "Hope is the thing with feathers — / That perches in the soul — / And sings the tune without the words — / And never stops — at all —",
    recurso: "Metaphor",
    recurso_en_texto: "«Hope is the thing with feathers» (= hope figured as a small singing bird)",
    pregunta:
      "What effect does the metaphor of hope as a bird with feathers produce on the reader in this poem by Dickinson?",
    respuesta_modelo:
      "The metaphor transforms an abstraction — hope — into a small, embodied creature that perches, sings, and persists. The effect on the reader is that hope ceases to be a concept and becomes something palpable, almost domestic. Dickinson does not say hope feels like a bird: she names it as a bird, which is the more daring move, because it commits the poem to the conceit and forces the reader to accept the imaginative substitution. The figure also tonally shifts the poem: hope becomes fragile (feathers, song) rather than triumphal, and that fragility — vulnerable but inexhaustible — is precisely what Dickinson wants to defend.",
    criterio: "B",
  },
  {
    id: 3,
    fragmento:
      "I am silver and exact. I have no preconceptions. / Whatever I see I swallow immediately / Just as it is, unmisted by love or dislike.",
    recurso: "Personification",
    recurso_en_texto: "the mirror declares «I am silver and exact», claiming voice and judgement",
    pregunta:
      "What effect does it produce on the reader that Plath gives the mirror a first-person voice that claims objectivity?",
    respuesta_modelo:
      "By granting the mirror a voice that asserts its own neutrality, Plath inverts the usual hierarchy: it is no longer the woman who looks at the mirror but the mirror that judges her. The personification is unsettling because the mirror's claim to be «unmisted by love or dislike» is precisely what makes its verdict cruellest — it pretends to deliver pure fact. The reader recognizes in the device a familiar internal voice: the mirror is the woman's own self-scrutiny made external. The personification thus dramatizes a psychological mechanism — measuring oneself by an «exact» standard — and exposes its violence by attributing it to an object.",
    criterio: "B",
  },
  {
    id: 4,
    fragmento:
      "Pied Beauty: Glory be to God for dappled things — / [...] / All things counter, original, spare, strange; / Whatever is fickle, freckled (who knows how?) / With swift, slow; sweet, sour; adazzle, dim...",
    recurso: "Polysemic symbol (dappling)",
    recurso_en_texto:
      "«dappled», «pied», «freckled» — variegation as a sign that holds multiple meanings",
    pregunta:
      "What effect does the accumulation of variegated imagery produce on the reader in Hopkins's «Pied Beauty»?",
    respuesta_modelo:
      "Hopkins's «dappling» is not a descriptive surface but a symbol that accumulates theological meaning: it figures God's signature in the visible world. The poem refuses to settle into one register — the variegation is at once botanical (couple-coloured skies, rose-moles), occupational (gear, tackle, trim), and metaphysical (counter, original, spare, strange). The polysemy produces a vertiginous sensation in the reader: each instance of dappling re-points the reader to a different domain while keeping the underlying claim — that variegation is sacred — intact. The reader feels the doctrine before parsing it, which is the experiential argument Hopkins wants to lodge.",
    criterio: "B",
  },
  {
    id: 5,
    fragmento:
      "I am the poet of the Body and I am the poet of the Soul, / [...] / I am he attesting sympathy, / [...] / I am of old and young, of the foolish as much as the wise, / Regardless of others, ever regardful of others...",
    recurso: "Anaphora + chaotic enumeration",
    recurso_en_texto: "«I am…» repeated before an accumulation of incompatible identities",
    pregunta:
      "What effect does the anaphora of «I am», combined with an apparently inexhaustible enumeration, produce on the reader at the climax of Whitman's Song of Myself?",
    respuesta_modelo:
      "The anaphora of «I am» does not consolidate a single identity: it dissolves the bounded self into a multiplicity it claims to contain. The grammatical «I» neither selects nor excludes — it accumulates. The chaotic enumeration — body, soul, old, young, foolish, wise — has no hierarchical order because Whitman's «I» does not rank its contents: it absorbs them. The effect on the reader is mounting expansiveness: the catalogue seems unable to end, just as the democratic «we» Whitman is enacting cannot rationally end. Whitman makes a single grammatical subject perform what political oratory cannot: a community without exclusion.",
    criterio: "B",
  },
  {
    id: 6,
    fragmento:
      "He was an old man who fished alone in a skiff in the Gulf Stream and he had gone eighty-four days now without taking a fish.",
    recurso: "Irony",
    recurso_en_texto:
      "the dignified introduction («he was an old man») followed by the pitiless count of days without a catch",
    pregunta:
      "What effect does the irony of the opening sentence produce on the reader in Hemingway's The Old Man and the Sea?",
    respuesta_modelo:
      "Hemingway introduces Santiago with the syntactic gravity of an epic naming — «He was an old man who fished alone» — and then deflates that gravity with the ledger of «eighty-four days now without taking a fish». The irony lies in the mismatch: the form promises heroism, the content delivers failure. Yet Hemingway does not mock; the irony cuts the other way. By measuring the old man's life in days without fish, the sentence quietly indicts a world that recognizes only success. The reader is positioned to see the dignity the world refuses, and that double vision — failure as the world counts it, dignity as the prose insists — is the moral architecture of the novel.",
    criterio: "B",
  },
  {
    id: 7,
    fragmento:
      "Death, be not proud, though some have called thee / Mighty and dreadful, for thou art not so; / [...] / One short sleep past, we wake eternally, / And death shall be no more; Death, thou shalt die.",
    recurso: "Paradox",
    recurso_en_texto: "«Death, thou shalt die» — death made mortal, and the mortal made deathless",
    pregunta: "What effect does the closing paradox produce on the reader in Donne's Holy Sonnet?",
    respuesta_modelo:
      "The paradox proposes that death itself can die — a logical impossibility that the sonnet is built to make believable. By the time the line arrives, Donne has stripped death of its powers one by one (it is no rest, no escape, no master), so the contradiction lands as the consequence of the argument rather than its premise. The effect on the reader is a kind of triumphant vertigo: the sentence states what reason rejects, but the rhetorical apparatus that produced it has already disarmed reason's objections. The paradox does what direct affirmation cannot — it makes the reader feel that mortality is the smaller of the two facts.",
    criterio: "B",
  },
  {
    id: 8,
    fragmento:
      "All the world's a stage, / And all the men and women merely players; / They have their exits and their entrances; / And one man in his time plays many parts, / His acts being seven ages.",
    recurso: "Allegory",
    recurso_en_texto: "the world as a stage; human lives as roles within a play of seven ages",
    pregunta:
      "What effect does the allegory of the world as a stage produce on the reader in Jaques's speech in As You Like It?",
    respuesta_modelo:
      "The allegory turns an abstract claim — that human life is a sequence of conventional roles — into a concrete and visualizable theatrical apparatus. Once the world is a stage, every action becomes a performance, and the reader is invited to view biographical events (birth, schooling, love, soldiering, age) as scripted parts rather than free choices. The effect is to reframe the audience's own life within the metaphor: in watching the play, they become aware of being players in another. The allegory is more effective than direct philosophical assertion because it positions the reader inside the argument they are being asked to consider.",
    criterio: "A",
  },
  {
    id: 9,
    fragmento:
      "And we are here as on a darkling plain / Swept with confused alarms of struggle and flight, / Where ignorant armies clash by night.",
    recurso: "Polysyndeton + chaotic enumeration",
    recurso_en_texto:
      "«struggle and flight», «alarms of struggle and flight», «ignorant armies clash by night» — accumulating instabilities",
    pregunta:
      "What effect do the polysyndeton and the accumulation of disorder produce on the reader at the close of Arnold's «Dover Beach»?",
    respuesta_modelo:
      "The piling up of conjunctions and parallel nouns — alarms, struggle, flight, armies — slows the rhythm and forces the reader to absorb each term separately, even though they belong to the same dispiriting picture. The polysyndeton imitates the dispersion of meaning the poem laments: the speaker, having lost the «Sea of Faith», cannot organize the world into a hierarchy, so syntax acquires the same flatness. The effect on the reader is that of a darkness the grammar cannot relieve: the conjunctions promise continuity but deliver only more disorder, and the enumeration ends not with a verdict but with the night still going.",
    criterio: "B",
  },
  {
    id: 10,
    fragmento: "For sale: baby shoes, never worn.",
    recurso: "Asyndeton and ellipsis",
    recurso_en_texto:
      "«baby shoes, never worn» — no conjunctions, no narrative frame, the entire grief omitted",
    pregunta:
      "What effect does the combination of asyndeton and ellipsis produce on the reader in this six-word story attributed to Hemingway?",
    respuesta_modelo:
      "Asyndeton suppresses every connective; ellipsis omits the entire narrative — who, when, why. What remains is a classified advertisement, a public form, into which a private catastrophe has been inserted without commentary. The effect on the reader is precisely the effect of grief: the language collapses to commercial brevity at the moment when it should be most expansive. Restraint becomes devastation. The reader is forced to supply the story the sentence refuses to tell, and that act of supplying is the experience the piece exists to produce.",
    criterio: "B",
  },
  {
    id: 11,
    fragmento:
      "What happens to a dream deferred? / Does it dry up / like a raisin in the sun? / Or fester like a sore — / And then run? / [...] / Or does it explode?",
    recurso: "Rhetorical question + paradox",
    recurso_en_texto: "the cascade of questions, ending with «Or does it explode?»",
    pregunta:
      "How do the rhetorical questions and the final paradox work together in Hughes's «Harlem»?",
    respuesta_modelo:
      "Hughes's questions do not seek information: they perform an indictment. By offering the reader a series of decaying images — drying raisin, festering sore, rotten meat, sagging load — the poem appears to consider every passive fate of a deferred dream. The final question subverts that pattern with a paradox: a dream that has been postponed, suppressed, denied — what should be the smallest of fates — is suddenly capable of explosion. The contradiction is political: the deferral that looked like decay produces force. The reader, having been led through the catalogue of inaction, is forced to revise the entire premise of the poem at the final line.",
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
      "En el poema, Neruda repite el verso «Puedo escribir los versos más tristes esta noche» varias veces. El verso aparece al principio y regresa en distintos momentos del poema.",
    nivel_objetivo: "análisis",
    contexto:
      "Poema XX de Neruda. Recurso: anáfora como leitmotiv estructural. Pregunta IB: ¿Cómo construye Neruda la ambivalencia emocional entre el amor y la pérdida?",
    respuesta_modelo:
      "La repetición anafórica del verso inicial —«Puedo escribir los versos más tristes esta noche»— no es redundancia sino estrategia estructural: cada vez que regresa, el hablante ha avanzado un paso en su vaivén emocional entre el amor y el desamor. La anáfora mimetiza en la forma el proceso psicológico del poema: el hablante vuelve una y otra vez al mismo punto de partida, incapaz de abandonar el recuerdo, igual que el olvido que todavía no llega.",
    criterio: "B",
  },
  {
    id: 2,
    descripcion_original:
      "García Márquez describe la llegada de los gitanos a Macondo. Melquíades trae un imán grande que arrastra los objetos de metal. José Arcadio Buendía no entiende cómo funciona y cree que es magia.",
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
      "Bécquer dice que las golondrinas volverán al balcón. Luego dice que las golondrinas que estuvieron antes, las que aprendieron los nombres de los amantes, esas no volverán.",
    nivel_objetivo: "análisis",
    contexto:
      "Rima LIII de Bécquer. Estructura antitética: lo que vuelve vs. lo irrepetible. Pregunta IB: ¿Cómo estructura Bécquer la idea de la irreversibilidad del amor?",
    respuesta_modelo:
      "La distinción que Bécquer establece entre las golondrinas genéricas —que regresan porque son intercambiables, parte del ciclo natural— y «aquellas» golondrinas específicas —las que «aprendieron nuestros nombres»— es el argumento central de la rima. El demostrativo «aquellas» frente al artículo genérico «las» marca la diferencia entre lo universal y lo particular. Bécquer propone que lo que hace irrepetible al amor no es el sentimiento abstracto sino la experiencia concreta y compartida, que por definición no puede repetirse.",
    criterio: "B",
  },
  {
    id: 4,
    descripcion_original:
      "Lorca repite la palabra «verde» muchas veces en el Romance sonámbulo. Aparece en el primer verso y sigue apareciendo a lo largo del poema en distintos contextos.",
    nivel_objetivo: "análisis",
    contexto:
      "Romance sonámbulo de García Lorca (Romancero gitano, 1928). Recurso: anáfora y símbolo. Pregunta IB: ¿Cómo construye Lorca el mundo onírico del Romance sonámbulo?",
    respuesta_modelo:
      "La obsesiva repetición de «verde» no es decorativa sino estructural: Lorca convierte el color en un leitmotiv que atraviesa todo el poema acumulando significados sin agotarse en ninguno. «Verde que te quiero verde» no describe un color real sino que lo invoca como objeto de deseo, de modo que el verde deja de pertenecer al campo semántico del color para pasar al del anhelo. Cada reaparición añade una capa: naturaleza, deseo erótico, muerte, magia. La anáfora convierte «verde» en el eje emocional del poema, y el lector lo siente antes de descifrarlo racionalmente.",
    criterio: "B",
  },
  {
    id: 5,
    descripcion_original:
      "En el cuento, la casa se va siendo ocupada poco a poco. Los personajes no pueden entrar en las habitaciones tomadas. Al final los ruidos llegan a la otra parte y tienen que salir completamente y tirar la llave.",
    nivel_objetivo: "interpretación",
    contexto:
      "«Casa tomada» de Julio Cortázar (1946). Recurso: gradación espacial de la toma. Pregunta IB: ¿Qué representa la «toma» de la casa y qué revela sobre los protagonistas?",
    respuesta_modelo:
      "Lo revelador no es que la casa sea tomada sino que los protagonistas no intenten resistir ni comprender. Cada avance del invasor produce una sola respuesta: ceder terreno y continuar la rutina en el espacio restante. Cortázar construye una gradación del espacio que es también una gradación de la rendición psicológica. La casa no les es arrebatada: ellos la entregan pieza por pieza, como si llevaran tiempo buscando el pretexto para hacerlo. El invasor —nunca descrito ni nombrado— externaliza una renuncia que ya existía antes de que llegara.",
    criterio: "A",
  },
  {
    id: 6,
    descripcion_original:
      "Neruda dice en el Poema XX que la noche es inmensa. Después dice que la noche es más inmensa sin ella.",
    nivel_objetivo: "análisis",
    contexto:
      "Poema XX de Pablo Neruda. Recurso: gradación y elipsis. Pregunta IB: ¿Cómo expresa Neruda la experiencia de la ausencia?",
    respuesta_modelo:
      "La comparación «más inmensa sin ella» no describe la noche sino al hablante: no es que la noche haya crecido, sino que el hablante se ha hecho más pequeño al quedar sin ella. La elipsis del sujeto en los infinitivos anteriores —Pensar, Sentir, Oír— ya disuelve el yo; ahora la gradación —noche inmensa, noche aún más inmensa— completa esa disolución. El efecto es que la ausencia no se describe como un vacío sino como un exceso: el mundo no desaparece con el amor perdido, sino que se agranda hasta resultar insoportable.",
    criterio: "B",
  },
  {
    id: 7,
    descripcion_original:
      "Galeano dice que América Latina es pobre porque la han explotado durante siglos. También dice que los países ricos se han beneficiado de esa pobreza y siguen haciéndolo.",
    nivel_objetivo: "interpretación",
    contexto:
      "Las venas abiertas de América Latina de Eduardo Galeano (1971). Recurso: metáfora estructural del título. Pregunta IB: ¿Cómo construye Galeano su argumento sobre el subdesarrollo latinoamericano?",
    respuesta_modelo:
      "La metáfora del título —«las venas abiertas»— no ilustra el argumento: lo es. Presentar América Latina como un cuerpo desangrado convierte la historia económica en una herida física, y esa conversión tiene consecuencias ideológicas: si hay sangre, hay una herida; si hay una herida, hay alguien que la causó; si hay un causante, hay responsabilidad. Galeano no habla de «subdesarrollo» —término que implica un retraso natural— sino de extracción activa. La metáfora corporal hace que la lectura del imperialismo como accidente o evolución natural resulte imposible de sostener.",
    criterio: "A",
  },
  {
    id: 8,
    descripcion_original:
      "En Nuestra América, Martí habla de un aldeano que va a la ciudad y vuelve con ropa que no le queda bien. La ropa le queda grande y hace ruido cuando camina.",
    nivel_objetivo: "interpretación",
    contexto:
      "«Nuestra América» de José Martí (1891). Recurso: alegoría del aldeano vestido con ropa ajena. Pregunta IB: ¿Cómo critica Martí la dependencia cultural de América Latina respecto a Europa?",
    respuesta_modelo:
      "La alegoría de la ropa que «suena al andar» convierte un argumento político abstracto en una imagen física ridícula y reconocible. Martí no argumenta que los modelos europeos sean inapropiados: los hace vestir a un aldeano, y la imagen visual hace el argumento por él. El lector latinoamericano que reconoce la escena ha aceptado el diagnóstico antes de formularlo racionalmente. Más profundo aún: si la ropa «suena», el aldeano no puede ocultarse ni a sí mismo su impostura. Copiar modelos ajenos no solo es ineficaz sino que expone la falta de identidad propia al escrutinio de todos.",
    criterio: "A",
  },
  {
    id: 9,
    descripcion_original:
      "En el Romance sonámbulo, una mujer está en una baranda mirando el mar. El marinero sube la montaña hacia ella. Al final la mujer está muerta flotando en el agua.",
    nivel_objetivo: "análisis",
    contexto:
      "Romance sonámbulo de García Lorca. Recurso: símbolo del agua. Pregunta IB: ¿Cómo funciona el símbolo del agua en el Romance sonámbulo?",
    respuesta_modelo:
      "El agua en el Romance sonámbulo no es un elemento decorativo sino el espacio donde deseo y muerte convergen. La mujer comienza suspendida entre el mar (abajo) y la luna (arriba), en una baranda que es literalmente un umbral entre dos mundos. Que acabe «oscilando en el agua» no es un final narrativo sino el cumplimiento de una lógica simbólica: el deseo que ella representa —verde, lunar, acuático— solo puede realizarse en la muerte. Lorca no cuenta una historia de amor frustrado; construye un sistema simbólico en el que la vida y la muerte son los dos polos entre los que vibra el deseo.",
    criterio: "B",
  },
  {
    id: 10,
    descripcion_original:
      "Santa Teresa escribe que vive sin vivir en sí y que muere porque no muere. La voz del poema desea una vida más alta que la vida terrenal.",
    nivel_objetivo: "interpretación",
    contexto:
      "«Vivo sin vivir en mí» de Santa Teresa de Jesús. Recurso: paradoja. Pregunta IB: ¿Cómo expresa el poema la tensión entre vida terrenal y deseo espiritual?",
    respuesta_modelo:
      "La paradoja «vivo sin vivir en mí» no es un adorno conceptual: formula una experiencia espiritual en la que la vida terrenal se siente incompleta frente a una vida trascendente. La contradicción obliga al lector a aceptar dos verdades a la vez: la voz poética está viva, pero no reconoce esa vida como plena. El verso «muero porque no muero» intensifica la tensión: la muerte deja de ser final y se vuelve deseo de unión con lo absoluto.",
    criterio: "A",
  },
  {
    id: 11,
    descripcion_original:
      "En el Poema XX, Neruda dice que ella lo quería a veces y que a veces él también la quería. Dice que los dos se amaban pero que el amor ya terminó y que ahora intenta olvidarla.",
    nivel_objetivo: "análisis",
    contexto:
      "Poema XX de Pablo Neruda. Recurso: vaivén temporal entre el pasado y el presente. Pregunta IB: ¿Cómo construye Neruda la ambivalencia entre el amor pasado y la aceptación del olvido?",
    respuesta_modelo:
      "Neruda no describe el amor como un estado estable sino como un vaivén: «a veces» ella lo quería, «a veces» él la quería, y esa intermitencia retroactiva cuestiona la certeza del amor que se lamenta perder. Los verbos en imperfecto —quería, amaba— describen un pasado que ya era inestable, lo que introduce una paradoja integrada en el duelo: ¿se puede llorar la pérdida de algo que nunca fue sólido? La respuesta de Neruda parece ser que sí, y que eso es precisamente lo que hace el olvido tan «largo»: no es proporcional a la certeza del amor sino a su intensidad, por discontinua que fuera.",
    criterio: "B",
  },
  {
    id: 12,
    descripcion_original:
      "Paz en el poema le pide a la persona amada que no se mueva, que no respire, que no quiera nada. Al final dice que el miedo de perderla es lo que más lo ata a la vida.",
    nivel_objetivo: "interpretación",
    contexto:
      "Poema de Octavio Paz. Recurso: paradoja y apóstrofe. Pregunta IB: ¿Cómo redefine Paz la naturaleza del amor?",
    respuesta_modelo:
      "La secuencia de imperativos negativos —«no te muevas, no respires, no quieras»— convierte al ser amado en algo frágil hasta el límite de lo irreal: si no debe moverse ni respirar, es casi un objeto, una visión que el hablante quiere inmovilizar en el tiempo. Pero la paradoja final invierte toda la dinámica: lo que ata al hablante a la vida no es la presencia del ser amado sino el miedo a perderla. Paz redefine el amor como una forma de ansiedad existencial: el otro no es fuente de plenitud sino de vulnerabilidad, y esa vulnerabilidad —ese miedo— es lo que hace sentir vivo. El apóstrofe directo convierte al lector en cómplice de una intimidad que en el fondo es terror.",
    criterio: "A",
  },
  {
    id: 13,
    descripcion_original:
      "En Cien años de soledad, José Arcadio Buendía lleva a su familia y a sus amigos a través de la selva buscando el mar. Caminan muchos días sin encontrarlo y finalmente fundan el pueblo de Macondo en ese lugar.",
    nivel_objetivo: "análisis",
    contexto:
      "Cien años de soledad, capítulo inicial. El viaje fundacional de Macondo. Pregunta IB: ¿Cómo construye García Márquez la épica fundacional de Macondo?",
    respuesta_modelo:
      "El viaje hacia el mar sin llegar a él es la primera acción de José Arcadio Buendía como fundador, y ya contiene la paradoja que definirá a todos los Buendía: la energía desmesurada para el proyecto, combinada con la incapacidad de completarlo. Pero García Márquez no lo presenta como un fracaso sino como una epopeya: el vocabulario —«arrastró», «expedición»— es el de las gestas heroicas. El efecto es una épica irónica: los lectores latinoamericanos reconocemos la estructura del descubrimiento y la conquista, pero invertida: esta vez los exploradores son los mismos que serán conquistados, y su mar permanece siempre al otro lado.",
    criterio: "A",
  },
  {
    id: 14,
    descripcion_original:
      "Bécquer en la rima número 11 dice que hoy la tierra y los cielos le sonríen, que hoy el sol llega al fondo de su alma, que hoy la vio y que ella le miró. Termina diciendo que hoy cree en Dios.",
    nivel_objetivo: "análisis",
    contexto:
      "Rima XI de Gustavo Adolfo Bécquer. Recurso: gradación ascendente con anáfora de «hoy». Pregunta IB: ¿Cómo construye Bécquer la experiencia del amor como revelación?",
    respuesta_modelo:
      "La anáfora de «hoy» organiza la estrofa en cuatro escalones que forman una gradación ascendente: la naturaleza exterior (tierra y cielos), el interior del alma (el sol), el encuentro visual concreto (la he visto), y la consecuencia teológica (creo en Dios). Esta estructura convierte el poema en un argumento: el amor no se añade a la lista de experiencias bellas, sino que las genera a todas y las corona con la fe. Al afirmar «creo en Dios» después de «la he visto», Bécquer propone que la experiencia amorosa es la forma más directa de la revelación —la fe llega por los ojos, no por la doctrina—, lo que es una posición filosófica característica del Romanticismo.",
    criterio: "B",
  },
  {
    id: 15,
    descripcion_original:
      "Martí dice que hay dos tipos de hombres: los que aman a la patria de verdad y los que la traicionan. Los que la traicionan lo hacen por ignorancia o por interés. Los que la aman deben gobernarla.",
    nivel_objetivo: "interpretación",
    contexto:
      "«Nuestra América» de José Martí (1891). Recurso: antítesis como estructura argumentativa. Pregunta IB: ¿Cómo construye Martí su propuesta política en Nuestra América?",
    respuesta_modelo:
      "La antítesis entre el hombre que conoce América Latina desde adentro y el que la gobierna con categorías importadas de Europa no es solo retórica: es el argumento político central del ensayo. Martí propone que el error no es moral sino epistemológico: gobernar con «ideas ajenas» produce el mismo resultado que vestirse con ropa que no cabe —hacer el ridículo sin saberlo, o sabiéndolo sin poder evitarlo. La antítesis le permite a Martí formular su propuesta positiva: si el problema es conocer mal, la solución es conocer bien, desde dentro, desde la experiencia americana. No es una llamada a la revolución sino a la epistemología.",
    criterio: "A",
  },
];

const EJERCICIOS_REESCRITURA_EN: EjercicioReescritura[] = [
  {
    id: 1,
    descripcion_original:
      "In the poem, Poe repeats the word «Nevermore» many times. The raven says «Nevermore» as the answer to several different questions throughout the poem.",
    nivel_objetivo: "análisis",
    contexto:
      "Poe's «The Raven». Device: refrain as structural leitmotif. IB question: How does Poe construct the speaker's psychological descent through repetition?",
    respuesta_modelo:
      "The refrain «Nevermore» is not redundancy but the structural engine of the poem: each return appears in answer to a more specific and self-wounding question, until what began as a bird's mechanical word becomes a verdict on the speaker's inner life. The repetition mimics in form the obsessive process the poem dramatizes — the mourner returns again and again to the same word, knowing the answer he will receive, and each return tightens the grief he was supposedly seeking to relieve. Poe makes the lyric structure perform the trap that mourning becomes when it refuses consolation.",
    criterio: "B",
  },
  {
    id: 2,
    descripcion_original:
      "Joyce describes the snow falling at the end of the story. The snow falls all over Ireland, on the living and on the dead. Gabriel watches it and thinks about his life.",
    nivel_objetivo: "interpretación",
    contexto:
      "Closing of Joyce's «The Dead» (Dubliners). The snow as the final image. IB question: How does Joyce construct the metaphysical reach of the story's ending?",
    respuesta_modelo:
      "The snow is not weather: it inaugurates the moment in which Gabriel's individual epiphany expands into a collective vision. By falling «upon all the living and the dead» without distinction, the snow performs the equality the story has been moving toward — between Gabriel and Michael Furey, between the alive and those they have not yet released. The image is more than a metaphor for mortality: it is the mechanism by which the story stops being about Gabriel's marriage and becomes about every Irish life under the same sky. Joyce's refusal to distinguish living from dead in the final cadence is the formal claim that the dead have weight enough to share the same falling.",
    criterio: "A",
  },
  {
    id: 3,
    descripcion_original:
      "Frost says that the woods are nice and dark. Then he says that he has promises to keep and many miles to go before he can sleep.",
    nivel_objetivo: "análisis",
    contexto:
      "Frost's «Stopping by Woods on a Snowy Evening». Antithetical structure: the temptation of the woods vs. the obligations of life. IB question: How does Frost structure the tension between rest and duty?",
    respuesta_modelo:
      "The tension Frost establishes between the woods — «lovely, dark and deep» — and the social obligations the speaker invokes is the central architecture of the poem. The woods offer the seductive possibility of stopping, of yielding to a beauty that is also, in its darkness, a euphemism for ceasing. Against this, the speaker mobilizes «promises to keep», the social grammar of duty, repeated in the final couplet so as to insist on what the woods would have him forget. The repetition is not decorative: by saying «and miles to go before I sleep» twice, Frost shows that duty is something the speaker must talk himself into, not something that comes naturally. The antithesis between rest and obligation is the moral interior of the poem.",
    criterio: "B",
  },
  {
    id: 4,
    descripcion_original:
      "Eliot in «The Love Song of J. Alfred Prufrock» repeats the line «In the room the women come and go / Talking of Michelangelo». It appears twice in the poem at different moments.",
    nivel_objetivo: "análisis",
    contexto:
      "T. S. Eliot's «The Love Song of J. Alfred Prufrock» (1915). Device: refrain and ironic deflation. IB question: How does Eliot construct Prufrock's social paralysis?",
    respuesta_modelo:
      "The repeated couplet — «In the room the women come and go / Talking of Michelangelo» — is not ornamental but diagnostic: Eliot uses it to register the social texture Prufrock cannot enter. The refrain hovers in a register of cultivated triviality, where great art is the small change of conversation, and that gap between Renaissance achievement and afternoon chatter is the comic key of the poem. The fact that the lines return without development matches Prufrock's own failure to develop: he circles the same room, the same observation, the same paralysis. The refrain is the formal proof that nothing happens, which is precisely the action of the poem.",
    criterio: "B",
  },
  {
    id: 5,
    descripcion_original:
      "In the play, Willy Loman cannot accept that he is failing. He keeps telling stories about how successful he was and how successful Biff will be. At the end he kills himself.",
    nivel_objetivo: "interpretación",
    contexto:
      "Arthur Miller's Death of a Salesman (1949). Device: the tragic structure of self-deception. IB question: What does Willy Loman's collapse represent and what does it reveal about American mythology?",
    respuesta_modelo:
      "What is revealing is not that Willy fails but that he cannot let failure exist as a fact about him. Each evasion takes the same form: the present is denied by an enlarged memory of the past. Miller builds an architecture of self-deception that is also a gradation of disintegration — every retreat into illusion costs the family more, until the only ground Willy can claim is the ground of his own death. The play's tragedy is not the suicide but the system that made the suicide intelligible to Willy as a transaction: the insurance money as the proof of worth he could not earn while alive. The salesman becomes the commodity. American mythologies of self-making are not background to the tragedy: they are the engine of it.",
    criterio: "A",
  },
  {
    id: 6,
    descripcion_original:
      "Plath says in the poem «Mirror» that she shows the woman exactly as she is. Then she says that the woman has drowned a young girl in her and that an old woman rises toward her every day.",
    nivel_objetivo: "análisis",
    contexto:
      "Sylvia Plath's «Mirror». Device: gradation and metaphoric substitution. IB question: How does Plath express the experience of ageing?",
    respuesta_modelo:
      "The metaphor of the drowned girl and the rising old woman does not describe ageing as a continuous process but as a confrontation between two distinct selves looking back from the same surface. The mirror is not an instrument but the witness: the woman comes to it, and what it reflects is no longer one face but a sequence — the young girl already lost, the old woman not yet accepted. The verb «drowned» turns the disappearance of youth into a violence the woman has herself committed by aging, and the old woman who «rises» «like a terrible fish» introduces the inevitability the woman would prefer to refuse. The effect is that aging is not described as a temporal fact but as an encounter with two selves the mirror will not let her unsee.",
    criterio: "B",
  },
  {
    id: 7,
    descripcion_original:
      "Achebe says that European writers and missionaries described Africa as having no history before they arrived. He says this is false and that ignoring African civilization was useful for justifying colonization.",
    nivel_objetivo: "interpretación",
    contexto:
      "Chinua Achebe, Things Fall Apart and his essays. Device: the structural metaphor of «things falling apart» (from Yeats). IB question: How does Achebe construct his argument about the violence of colonial narrative?",
    respuesta_modelo:
      "The borrowed image of «things falling apart» is not decorative: it is the argument. By framing the arrival of colonialism as a structural collapse rather than an addition, Achebe inverts the colonial story in which Europe brings order to chaos. In the novel, what falls apart is not African society in itself but African society under the pressure of a narrative that refuses to recognize it as a society. The phrase has consequences: if there is collapse, there was something whole; if there was something whole, the language of «discovery» is a lie. Achebe does not refute colonial narrative argument by argument; he reframes it through a single structural metaphor that makes the colonial premise — that Africa had no centre to lose — impossible to keep believing.",
    criterio: "A",
  },
  {
    id: 8,
    descripcion_original:
      "In Animal Farm, Orwell writes a story about animals who take over a farm. The pigs become the leaders and start to behave like the humans they replaced.",
    nivel_objetivo: "interpretación",
    contexto:
      "George Orwell's Animal Farm (1945). Device: sustained allegory. IB question: How does Orwell critique the betrayal of revolutionary ideals?",
    respuesta_modelo:
      "The allegorical machinery — animals running a farm — turns abstract political analysis into a concrete narrative the reader can hold visually. Orwell does not argue that revolutionary leadership tends to reproduce what it overthrew: he stages it. By the time the pigs walk on two legs and the original commandments have been quietly rewritten, the reader has already lived through the betrayal moment by moment, so the political thesis arrives as recognition rather than argument. The animal frame also strips away the ideological vocabulary that would let readers identify too quickly with one side; the reader judges the pigs on what they do, not on the slogans they speak. Allegory here is not illustration of an argument but the only form in which the argument could land without partisan resistance.",
    criterio: "A",
  },
  {
    id: 9,
    descripcion_original:
      "In «The Lady of Shalott», a woman lives in a tower watching the world only through a mirror. When she finally looks directly out the window she dies floating down the river to Camelot.",
    nivel_objetivo: "análisis",
    contexto:
      "Tennyson's «The Lady of Shalott». Device: symbol of the mirror and the river. IB question: How do the symbols of mirror and river function in Tennyson's ballad?",
    respuesta_modelo:
      "The mirror is not a domestic object: it is the condition of the Lady's safety, the structure that allows her to participate in the world only at the cost of never participating directly. The river is its complement — the only direct passage to Camelot, but a passage that cannot be taken alive. Tennyson does not pose the Lady's choice as a love story; he constructs a symbolic system in which the price of looking is dying. The artist who sees the world only through reflections (the mirror) and the artist who renounces mediation (the river) are the same figure at two different moments. The poem's tragedy is not that the Lady chooses Lancelot but that no third option exists: the mirror and the river divide the world between safe unreality and lethal reality.",
    criterio: "B",
  },
  {
    id: 10,
    descripcion_original:
      "In «Ozymandias», Shelley describes a broken statue in the desert. The statue's pedestal has an inscription saying the king was great and his works should be admired. But there is nothing left around it, only sand.",
    nivel_objetivo: "interpretación",
    contexto:
      "Percy Bysshe Shelley's «Ozymandias» (1818). Device: dramatic irony. IB question: What does Shelley propose about power, time, and language?",
    respuesta_modelo:
      "The poem's irony is not a flourish but its argument: the inscription «Look on my Works, ye Mighty, and despair!» was meant as a boast and survives as its refutation. Shelley arranges the layers of mediation — a traveller telling the speaker who tells the reader — so that no living voice carries Ozymandias's authority; only the stone does, and the stone is broken. The desert that was the proof of conquest has become the proof of erasure. The poem does not predict that empires will fall; it stages an empire that has already fallen and discovers that the king's own boast supplies the elegy. Language survives the speaker only to incriminate him, which is the deepest claim of the sonnet: words outlast power, but they do not preserve what power claimed about itself.",
    criterio: "A",
  },
  {
    id: 11,
    descripcion_original:
      "In «The Road Not Taken», Frost writes about a traveller choosing between two roads in a forest. He picks one and says it has made all the difference. The poem is often read as being about being independent.",
    nivel_objetivo: "análisis",
    contexto:
      "Robert Frost's «The Road Not Taken» (1916). Device: retrospective irony. IB question: How does Frost construct the ambivalence of the speaker's narrative of choice?",
    respuesta_modelo:
      "Frost does not present the speaker as confidently independent: he presents a speaker who, in mid-poem, observes that the two roads are «really about the same», and only later — «ages and ages hence» — will assemble the story in which one was «less travelled by». The verb tense is the device: the narrative of bold choice is a story the speaker plans to tell, not one the moment of choice supports. The repeated «I» before the dash («I — / I took the one less travelled by») registers the rehearsal. Frost is not celebrating independence; he is showing that the meaning we give choices is largely retroactive, a literary act we perform on a past that was, at the time, much less decisive than we will later need it to have been.",
    criterio: "B",
  },
  {
    id: 12,
    descripcion_original:
      "In Beckett's Waiting for Godot, two men wait for someone called Godot. He never comes. They keep saying they will leave but they do not move.",
    nivel_objetivo: "interpretación",
    contexto:
      "Samuel Beckett's Waiting for Godot (1953). Device: dramatic stasis and the failure of action. IB question: How does Beckett redefine the nature of dramatic action?",
    respuesta_modelo:
      "The play's central device is the gap between speech and action: «Let's go» — They do not move. Beckett uses the stage direction as a counter-argument to the dialogue, and the cumulative effect of these contradictions is to dismantle the inherited assumption that dramatic speech leads anywhere. Vladimir and Estragon do not fail at action because they are weak; the play stages a world in which speech has been severed from its capacity to produce events. The wait for Godot is therefore not a metaphor for one absent figure but for the entire structure that would let waiting end. By the second act, repetition has ceased to be funny and become structural: nothing has happened, twice. The reader/spectator is forced to find meaning in stasis itself, which is the formal innovation Beckett's theatre demands.",
    criterio: "A",
  },
  {
    id: 13,
    descripcion_original:
      "In Mrs Dalloway, Woolf shows Clarissa Dalloway preparing a party in London. The narration moves in and out of different characters' minds throughout a single day.",
    nivel_objetivo: "análisis",
    contexto:
      "Virginia Woolf's Mrs Dalloway (1925), opening pages. Device: free indirect style and the modernist single day. IB question: How does Woolf construct the texture of consciousness?",
    respuesta_modelo:
      "The novel's first action — Clarissa saying she will buy the flowers herself — is reported in a sentence that has already begun to modulate into Clarissa's own diction. Woolf does not narrate Clarissa's thoughts from outside: she allows her syntax to become Clarissa's syntax, then slides into another character's mind without warning. This free indirect style is not a stylistic choice but an ontological one: it claims that consciousness is not bounded by the individual head, that the same London morning is being thought by many people simultaneously. The single day of the novel is not a frame but a method: Woolf compresses time so that the simultaneity of inner lives becomes audible. The reader does not observe the characters thinking; the reader is moved between the thinking, and that mobility is the modernist claim about what a person actually is.",
    criterio: "A",
  },
  {
    id: 14,
    descripcion_original:
      "Hopkins in «Pied Beauty» says glory be to God for things that are dappled. He lists many examples like skies, fish, chestnuts, and tools. He ends saying that God created all these contrary things.",
    nivel_objetivo: "análisis",
    contexto:
      "Gerard Manley Hopkins, «Pied Beauty». Device: enumeration with theological climax. IB question: How does Hopkins construct the experience of devotion as perception?",
    respuesta_modelo:
      "The enumeration organizes the poem into a series of variegated particulars — couple-coloured skies, rose-moles upon trout, chestnut-falls, finches' wings, tools of trade — and the climax arrives only when these have been allowed to accumulate without comment. By delaying the theological clause «He fathers-forth», Hopkins makes the poem an act of perception rather than an argument: the reader sees first, attributes second. This structure inverts conventional devotional poetry, which would name the divine and then find evidence. Here the evidence trains the eye until the conclusion is already implicit. The form proposes that piety is, properly, a discipline of looking, and the doctrine — that variegation is sacred — is what looking, sufficiently practised, recognizes.",
    criterio: "B",
  },
  {
    id: 15,
    descripcion_original:
      "Orwell in 1984 says there are two kinds of people: those who serve the Party and those who think for themselves. Those who think for themselves are punished. Those who serve the Party survive.",
    nivel_objetivo: "interpretación",
    contexto:
      "George Orwell's Nineteen Eighty-Four (1949). Device: antithesis as ideological architecture. IB question: How does Orwell construct his critique of totalitarian language?",
    respuesta_modelo:
      "The antithesis Orwell constructs between Party-servant and independent thinker is not merely descriptive: it is the architecture the Party itself requires, and the novel's deeper argument is that under totalitarianism the antithesis ceases to be available because language has been engineered to forbid it. «Doublethink», «Newspeak», «War is Peace» — these are the tools by which the opposition between servitude and thought is dissolved into the impossibility of thinking against the Party at all. The error Orwell warns against is therefore not moral cowardice but epistemological capture: when the words for resistance no longer exist, the antithesis disappears not because no one refuses but because no one can formulate refusal. The novel is not a call to revolution but a defence of language as the precondition of any revolution.",
    criterio: "A",
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
    nombre: "Personificación / prosopopeya",
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
    ejemplo: "«Vivo sin vivir en mí, / y tan alta vida espero, / que muero porque no muero.»",
    fuente: "Santa Teresa de Jesús",
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
    ejemplo: "«Puedo escribir los versos más tristes esta noche.»",
    fuente: "Neruda, Poema XX",
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

const RECURSOS_LITERARIOS_EN: RecursoLiterario[] = [
  // ── TROPES ──
  {
    nombre: "Metaphor",
    categoria: "tropos",
    definicion: "Identifies two realities without a comparative marker (without «like» or «as»).",
    ejemplo: "«Hope is the thing with feathers — / That perches in the soul —»",
    fuente: "Emily Dickinson, «Hope is the thing with feathers»",
    efecto: "Condenses meaning; makes the abstract concrete; evokes without naming directly.",
  },
  {
    nombre: "Simile (comparison)",
    categoria: "tropos",
    definicion: "Joins two realities through «like», «as», or another comparative marker.",
    ejemplo: "«O my Luve is like a red, red rose / That's newly sprung in June.»",
    fuente: "Robert Burns, «A Red, Red Rose»",
    efecto:
      "Highlights a specific quality; creates a precise visual image; anchors the unknown in the familiar.",
  },
  {
    nombre: "Personification",
    categoria: "tropos",
    definicion: "Attributes human qualities, actions, or feelings to inanimate or abstract beings.",
    ejemplo: "«Because I could not stop for Death — / He kindly stopped for me —»",
    fuente: "Emily Dickinson, «Because I could not stop for Death»",
    efecto:
      "Humanizes the abstract; generates empathy or unease; can invert the subject-world hierarchy.",
  },
  {
    nombre: "Hyperbole",
    categoria: "tropos",
    definicion: "Deliberate exaggeration that overflows reality.",
    ejemplo: "«I will love you, dear, I will love you / Till China and Africa meet.»",
    fuente: "W. H. Auden, «As I Walked Out One Evening»",
    efecto:
      "Emphasizes a trait; can produce humour, irony, or drama; reveals the speaker's subjectivity.",
  },
  {
    nombre: "Irony",
    categoria: "tropos",
    definicion:
      "Says or stages the opposite of what is meant; the reader must decode the real sense.",
    ejemplo: "«My name is Ozymandias, King of Kings; / Look on my Works, ye Mighty, and despair!»",
    fuente: "Percy Bysshe Shelley, «Ozymandias»",
    efecto:
      "Creates critical distance; denounces without direct accusation; implicates the reader in the judgement.",
  },
  {
    nombre: "Antithesis",
    categoria: "tropos",
    definicion: "Juxtaposes two ideas, words, or structures of opposite meaning.",
    ejemplo: "«It was the best of times, it was the worst of times.»",
    fuente: "Charles Dickens, A Tale of Two Cities",
    efecto:
      "Highlights the contrast; creates semantic tension; forces the reader to weigh both options at once.",
  },
  {
    nombre: "Oxymoron",
    categoria: "tropos",
    definicion: "Joins two contradictory terms in a single expression.",
    ejemplo: "«O brawling love! O loving hate!»",
    fuente: "William Shakespeare, Romeo and Juliet",
    efecto: "Compresses a paradox; suggests that reality is more complex than simple opposites.",
  },
  {
    nombre: "Paradox",
    categoria: "tropos",
    definicion: "An apparently impossible statement that holds a deep truth.",
    ejemplo: "«Death, thou shalt die.»",
    fuente: "John Donne, Holy Sonnet 10",
    efecto:
      "Forces the reader to think; challenges rational categories; can be the central philosophical argument of the text.",
  },
  {
    nombre: "Allegory",
    categoria: "tropos",
    definicion:
      "Sustained metaphor across a text: each element represents something beyond its literal sense.",
    ejemplo:
      "The pigs in Animal Farm represent revolutionary leaders who reproduce the tyranny they overthrew.",
    fuente: "George Orwell, Animal Farm",
    efecto: "Allows reading on two simultaneous levels; makes abstract ideas narratively concrete.",
  },
  {
    nombre: "Synecdoche",
    categoria: "tropos",
    definicion: "Uses the part for the whole, or the whole for the part.",
    ejemplo: "«All hands on deck.»",
    fuente:
      "Common nautical English, used widely in maritime literature (e.g., Melville, Moby-Dick)",
    efecto:
      "Concentrates the evocation; the fragmentation can foreground a function or a vulnerability of the body.",
  },
  {
    nombre: "Metonymy",
    categoria: "tropos",
    definicion:
      "Replaces one concept with another linked by contiguity (cause/effect, container/contents…).",
    ejemplo: "«The pen is mightier than the sword.»",
    fuente: "Edward Bulwer-Lytton, Richelieu",
    efecto:
      "Evokes without naming; creates cultural resonances; can reveal attitudes toward what it represents.",
  },
  {
    nombre: "Euphemism",
    categoria: "tropos",
    definicion: "Replaces a term considered taboo or unpleasant with a softer expression.",
    ejemplo: "«He passed away in his sleep.»",
    fuente: "Conventional English usage (cf. Hemingway's understated death scenes)",
    efecto:
      "Reveals what society considers unspeakable; can create irony by softening something grave; involves the reader in discovering the taboo.",
  },
  // ── REPETITION ──
  {
    nombre: "Anaphora",
    categoria: "repeticion",
    definicion:
      "Repetition of the same word or expression at the beginning of consecutive lines or clauses.",
    ejemplo: "«We cannot dedicate — we cannot consecrate — we cannot hallow — this ground.»",
    fuente: "Abraham Lincoln, The Gettysburg Address",
    efecto:
      "Creates rhythm; emphasizes accumulation; can mimic content in form (insistence, communal voice).",
  },
  {
    nombre: "Epistrophe",
    categoria: "repeticion",
    definicion: "Repetition of the same word or expression at the end of lines or clauses.",
    ejemplo: "«…government of the people, by the people, for the people.»",
    fuente: "Abraham Lincoln, The Gettysburg Address",
    efecto:
      "Generates emphatic closure; the final insistence turns the repeated element into the central argument.",
  },
  {
    nombre: "Parallelism",
    categoria: "repeticion",
    definicion: "Repetition of the same syntactic structure in consecutive clauses or lines.",
    ejemplo: "«To err is human; to forgive, divine.»",
    fuente: "Alexander Pope, An Essay on Criticism",
    efecto:
      "Creates balance and symmetry; invites comparison of the parallel elements; gives a sententious rhythm.",
  },
  {
    nombre: "Alliteration",
    categoria: "repeticion",
    definicion: "Repetition of identical or similar consonant sounds in nearby words.",
    ejemplo: "«The fair breeze blew, the white foam flew, / The furrow followed free.»",
    fuente: "Samuel Taylor Coleridge, The Rime of the Ancient Mariner",
    efecto:
      "Musicality; can imitate sounds (onomatopoeic function); underscores the connection between words.",
  },
  {
    nombre: "Polysyndeton",
    categoria: "repeticion",
    definicion: "Use of more conjunctions than grammatically necessary.",
    ejemplo:
      "«And the rain descended, and the floods came, and the winds blew, and beat upon that house.»",
    fuente: "King James Bible, Matthew 7:25 (a touchstone of English literary cadence)",
    efecto:
      "Slows the rhythm; conveys exhaustive accumulation; can express wonder, gravity, or chaos.",
  },
  {
    nombre: "Asyndeton",
    categoria: "repeticion",
    definicion: "Suppression of conjunctions between elements of an enumeration.",
    ejemplo: "«I came, I saw, I conquered.»",
    fuente: "Julius Caesar, attributed; widely used in English prose (cf. Hemingway)",
    efecto: "Speeds the rhythm; creates urgency or fragmentation; can suggest the unbounded.",
  },
  // ── CONSTRUCTION ──
  {
    nombre: "Hyperbaton",
    categoria: "construccion",
    definicion: "Alteration of the usual syntactic order of a sentence.",
    ejemplo: "«Of man's first disobedience, and the fruit / Of that forbidden tree…»",
    fuente: "John Milton, Paradise Lost",
    efecto:
      "Shifts the emphasis to the term in an anomalous position; lends poeticity or gravity; can create suspense across the line.",
  },
  {
    nombre: "Ellipsis",
    categoria: "construccion",
    definicion: "Omission of words that are understood from context.",
    ejemplo: "«For sale: baby shoes, never worn.»",
    fuente: "Six-word story attributed to Ernest Hemingway",
    efecto:
      "Speeds the rhythm; creates intensity; involves the reader in reconstructing the omitted sense.",
  },
  {
    nombre: "Enumeration",
    categoria: "construccion",
    definicion: "Succession of elements of the same grammatical or semantic category.",
    ejemplo: "«All things counter, original, spare, strange.»",
    fuente: "Gerard Manley Hopkins, «Pied Beauty»",
    efecto:
      "Accumulates; can express abundance, variety, or exhaustiveness; gives the rhythm of a list.",
  },
  {
    nombre: "Climax (gradation)",
    categoria: "construccion",
    definicion: "Enumeration in ascending (climax) or descending (anticlimax) order of intensity.",
    ejemplo: "«Does it dry up / like a raisin in the sun? […] Or does it explode?»",
    fuente: "Langston Hughes, «Harlem»",
    efecto:
      "Creates suspense or inevitable conclusion; the climax dramatizes the emotional argument.",
  },
  {
    nombre: "Rhetorical question",
    categoria: "construccion",
    definicion: "A question that expects no answer but emphasizes or implicates the reader.",
    ejemplo: "«Shall I compare thee to a summer's day?»",
    fuente: "William Shakespeare, Sonnet 18",
    efecto:
      "Implicates the reader emotionally; emphasizes the obvious; can function as a veiled accusation or invitation.",
  },
  {
    nombre: "Apostrophe",
    categoria: "construccion",
    definicion: "Direct address to an absent or dead person, or to an abstraction.",
    ejemplo: "«Death, be not proud, though some have called thee / Mighty and dreadful…»",
    fuente: "John Donne, Holy Sonnet 10",
    efecto:
      "Creates dramatic intimacy; emotionally involves both the fictional addressee and the reader.",
  },
  {
    nombre: "Leitmotif",
    categoria: "construccion",
    definicion:
      "A motif (image, phrase, or idea) repeated throughout a text with variations and accumulating meaning.",
    ejemplo: "«Quoth the Raven, 'Nevermore.'» — returning at fixed structural points.",
    fuente: "Edgar Allan Poe, «The Raven»",
    efecto:
      "Unifies the text; each repetition adds a layer of meaning; creates a sense of circularity or inevitability.",
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

const getNivelLabel = (nivel: string, isEN: boolean): string => {
  if (!isEN) return nivel;
  const enMap: Record<string, string> = {
    Básico: "Basic",
    "Básico-Medio": "Basic-Intermediate",
    Medio: "Intermediate",
    "Medio-Avanzado": "Intermediate-Advanced",
    IB: "IB",
  };
  return enMap[nivel] ?? nivel;
};

const getCategoriaLabel = (cat: RecursoLiterario["categoria"], isEN: boolean): string => {
  if (isEN) {
    return { tropos: "Tropes", repeticion: "Repetition", construccion: "Construction" }[cat];
  }
  return { tropos: "Tropos", repeticion: "Repetición", construccion: "Construcción" }[cat];
};

const CATEGORIA_COLOR: Record<RecursoLiterario["categoria"], string> = {
  tropos: "bg-violet-500/15 text-violet-700 border-violet-300",
  repeticion: "bg-amber-500/15 text-amber-700 border-amber-300",
  construccion: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
};

// ── COMPONENTES ──────────────────────────────────────────────

function EjercicioIdentificacion() {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const items = isEN ? EJERCICIOS_IDENTIFICACION_EN : EJERCICIOS_IDENTIFICACION;
  const [idx, setIdx] = useState(0);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const ej = items[idx];
  const respondido = seleccionada !== null;
  const correcto = seleccionada === ej.correcta;

  const siguiente = () => {
    setIdx((i) => (i + 1) % items.length);
    setSeleccionada(null);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + items.length) % items.length);
    setSeleccionada(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isEN ? "Exercise" : "Ejercicio"} {idx + 1} {isEN ? "of" : "de"} {items.length}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              NIVEL_COLOR[ej.nivel],
            )}
          >
            {getNivelLabel(ej.nivel, isEN)}
          </span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              CRITERIO_COLOR[ej.criterio],
            )}
          >
            {isEN ? "Criterion" : "Criterio"} {ej.criterio}
          </span>
        </div>
      </div>

      <Card className="p-5 bg-parchment/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {isEN ? "Extract" : "Fragmento"}
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
            {correcto ? "Correct —" : "Not quite —"} {isEN ? "Explanation" : "Explicación"}
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.explicacion}</p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          {isEN ? "Previous" : "Anterior"}
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          {isEN ? "Next" : "Siguiente"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EjercicioEfectos() {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const items = isEN ? EJERCICIOS_EFECTOS_EN : EJERCICIOS_EFECTOS;
  const [idx, setIdx] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarModelo, setMostrarModelo] = useState(false);
  const ej = items[idx];

  const siguiente = () => {
    setIdx((i) => (i + 1) % items.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + items.length) % items.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isEN ? "Exercise" : "Ejercicio"} {idx + 1} {isEN ? "of" : "de"} {items.length}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
            CRITERIO_COLOR[ej.criterio],
          )}
        >
          {isEN ? "Criterion" : "Criterio"} {ej.criterio}
        </span>
      </div>

      <Card className="p-5 bg-parchment/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {isEN ? "Extract" : "Fragmento"}
        </div>
        <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-line">
          {ej.fragmento}
        </p>
      </Card>

      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {isEN ? "Identified device:" : "Recurso identificado:"}
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
          placeholder={
            isEN
              ? "Write your analysis of the effect here (2-4 sentences)…"
              : "Escribe aquí tu análisis del efecto (2-4 oraciones)…"
          }
          className="text-[14px] leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setMostrarModelo(true)} disabled={mostrarModelo} variant="outline">
          {isEN ? "View model answer" : "Ver respuesta modelo"}
        </Button>
      </div>

      {mostrarModelo && (
        <Card className="p-4 border-border bg-card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {isEN ? "Model answer" : "Respuesta modelo"}
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.respuesta_modelo}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {isEN
              ? "Compare your answer with the model: did you identify the same effect? Did you explain "
              : "Compara tu respuesta con el modelo: ¿has identificado el mismo efecto? ¿Has explicado "}
            <em>{isEN ? "how" : "cómo"}</em>
            {isEN ? " the device produces it?" : " el recurso lo produce?"}
          </p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          {isEN ? "Previous" : "Anterior"}
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          {isEN ? "Next" : "Siguiente"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EjercicioReescritura() {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const items = isEN ? EJERCICIOS_REESCRITURA_EN : EJERCICIOS_REESCRITURA;
  const [idx, setIdx] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarModelo, setMostrarModelo] = useState(false);
  const ej = items[idx];

  const siguiente = () => {
    setIdx((i) => (i + 1) % items.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  const anterior = () => {
    setIdx((i) => (i - 1 + items.length) % items.length);
    setRespuesta("");
    setMostrarModelo(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isEN ? "Exercise" : "Ejercicio"} {idx + 1} {isEN ? "of" : "de"} {items.length}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {ej.nivel_objetivo === "análisis"
              ? isEN
                ? "Description → Analysis"
                : "Descripción → Análisis"
              : isEN
                ? "Analysis → Interpretation"
                : "Análisis → Interpretación"}
          </Badge>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              CRITERIO_COLOR[ej.criterio],
            )}
          >
            {isEN ? "Criterion" : "Criterio"} {ej.criterio}
          </span>
        </div>
      </div>

      <Card className="p-4 border-amber-200 bg-amber-50/40">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {isEN ? "Descriptive text (to transform)" : "Texto descriptivo (a transformar)"}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed italic">
          &ldquo;{ej.descripcion_original}&rdquo;
        </p>
      </Card>

      <div className="text-xs text-muted-foreground">
        <strong>{isEN ? "Context:" : "Contexto:"}</strong> {ej.contexto}
      </div>

      <Card className="p-3 border-amber-200 bg-amber-50/50">
        <p className="text-[12px] leading-relaxed text-amber-800">
          {isEN
            ? "Read the context before answering. A strong rewrite does not only name the device; it explains why that device matters in this specific text."
            : "Lee el contexto antes de responder. Una buena reescritura no solo nombra el recurso: explica por qué importa en este texto concreto."}
        </p>
      </Card>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">
          {ej.nivel_objetivo === "análisis"
            ? isEN
              ? "Rewrite the text as analysis: explain the device and its effect on the meaning of the text."
              : "Reescribe el texto como análisis: explica el recurso y su efecto en el significado del texto."
            : isEN
              ? "Rewrite the text as interpretation: explain the device and its effect on the meaning of the text."
              : "Reescribe el texto como interpretación: explica el recurso y su efecto en el significado del texto."}
        </p>
        <Textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={5}
          placeholder={
            ej.nivel_objetivo === "análisis"
              ? isEN
                ? "Explain how the device works and what effect it produces in the text…"
                : "Explica cómo funciona el recurso y qué efecto produce en el texto…"
              : isEN
                ? "Interpret what this device means in the broader context of the text or author…"
                : "Interpreta qué significa este recurso en el contexto más amplio del texto o del autor…"
          }
          className="text-[14px] leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setMostrarModelo(true)} disabled={mostrarModelo} variant="outline">
          {isEN ? "View model answer" : "Ver respuesta modelo"}
        </Button>
      </div>

      {mostrarModelo && (
        <Card className="p-4 border-border bg-card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {isEN ? "Model answer" : "Respuesta modelo"}
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{ej.respuesta_modelo}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {ej.nivel_objetivo === "análisis"
              ? isEN
                ? "The key difference between description and analysis: analysis explains the how (the device's mechanism), not just the what."
                : "La diferencia clave entre descripción y análisis: el análisis explica el cómo (el mecanismo del recurso), no solo el qué."
              : isEN
                ? "The key difference between description and interpretation: interpretation explains the why (the meaning in the text), not just the what."
                : "La diferencia clave entre descripción e interpretación: la interpretación explica el por qué (el significado en el texto), no solo el qué."}
          </p>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={anterior}>
          <ChevronLeft className="h-4 w-4" />
          {isEN ? "Previous" : "Anterior"}
        </Button>
        <Button variant="outline" size="sm" onClick={siguiente}>
          {isEN ? "Next" : "Siguiente"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TeoriaRecursos() {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const fuente = isEN ? RECURSOS_LITERARIOS_EN : RECURSOS_LITERARIOS;
  const [filtro, setFiltro] = useState<RecursoLiterario["categoria"] | "todos">("todos");

  const recursos = filtro === "todos" ? fuente : fuente.filter((r) => r.categoria === filtro);

  const categorias: Array<{ value: RecursoLiterario["categoria"] | "todos"; label: string }> = [
    { value: "todos", label: `${isEN ? "All" : "Todos"} (${fuente.length})` },
    {
      value: "tropos",
      label: `${isEN ? "Tropes" : "Tropos"} (${fuente.filter((r) => r.categoria === "tropos").length})`,
    },
    {
      value: "repeticion",
      label: `${isEN ? "Repetition" : "Repetición"} (${fuente.filter((r) => r.categoria === "repeticion").length})`,
    },
    {
      value: "construccion",
      label: `${isEN ? "Construction" : "Construcción"} (${fuente.filter((r) => r.categoria === "construccion").length})`,
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
                {getCategoriaLabel(r.categoria, isEN)}
              </span>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed">{r.definicion}</p>

            <div className="rounded-md bg-parchment/50 px-3 py-2 border border-border/60">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                {isEN ? "Example" : "Ejemplo"}
              </div>
              <p className="font-serif text-[13px] text-ink leading-snug italic">{r.ejemplo}</p>
              {r.fuente !== "-" && (
                <p className="text-[10px] text-muted-foreground mt-1">— {r.fuente}</p>
              )}
            </div>

            <div className="rounded-md bg-amber-50/60 px-3 py-2 border border-amber-200/60">
              <div className="text-[10px] uppercase tracking-[0.15em] text-amber-700 mb-1">
                {isEN ? "Effect on the reader" : "Efecto en el lector"}
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
  const { user, loading: authLoading, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  // const { capabilities } = COURSES[courseKey];

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {isEN ? "Practice exercises" : "Microejercicios"}
          </div>
          <h1 className="font-serif text-3xl text-ink">{isEN ? "Exercises" : "Ejercicios"}</h1>
          <p className="text-foreground/70 mt-2 max-w-xl">
            {isEN
              ? "Practice with progressively graded questions up to IB level, and consult the literary devices reference when you need to review."
              : "Practica con preguntas de progresión gradual hasta el nivel IB, y consulta la ficha de recursos literarios cuando necesites repasar."}
          </p>
        </div>

        <Tabs defaultValue={tab ?? "identificacion"}>
          <TabsList className="mb-6 w-full sm:w-auto flex-wrap h-auto gap-1">
            <TabsTrigger value="identificacion" className="text-xs">
              {isEN ? "Identification" : "Identificación"}
            </TabsTrigger>
            <TabsTrigger value="efectos" className="text-xs">
              {isEN ? "Effects" : "Efectos"}
            </TabsTrigger>
            <TabsTrigger value="reescritura" className="text-xs">
              {isEN ? "Rewriting" : "Reescritura"}
            </TabsTrigger>
            <TabsTrigger value="teoria" className="text-xs">
              {isEN ? "Literary devices" : "Recursos literarios"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identificacion">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">
                  {isEN ? "Device identification" : "Identificación de recursos"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEN
                    ? "Progression from Basic to IB. Identify the rhetorical device and its function."
                    : "Progresión de Básico a IB. Identifica el recurso retórico y su función."}
                </p>
              </div>
              <EjercicioIdentificacion />
            </Card>
          </TabsContent>

          <TabsContent value="efectos">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">
                  {isEN ? "Effect analysis" : "Análisis de efectos"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEN
                    ? "The device is already identified. Explain in 2-4 sentences what effect it produces on the reader. IB-style questions."
                    : "El recurso ya está identificado. Explica en 2-4 oraciones qué efecto produce en el lector. Preguntas al estilo IB."}
                </p>
              </div>
              <EjercicioEfectos />
            </Card>
          </TabsContent>

          <TabsContent value="reescritura">
            <Card className="p-6">
              <div className="mb-4">
                <div className="font-medium text-ink text-sm mb-1">
                  {isEN
                    ? "Description → Analysis → Interpretation"
                    : "Descripción → Análisis → Interpretación"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEN
                    ? "Transform a descriptive observation into analysis or interpretation. Criteria A and B."
                    : "Transforma una observación descriptiva en análisis o interpretación. Criterios A y B."}
                </p>
              </div>
              <EjercicioReescritura />
            </Card>
          </TabsContent>

          <TabsContent value="teoria">
            <Card className="p-6">
              <div className="mb-5">
                <div className="font-medium text-ink text-sm mb-1">
                  {isEN ? "Literary devices" : "Recursos literarios"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEN
                    ? "Quick reference: definition, example from a canonical text, and effect on the reader. Filter by category."
                    : "Ficha de consulta rápida: definición, ejemplo de texto canónico y efecto en el lector. Filtra por categoría."}
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
