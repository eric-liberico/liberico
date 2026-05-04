import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
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
      { title: "Ejercicios — LIBerico" },
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
    opciones: ["Metáfora", "Símil", "Hipérbole", "Personificación"],
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
    opciones: ["Hipérbole", "Personificación", "Ironía", "Símil"],
    correcta: 1,
    explicacion:
      "La personificación atribuye emociones o acciones humanas a objetos inanimados. Aquí, los clavos «desesperan», convirtiendo la atracción magnética en un impulso casi volitivo. Este recurso sostiene el realismo mágico de Macondo: la naturaleza inerte reacciona como si sintiera urgencia. La hipérbole, en cambio, exageraría sin necesariamente humanizar.",
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
      "La paradoja combina dos proposiciones incompatibles (dos centímetros / el cosmos entero) para enunciar algo que la lógica no puede contener. Borges no pretende describir un objeto real, sino formular una hipótesis filosófica: ¿qué ocurriría si un punto del espacio contuviera todos los demás? La contradicción es, en sí misma, la tesis del cuento. La antítesis, en cambio, simplemente yuxtapondría opuestos sin proponer una verdad que los trascienda.",
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
      "Personificación y símil: la noche actúa como personaje y se compara con el dolor",
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
      "Vi el populoso mar, vi el alba y la tarde, vi las muchedumbres de América, vi una plateada telaraña en el centro de una negra pirámide, vi un laberinto roto (era Londres), vi interminables ojos inmediatos escrutándose en mí como en un espejo, vi todos los espejos del planeta y ninguno me reflejó...",
    pregunta:
      "¿Qué efecto produce la anáfora de «vi» combinada con la enumeración aparentemente inagotable en el clímax de El Aleph de Borges?",
    opciones: [
      "Crea un catálogo enciclopédico que demuestra la erudición del narrador",
      "La anáfora convierte al narrador en puro órgano de percepción sin jerarquías, y la enumeración caótica imita en la sintaxis la simultaneidad imposible del Aleph",
      "Introduce una gradación que va de lo pequeño a lo cósmico para mostrar la magnitud del objeto",
      "Produce un efecto hipnótico mediante la repetición que prepara al lector para la revelación final",
    ],
    correcta: 1,
    explicacion:
      "La anáfora de «vi» disuelve al narrador: ya no hay un yo que seleccione o interprete, solo un instrumento que recibe. La enumeración caótica —mar, alba, muchedumbres, telaraña, pirámide, espejos— no tiene orden jerárquico porque el Aleph tampoco lo tiene: todo ocurre simultáneamente. El efecto sobre el lector es de vértigo creciente: la lista parece no poder acabar, igual que la visión no puede acabar. Borges hace que el lenguaje lineal imite lo que por definición no puede ser lineal.",
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
      "La personificación de la casa, que le atribuye voluntad propia para invertir la jerarquía entre espacio y personajes",
      "La ironía del narrador, que critica la pasividad de los personajes sin declararlo abiertamente",
      "La elipsis narrativa, que omite las razones reales del rechazo para crear suspense",
      "La hipérbole de la influencia de la casa, exagerada para crear efecto gótico",
    ],
    correcta: 0,
    explicacion:
      "Al concederle a la casa una voluntad propia («era ella la que no nos dejaba»), Cortázar invierte la jerarquía habitual: no son los personajes quienes habitan el espacio, sino el espacio quien los posee. Esto genera amenaza difusa antes de que ocurra nada explícitamente sobrenatural. Además, la personificación exime a los personajes de responsabilidad psicológica: culpar a la casa es más cómodo que admitir su parálisis. El lector percibe esa evasión y entiende que el verdadero «fantasma» es la incapacidad de vivir fuera de ella.",
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
    recurso: "Personificación",
    recurso_en_texto: "la casa «no nos dejaba casarnos»",
    pregunta:
      "¿Qué efecto produce en el lector que Cortázar atribuya a la casa la decisión de no dejar casarse a los protagonistas?",
    respuesta_modelo:
      "Al concederle a la casa una voluntad propia, Cortázar invierte la jerarquía habitual: ya no son los personajes quienes habitan el espacio, sino el espacio quien los posee. Esto genera una sensación de amenaza difusa antes de que ocurra nada explícitamente sobrenatural. Además, la personificación exime a los personajes de responsabilidad psicológica: culpar a la casa es más cómodo que admitir su parálisis. El lector percibe esa evasión y entiende que el verdadero «fantasma» es la incapacidad de los protagonistas para vivir fuera de ella. El detalle de Irene rechazando pretendientes «sin mayor explicación» refuerza la misma lógica: los personajes nunca articulan sus razones porque no desean examinarlas.",
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
      "Vi el populoso mar, vi el alba y la tarde, vi las muchedumbres de América, vi una plateada telaraña en el centro de una negra pirámide, vi un laberinto roto (era Londres), vi interminables ojos inmediatos escrutándose en mí como en un espejo, vi todos los espejos del planeta y ninguno me reflejó...",
    recurso: "Anáfora + enumeración caótica",
    recurso_en_texto: "«Vi…» repetido ante una acumulación de imágenes heterogéneas",
    pregunta:
      "¿Qué efecto produce en el lector la anáfora de «vi» unida a una enumeración aparentemente inagotable en el clímax de El Aleph de Borges?",
    respuesta_modelo:
      "La anáfora de «vi» convierte al narrador en puro órgano de percepción: el yo gramatical no interpreta ni selecciona, solo recibe. La enumeración caótica —mar, alba, muchedumbres, telaraña, pirámide, espejos— no tiene orden jerárquico porque el Aleph tampoco lo tiene: todo ocurre simultáneamente. El efecto sobre el lector es de vértigo creciente: la lista parece no poder acabar, igual que la visión no puede acabar. Borges hace que el lenguaje lineal imite lo que por definición no puede ser lineal, y ese fracaso controlado es el argumento central del texto: el lenguaje no puede contener la experiencia, pero el intento mismo de contenerla es lo que el relato narra.",
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
      "Borges describe en El Aleph que el objeto mide dos o tres centímetros pero que dentro de él está todo el espacio del universo. El narrador ve miles de cosas al mismo tiempo desde ese punto.",
    nivel_objetivo: "interpretación",
    contexto:
      "«El Aleph» de Jorge Luis Borges (1949). Recurso: paradoja. Pregunta IB: ¿Qué propone Borges sobre los límites del lenguaje y el conocimiento?",
    respuesta_modelo:
      "La paradoja del Aleph —dos centímetros que contienen el cosmos— no es una fantasía sino una trampa epistemológica: si existiera un punto que contuviera todos los demás puntos del espacio, sería imposible describirlo en lenguaje lineal, porque el lenguaje tiene que ir de A a B mientras que el Aleph es A y B al mismo tiempo. Borges lo sabe y lo explicita: el narrador reconoce que su enumeración es «una mísera aproximación». El cuento no trata sobre un objeto mágico sino sobre el fracaso constitutivo del lenguaje ante la simultaneidad. El Aleph es imposible de ver y también imposible de narrar, y esa doble imposibilidad es el argumento real del texto.",
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
          placeholder="Escribe aquí tu análisis del efecto (2-4 oraciones)…"
          className="text-[14px] leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setMostrarModelo(true)} disabled={mostrarModelo} variant="outline">
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
          Texto descriptivo (a transformar)
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
          Reescribe el texto como {ej.nivel_objetivo === "análisis" ? "análisis" : "interpretación"}
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
        <Button onClick={() => setMostrarModelo(true)} disabled={mostrarModelo} variant="outline">
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
  const { user, loading: authLoading, courseKey } = useAuth();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const { capabilities } = COURSES[courseKey];

  if (!authLoading && !capabilities.exercises) {
    return <Navigate to="/" />;
  }

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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

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

        <Tabs defaultValue={tab ?? "identificacion"}>
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
                  El recurso ya está identificado. Explica en 2-4 oraciones qué efecto produce en el
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
