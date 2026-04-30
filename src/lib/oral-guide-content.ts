export type EjemploAsuntoGlobal = {
  texto: string;
};

export type EjemploDebil = {
  texto: string;
  razon: string;
};

export type CampoIndagacion = {
  key: string;
  nombre: string;
  buenos: EjemploAsuntoGlobal[];
  debiles: EjemploDebil[];
  porQueFuncionan: string;
};

export const CAMPOS_INDAGACION: CampoIndagacion[] = [
  {
    key: "cultura",
    nombre: "Cultura, identidad y comunidad",
    buenos: [
      {
        texto:
          "La tensión entre la identidad individual y las expectativas de la comunidad en contextos que penalizan la disidencia.",
      },
      {
        texto:
          "La construcción de la identidad femenina frente a normas culturales que la confinan al espacio doméstico.",
      },
      {
        texto:
          "La fractura entre la identidad cultural heredada y la búsqueda de una identidad propia en individuos migrantes o desplazados.",
      },
      {
        texto:
          "El papel del silencio en la perpetuación de normas sociales opresivas dentro de estructuras familiares o comunitarias.",
      },
      {
        texto:
          "La nostalgia como mecanismo de preservación o distorsión de la identidad en comunidades amenazadas o fragmentadas.",
      },
    ],
    debiles: [
      {
        texto: "La identidad",
        razon:
          "Demasiado amplio: cualquier obra puede relacionarse con la identidad. No indica qué aspecto, en qué contexto ni qué tensión está en juego.",
      },
      {
        texto: "Las tradiciones culturales",
        razon:
          "Descriptivo, no debatible: no plantea una tensión ni une el asunto con un problema que las obras puedan iluminar.",
      },
      {
        texto: "La comunidad",
        razon:
          "Es un concepto, no un asunto global: no define qué es problemático, relevante o debatible en la comunidad.",
      },
    ],
    porQueFuncionan:
      "Los buenos asuntos globales nombran un problema concreto, sitúan a los personajes en una tensión real y son lo suficientemente amplios para aparecer en obras de contextos culturales muy distintos. Son debatibles: alguien podría discrepar de cómo se presenta ese problema.",
  },
  {
    key: "creencias",
    nombre: "Creencias, valores y educación",
    buenos: [
      {
        texto:
          "El conflicto entre los valores morales transmitidos por la familia y los valores forjados por la experiencia personal.",
      },
      {
        texto:
          "La instrumentalización de la educación como mecanismo de adoctrinamiento o control ideológico en contextos autoritarios.",
      },
      {
        texto:
          "La culpa como consecuencia del choque entre el código ético interiorizado y las decisiones individuales irreversibles.",
      },
      {
        texto:
          "La transmisión intergeneracional de creencias que limitan la libertad y la subjetividad de las nuevas generaciones.",
      },
      {
        texto:
          "El conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él.",
      },
    ],
    debiles: [
      {
        texto: "La religión",
        razon:
          "Demasiado amplio: no define qué aspecto de la religión ni qué tensión crea en los personajes o en su mundo.",
      },
      {
        texto: "Los valores",
        razon:
          "Abstracto e inabarcable: todos los textos tratan sobre valores de alguna forma; sin especificar, no hay foco analítico posible.",
      },
      {
        texto: "La educación",
        razon:
          "La educación como campo no plantea un problema debatible por sí sola; necesita especificar qué problema o tensión crea.",
      },
    ],
    porQueFuncionan:
      "Un buen asunto global sobre creencias y valores nombra una tensión específica entre fuerzas que el texto pone en conflicto: familia vs. individuo, deber vs. deseo, fe vs. duda. Esa tensión debe ser el eje del análisis, no el fondo.",
  },
  {
    key: "politica",
    nombre: "Política, poder y justicia",
    buenos: [
      {
        texto:
          "La deshumanización del individuo bajo estructuras de poder autoritarias que niegan o suprimen su subjetividad.",
      },
      {
        texto:
          "La complicidad del ciudadano ordinario en el mantenimiento de sistemas de injusticia estructural.",
      },
      {
        texto:
          "El uso del lenguaje y del silencio como instrumentos de dominación y como espacios de resistencia frente al poder.",
      },
      {
        texto:
          "La vulnerabilidad de los más débiles ante sistemas jurídicos y sociales que los excluyen o los convierten en invisibles.",
      },
      {
        texto:
          "La transmisión intergeneracional de la violencia en sociedades marcadas por el conflicto político o la represión.",
      },
    ],
    debiles: [
      {
        texto: "El poder",
        razon:
          "No define qué aspecto del poder: político, familiar, económico, simbólico. Sin especificar, el oral no tendrá foco analítico.",
      },
      {
        texto: "La guerra",
        razon:
          "Descriptivo: la guerra puede funcionar como contexto de las obras, pero no como eje analítico, porque no plantea qué se examina dentro de ese contexto.",
      },
      {
        texto: "La injusticia",
        razon:
          "Abstracto: casi toda obra literaria trata la injusticia de alguna forma; sin especificar qué tipo, hacia quién y mediante qué mecanismos, no guía el análisis.",
      },
    ],
    porQueFuncionan:
      "Los buenos asuntos en este campo nombran el mecanismo de poder (deshumanización, complicidad, lenguaje como control) y señalan quién lo sufre o lo ejerce. Eso permite analizar decisiones formales concretas: quién habla, quién calla, qué espacio ocupa.",
  },
  {
    key: "arte",
    nombre: "Arte, creatividad e imaginación",
    buenos: [
      {
        texto:
          "La función del arte o la creación como acto de resistencia o de supervivencia ante la opresión política o social.",
      },
      {
        texto:
          "La tensión entre la vocación artística o creativa del individuo y las expectativas de su entorno familiar o social.",
      },
      {
        texto:
          "La imaginación como refugio, como trampa o como instrumento de transformación para los personajes que no pueden cambiar su realidad.",
      },
      {
        texto:
          "El arte como espacio privilegiado para expresar lo que el lenguaje cotidiano no puede o no se le permite nombrar.",
      },
    ],
    debiles: [
      {
        texto: "El arte",
        razon:
          "Es un campo de indagación, no un asunto global: no plantea ningún problema concreto ni ninguna tensión analizable.",
      },
      {
        texto: "La creatividad humana",
        razon:
          "Demasiado general: no define en qué contexto aparece, qué conflicto crea ni qué está en juego para los personajes.",
      },
      {
        texto: "La imaginación",
        razon:
          "Sin contexto ni tensión: necesita especificar su función en relación con algo (el poder, la opresión, la verdad, la huida) para funcionar como eje analítico.",
      },
    ],
    porQueFuncionan:
      "Los mejores asuntos globales en este campo conectan la creación con algo en riesgo: una identidad amenazada, una represión que hay que esquivar, un dolor que no encuentra otro canal. Eso da al análisis formal una dirección concreta.",
  },
  {
    key: "ciencia",
    nombre: "Ciencia, tecnología y medioambiente",
    buenos: [
      {
        texto:
          "La alienación del ser humano de la naturaleza como consecuencia de la modernización industrial o tecnológica.",
      },
      {
        texto:
          "La tensión entre el progreso científico o industrial y la destrucción de los vínculos comunitarios y del sentido de pertenencia.",
      },
      {
        texto:
          "El cuerpo humano como territorio sobre el que se ejerce control médico, estatal o tecnológico.",
      },
      {
        texto:
          "La transformación del paisaje natural como símbolo o síntoma del deterioro de la relación entre el individuo y su entorno.",
      },
    ],
    debiles: [
      {
        texto: "El medioambiente",
        razon:
          "Descriptivo: no define qué problema plantea el medioambiente ni qué tensión crea en los personajes o en la sociedad representada.",
      },
      {
        texto: "La tecnología y el mundo moderno",
        razon:
          "Demasiado amplio y vago: no permite un análisis enfocado porque no señala qué aspecto de la tecnología ni qué efecto sobre qué.",
      },
      {
        texto: "La ciencia",
        razon:
          "Es un campo de conocimiento, no un asunto: sin especificar qué conflicto crea la ciencia en el texto, no guía el análisis.",
      },
    ],
    porQueFuncionan:
      "Los buenos asuntos en este campo funcionan cuando el texto literario usa el entorno natural o tecnológico como espejo de conflictos humanos. El asunto global debe nombrar esa relación y la tensión que crea.",
  },
];

export type EjemploIntroduccion = {
  tipo: "bueno" | "debil";
  etiqueta: string;
  contexto: {
    tipoOral: string;
    asuntoGlobal: string;
    obra1: string;
    obra2: string;
  };
  texto: string;
  comentario: string;
};

export const EJEMPLOS_INTRODUCCION: EjemploIntroduccion[] = [
  {
    tipo: "bueno",
    etiqueta: "Introducción buena · alumno con profesor",
    contexto: {
      tipoOral: "Alumno con profesor (10 min + 5 min de preguntas)",
      asuntoGlobal:
        "La deshumanización del individuo bajo estructuras de poder autoritarias que suprimen su subjetividad.",
      obra1: "La casa de Bernarda Alba — Federico García Lorca (original en español)",
      obra2: "La metamorfosis — Franz Kafka (en traducción)",
    },
    texto: `En este oral exploraré cómo el asunto global de la deshumanización del individuo bajo estructuras de poder autoritarias se presenta mediante el contenido y la forma en dos obras de contextos distintos pero con resonancias profundas: La casa de Bernarda Alba, de Federico García Lorca, escrita originalmente en español, y La metamorfosis, de Franz Kafka, que estudiaré en su traducción al español.

El primer extracto corresponde al inicio del primer acto de La casa de Bernarda Alba, en el que Bernarda anuncia el luto e impone la reclusión total a sus hijas. El segundo extracto es el párrafo de apertura de La metamorfosis, donde Gregorio Samsa despierta transformado en un insecto y comprueba que su nueva condición no interrumpe su obligación de ir al trabajo.

Mi hipótesis de lectura es que tanto Lorca como Kafka utilizan el espacio —la casa en un caso, la habitación en el otro— como instrumento concreto de la deshumanización: en Lorca, la arquitectura doméstica funciona como extensión del orden patriarcal que niega la subjetividad de las mujeres; en Kafka, la habitación se convierte en el escenario donde la lógica productivista reduce al ser humano a su utilidad económica. Desarrollaré primero el extracto y la obra de Lorca, después el extracto y la obra de Kafka, y cerraré con una síntesis de cómo ambas obras construyen perspectivas complementarias sobre la deshumanización desde géneros y contextos culturales muy distintos.`,
    comentario: `Este introducción funciona por cuatro razones:

1. El asunto global es específico y debatible. No es "el poder" sino la deshumanización como mecanismo concreto de ese poder, con un agente (estructuras autoritarias) y una víctima (la subjetividad del individuo).

2. Ambas obras están identificadas con autor, título, y estado lingüístico (original/traducida), que es un requisito del oral de Literatura A.

3. Los extractos están localizados con precisión dentro de las obras. "El inicio del primer acto" y "el párrafo de apertura" ubican fragmentos concretos y analizables.

4. La tesis conecta la forma con el asunto global: el espacio arquitectónico como instrumento de la deshumanización. No dice solo "ambas obras tratan el poder": dice cómo lo construyen formalmente.

El mapa de estructura al final permite al profesor saber exactamente qué va a ocurrir en los 10 minutos siguientes.`,
  },
  {
    tipo: "bueno",
    etiqueta: "Introducción buena · self-taught / SSST",
    contexto: {
      tipoOral: "Self-taught / SSST (15 min de exposición continua, sin preguntas del profesor)",
      asuntoGlobal:
        "El conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él.",
      obra1: "San Manuel Bueno, mártir — Miguel de Unamuno (original en español)",
      obra2: "Crimen y castigo — Fiódor Dostoievski (en traducción)",
    },
    texto: `Este oral explora cómo el asunto global del conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él se presenta mediante las decisiones de contenido y forma en dos obras que, a pesar de sus diferencias de género y contexto cultural, coinciden en colocar a sus protagonistas ante una elección ética irresoluble.

Las obras son San Manuel Bueno, mártir, de Miguel de Unamuno, escrita originalmente en español, y Crimen y castigo, de Fiódor Dostoievski, que estudiaré en traducción.

El primer extracto procede del fragmento en que el sacerdote Manuel le confiesa a Lázaro su falta de fe; el segundo extracto corresponde al interrogatorio en que Raskolnikov comienza a derrumbarse bajo la presión psicológica de Porfiri.

Mi eje de lectura es que tanto Unamuno como Dostoievski construyen el silencio y la confesión como los espacios donde la verdad se filtra: en San Manuel, la forma epistolar y la perspectiva limitada de Ángela preservan la ambigüedad sobre si Manuel actúa por compasión o por cobardía; en Crimen y castigo, el discurso indirecto libre da acceso al pensamiento de Raskolnikov mientras oculta sus intenciones al exterior, reproduciendo en la forma misma la mentira del protagonista.

Como esta es una exposición de quince minutos sin preguntas del profesor, desarrollaré cada movimiento analítico con la profundidad necesaria para que la síntesis final sea completa sin apoyo externo.`,
    comentario: `Esta introducción es adecuada para la modalidad self-taught por tres razones específicas:

1. La última frase anticipa explícitamente la diferencia de formato: el alumno sabe que no habrá preguntas y ajusta la declaración de intenciones en consecuencia. Eso demuestra comprensión de la tarea.

2. La tesis no solo nombra un tema (la mentira, la confesión) sino que identifica una decisión formal concreta en cada obra: la forma epistolar con perspectiva limitada en Unamuno, y el discurso indirecto libre en Dostoievski. Eso permite analizar cómo el contenido y la forma trabajan juntos.

3. El asunto global exige comparación real: no se puede hablar solo de una obra para ilustrarlo. Eso garantiza que el oral tenga foco y equilibrio.`,
  },
  {
    tipo: "debil",
    etiqueta: "Introducción débil · errores habituales",
    contexto: {
      tipoOral: "Sin especificar",
      asuntoGlobal: "La identidad",
      obra1: "Don Quijote de la Mancha — Miguel de Cervantes",
      obra2: "La casa de Bernarda Alba — Federico García Lorca",
    },
    texto: `En este oral voy a hablar sobre la identidad. He elegido Don Quijote de la Mancha de Miguel de Cervantes y también La casa de Bernarda Alba de García Lorca porque son dos obras muy importantes de la literatura española. Estas dos obras tienen cosas en común y también diferencias.

El asunto global que he elegido es la identidad, que es un tema muy importante hoy en día y que afecta a todo el mundo.

El texto que he elegido de Don Quijote es el primer capítulo, donde don Quijote decide hacerse caballero. Y de La casa de Bernarda Alba he elegido la escena en que Adela se rebela contra su madre.

Creo que en las dos obras el asunto global aparece porque los personajes tienen problemas para saber quiénes son. Don Quijote no sabe si es un caballero de verdad o no, y Adela tampoco sabe cómo comportarse en su familia.`,
    comentario: `Esta introducción tiene cuatro problemas graves:

1. El asunto global es demasiado amplio. "La identidad" sin especificar no guía el análisis: ¿qué aspecto de la identidad? ¿en qué contexto? ¿qué tensión crea? Todo texto literario habla de identidad de alguna forma.

2. Ambas obras son originales en español. El oral de Literatura A exige una obra originalmente en la lengua estudiada y una obra estudiada en traducción. Este oral no cumple ese requisito, y la introducción no lo menciona.

3. Los extractos no están identificados con precisión. "El primer capítulo" y "la escena en que Adela se rebela" no ubican fragmentos concretos. El examinador no sabe qué pasaje va a analizarse.

4. No hay tesis. "Tienen problemas para saber quiénes son" describe el argumento pero no propone ninguna interpretación sobre cómo la forma construye ese problema. El análisis anunciado es temático puro, sin referencia a decisiones autorales.`,
  },
];

export type BloqueHorario = {
  tiempo: string;
  descripcion: string;
  nota?: string;
};

export type EstructuraOral = {
  tipo: "taught" | "self_taught";
  etiqueta: string;
  totalMin: number;
  exposicionMin: number;
  preguntasMin?: number;
  bloques: BloqueHorario[];
  consejosPostExposicion?: string[];
};

export const ESTRUCTURAS_ORAL: EstructuraOral[] = [
  {
    tipo: "taught",
    etiqueta: "Alumno con profesor",
    totalMin: 15,
    exposicionMin: 10,
    preguntasMin: 5,
    bloques: [
      {
        tiempo: "0:00 – 1:00",
        descripcion:
          "Introducción: presenta el asunto global, las dos obras, los dos extractos y tu tesis o línea de lectura. Incluye un mapa breve de la estructura.",
        nota: "1 minuto. Sé preciso y conciso. El examinador necesita orientarse antes de que empiece el análisis.",
      },
      {
        tiempo: "1:00 – 3:00",
        descripcion:
          "Extracto 1: analiza las decisiones de contenido y forma que construyen el asunto global en este fragmento concreto.",
        nota: "2 minutos. No resumos el extracto: analiza. ¿Qué elige el autor y por qué? ¿Qué efecto tiene sobre el asunto global?",
      },
      {
        tiempo: "3:00 – 4:30",
        descripcion:
          "Obra 1 completa: muestra cómo el asunto global se desarrolla más allá del extracto, usando referencia a otros momentos de la obra.",
        nota: "1,5 minutos. No recites la trama: selecciona dos o tres momentos clave que amplíen lo que ya has analizado en el extracto.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Extracto 2: analiza las decisiones de contenido y forma que construyen el asunto global en el segundo fragmento.",
        nota: "2 minutos. Mismo nivel de análisis que el extracto 1. Si ya has establecido el patrón con la obra 1, puedes usar la obra 2 para contrastar o profundizar.",
      },
      {
        tiempo: "6:30 – 8:00",
        descripcion:
          "Obra 2 completa: muestra cómo el asunto global se desarrolla en el conjunto de la obra, más allá del extracto.",
        nota: "1,5 minutos. Igual que con la obra 1: selecciona, no recites.",
      },
      {
        tiempo: "8:00 – 9:30",
        descripcion:
          "Síntesis: conecta las dos obras a través del asunto global. No es Prueba 2: no compares las obras entre sí de forma mecánica. Muestra cómo cada obra construye una perspectiva sobre el asunto global.",
        nota: "1,5 minutos. Esta es la parte más difícil. La síntesis debe avanzar la tesis, no repetir lo ya dicho.",
      },
      {
        tiempo: "9:30 – 10:00",
        descripcion:
          "Cierre: responde directamente al asunto global. ¿Qué concluye tu análisis sobre cómo ese asunto se presenta mediante el contenido y la forma en estas obras?",
        nota: "30 segundos. Breve y rotundo. Vuelve a la tesis y muestra que el análisis la ha sostenido.",
      },
    ],
    consejosPostExposicion: [
      "El profesor preguntará para profundizar en lo que has dicho, no para atraparte. Usa las preguntas para mostrar más conocimiento, no para defender lo que ya dijiste.",
      "Si una pregunta señala una laguna en tu análisis (obra que no has mencionado suficientemente, recurso que no has analizado), agrádecela: tienes 5 minutos para completar esa dimensión del oral.",
      "Cuando no sepas responder con certeza, ancla tu respuesta en el texto: 'En el extracto que he trabajado, el autor elige…' es siempre mejor que especular.",
      "Vuelve siempre al asunto global. Sea cual sea la pregunta del profesor, el final de tu respuesta debe conectar con el eje del oral.",
      "No repitas frases enteras de la exposición. Las preguntas son para ampliar, matizar o corregir, no para reproducir.",
    ],
  },
  {
    tipo: "self_taught",
    etiqueta: "Self-taught / SSST",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 1:30",
        descripcion:
          "Introducción: presenta el asunto global, las dos obras, los dos extractos, tu tesis y un mapa detallado de la estructura.",
        nota: "1,5 minutos. Más tiempo que en la modalidad taught porque aquí no habrá preguntas para aclarar. El examinador debe entender el proyecto del oral desde el principio.",
      },
      {
        tiempo: "1:30 – 4:00",
        descripcion:
          "Extracto 1: análisis detallado de las decisiones de contenido y forma que construyen el asunto global en este fragmento.",
        nota: "2,5 minutos. Más profundidad que en la modalidad taught, porque no habrá preguntas para explorar lo que dejes sin desarrollar.",
      },
      {
        tiempo: "4:00 – 6:00",
        descripcion:
          "Obra 1 completa: desarrolla cómo el asunto global se presenta a lo largo de la obra, más allá del extracto.",
        nota: "2 minutos. Selecciona dos o tres momentos o rasgos formales de la obra que amplíen y complejicen lo que has analizado en el extracto.",
      },
      {
        tiempo: "6:00 – 8:30",
        descripcion:
          "Extracto 2: análisis detallado del segundo fragmento con el mismo nivel de profundidad que el primero.",
        nota: "2,5 minutos. En esta modalidad el análisis de cada extracto debe ser autosuficiente: no puedes depender de que el profesor te pida más.",
      },
      {
        tiempo: "8:30 – 10:30",
        descripcion:
          "Obra 2 completa: desarrolla cómo el asunto global se presenta en el conjunto de la segunda obra.",
        nota: "2 minutos. Mismo nivel de detalle que con la obra 1.",
      },
      {
        tiempo: "10:30 – 13:30",
        descripcion:
          "Síntesis extendida: conecta las dos obras a través del asunto global. Muestra cómo cada una construye una perspectiva distinta o complementaria. Matiza, contrasta o profundiza.",
        nota: "3 minutos. Esta síntesis es más larga que en la modalidad taught porque aquí integra lo que en la otra modalidad el alumno podría haber completado en las preguntas del profesor.",
      },
      {
        tiempo: "13:30 – 15:00",
        descripcion:
          "Cierre completo: responde al asunto global con una conclusión matizada y autosuficiente. No necesitas que nadie te pregunte más.",
        nota: "1,5 minutos. El cierre del oral self-taught debe ser más completo que el de la modalidad taught. No puede quedar ninguna laguna evidente sin abordar.",
      },
    ],
  },
];
