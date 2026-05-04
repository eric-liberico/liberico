// Texto diagnóstico fijo para el onboarding.
// Spanish A: Fragmento de "Niebla" (1914) de Miguel de Unamuno — dominio público.
// English A: Original text — no copyright.

import type { CourseKey } from "@/lib/ib-courses";

type TextoDiagnostico = {
  titulo: string;
  autor: string;
  texto: string;
  pregunta: string;
};

export const TEXTO_DIAGNOSTICO: TextoDiagnostico = {
  titulo: "Fragmento de Niebla",
  autor: "Miguel de Unamuno (1914)",
  texto: `Al aparecer Augusto a la puerta de su casa extendió la mano derecha, con la palma hacia abajo, y dirigiendo los ojos al cielo, quedóse un momento parado en esta actitud estatuaria y augusta. No era que tomaba posesión del mundo exterior, sino era que observaba si llovía. Y al recibir en el dorso de la mano el frescor del lento orvallo frunció el sobrecejo. Y no era tampoco que le molestase la llovizna, sino el tener que abrir el paraguas. ¡Estaba tan elegante, tan esbelto, plegado y dentro de su funda! Un paraguas cerrado es tan elegante como es feo un paraguas abierto.

Es una desgracia esto de tener que servirse uno de las cosas —pensó Augusto—; tener que usarlas. El uso estropea y hasta destruye toda belleza. La función más noble de los objetos es la de ser contemplados. ¡Qué bella es una naranja antes de comida! Esto cambiará en el cielo, cuando todo nuestro oficio se reduzca, o más bien se eleve, a contemplar a Dios y todas las cosas en Él. Aquí, en esta pobre vida, no nos cuidamos sino de servirnos de Dios; pretendemos abrirlo, como a un paraguas, para que nos proteja de toda suerte de males.

Díjose esto y se agachó a recogerse los pantalones. Abrió el paraguas y se quedó un momento suspenso y pensando: «¿Y ahora hacia dónde voy? ¿tiro a la derecha o a la izquierda?» Porque Augusto no era un caminante, sino un paseante de la vida. «Esperaré a que pase un perro —se dijo— y tomaré la dirección inicial que él tome.»

En esto pasó por la calle no un perro, sino una garrida moza, y tras de sus ojos se fue, como imantado y sin darse de ello cuenta, Augusto.`,
  pregunta:
    "¿Cómo se construye la voz narrativa del fragmento para caracterizar a Augusto y su particular forma de habitar el mundo? Considera el papel de la ironía, las digresiones reflexivas y los detalles cotidianos en la presentación del personaje.",
};

// Original diagnostic text for English A: Literature.
// Short original prose — no existing work used.
export const TEXTO_DIAGNOSTICO_EN: TextoDiagnostico = {
  titulo: "The Last Map",
  autor: "IB Diagnostic Text",
  texto: `The old cartographer had spent forty years drawing maps of places he had never visited. His office smelled of ink and possibility. On the wall behind him hung his greatest work: a chart of the coastline of an island that, according to three separate expeditions, did not exist.

"You drew something that isn't there," his assistant said one afternoon.

He turned slowly in his chair. "Everything on that map is true," he said. "The coves, the cliffs, the lighthouse at the northern point. I dreamed them with such precision that they must exist somewhere. Geography," he added, "is merely a form of memory."

The assistant looked at the island again. It was beautiful — more beautiful, she thought, than any real coastline she had ever seen. The contour lines swept like calligraphy. The depth soundings were meticulous. A small notation in the margin read: Here the sea is quiet even in storms.

She asked him how he could be so certain.

He smiled and said nothing. Instead, he picked up his pen and began to draw another island, this one further south, where the ocean had no name.`,
  pregunta:
    "How does the writer use the relationship between the cartographer and his work to explore ideas about truth, imagination, and the nature of knowledge? Consider the role of imagery, dialogue, and the story's final image.",
};

export function getTextoDiagnostico(courseKey: CourseKey): TextoDiagnostico {
  return courseKey === "english-a-literature" ? TEXTO_DIAGNOSTICO_EN : TEXTO_DIAGNOSTICO;
}
