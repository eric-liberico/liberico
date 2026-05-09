export type EjemploAsuntoGlobal = {
  texto: string;
  importancia: string;
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

const CAMPOS_INDAGACION_ES: CampoIndagacion[] = [
  {
    key: "cultura",
    nombre: "Cultura, identidad y comunidad",
    buenos: [
      {
        texto: "La presión de la comunidad puede hacer que una persona oculte quién es.",
        importancia:
          "Permite analizar cómo los personajes cambian su voz, sus decisiones o su comportamiento para encajar.",
      },
      {
        texto: "Las normas culturales pueden limitar lo que una mujer puede hacer, decir o desear.",
        importancia:
          "Ayuda a estudiar cómo la desigualdad aparece en espacios cotidianos como la casa, la familia o la reputación.",
      },
      {
        texto:
          "Una persona migrante puede sentirse dividida entre la cultura que hereda y la vida que quiere construir.",
        importancia:
          "Conecta una experiencia personal con preguntas globales sobre pertenencia, lengua y memoria.",
      },
      {
        texto: "El silencio dentro de una familia puede mantener normas injustas.",
        importancia:
          "Sirve para analizar no solo lo que los personajes dicen, sino también lo que callan y por qué.",
      },
      {
        texto: "Recordar el pasado puede proteger una identidad, pero también puede deformarla.",
        importancia:
          "Da una forma accesible de hablar de memoria, nostalgia y comunidades que han cambiado o se sienten amenazadas.",
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
        texto: "Una persona puede chocar con los valores que su familia le ha enseñado.",
        importancia:
          "Permite explicar cómo un personaje empieza a pensar por sí mismo y qué precio paga por hacerlo.",
      },
      {
        texto:
          "La educación puede usarse para enseñar, pero también para controlar lo que la gente piensa.",
        importancia:
          "Es útil para analizar escuelas, discursos, normas sociales o figuras de autoridad que moldean la mente de los personajes.",
      },
      {
        texto: "La culpa aparece cuando una persona actúa contra lo que cree correcto.",
        importancia:
          "Ayuda a estudiar conflictos internos, monólogos, confesiones y decisiones que cambian la vida del personaje.",
      },
      {
        texto: "Las creencias de una generación pueden limitar la libertad de la siguiente.",
        importancia:
          "Conecta familia, educación y poder, y permite ver cómo una obra representa el cambio o la repetición.",
      },
      {
        texto: "Una persona puede esconder la verdad para proteger a otros.",
        importancia:
          "Plantea una pregunta clara y debatible: cuándo una mentira parece necesaria y qué daño produce.",
      },
    ],
    debiles: [
      {
        texto: "La religión",
        razon:
          "Demasiado amplio: no define qué aspecto de la religión ni qué tensión crea para los personajes o su mundo.",
      },
      {
        texto: "Los valores",
        razon:
          "Abstracto e ilimitado: todos los textos tratan valores de alguna forma; sin especificar no hay foco analítico.",
      },
      {
        texto: "La educación",
        razon:
          "La educación como campo no plantea por sí sola un problema debatible; necesita precisar qué conflicto o tensión crea.",
      },
    ],
    porQueFuncionan:
      "Un buen asunto global sobre creencias y valores nombra una tensión concreta entre fuerzas que el texto pone en conflicto: familia frente a individuo, deber frente a deseo, fe frente a duda. Esa tensión debe ser el eje del análisis, no el fondo.",
  },
  {
    key: "politica",
    nombre: "Política, poder y justicia",
    buenos: [
      {
        texto: "Un sistema de poder puede tratar a las personas como objetos o funciones.",
        importancia:
          "Permite analizar cómo la voz, el espacio, el cuerpo o el nombre de un personaje pueden mostrar pérdida de humanidad.",
      },
      {
        texto: "La gente común puede ayudar a mantener una injusticia aunque no sea quien manda.",
        importancia:
          "Sirve para estudiar personajes secundarios, silencios colectivos y comunidades que aceptan reglas injustas.",
      },
      {
        texto: "El lenguaje y el silencio pueden servir tanto para dominar como para resistir.",
        importancia:
          "Da mucho juego para analizar diálogos, órdenes, rumores, censura, ironía o voces narrativas.",
      },
      {
        texto: "Las personas más vulnerables pueden quedar excluidas por leyes o normas sociales.",
        importancia:
          "Ayuda a explicar quién tiene poder en la obra, quién no lo tiene y cómo se representa esa desigualdad.",
      },
      {
        texto: "La violencia política puede afectar a más de una generación.",
        importancia:
          "Permite conectar escenas personales con heridas colectivas, memoria histórica y miedo social.",
      },
    ],
    debiles: [
      {
        texto: "El poder",
        razon:
          "No define qué aspecto del poder: político, familiar, económico o simbólico. Sin esa precisión, el oral no tendrá foco.",
      },
      {
        texto: "La guerra",
        razon:
          "Descriptivo: la guerra puede ser contexto, pero no eje analítico si no se formula qué problema se examina dentro de ese contexto.",
      },
      {
        texto: "La injusticia",
        razon:
          "Abstracto: casi todas las obras tratan alguna forma de injusticia; hay que precisar de qué tipo, contra quién y mediante qué mecanismos.",
      },
    ],
    porQueFuncionan:
      "Los buenos asuntos de este campo nombran el mecanismo del poder y señalan quién lo ejerce o quién lo sufre. Así el análisis puede centrarse en decisiones formales concretas: quién habla, quién calla, qué espacio ocupa.",
  },
  {
    key: "arte",
    nombre: "Arte, creatividad e imaginación",
    buenos: [
      {
        texto:
          "Crear arte puede ser una forma de resistir o sobrevivir cuando una persona está oprimida.",
        importancia:
          "Permite analizar poemas, relatos, canciones, imágenes o actos creativos como respuesta al dolor o al control.",
      },
      {
        texto:
          "Una persona creativa puede entrar en conflicto con lo que su familia o sociedad espera de ella.",
        importancia:
          "Ayuda a estudiar deseo, vocación, deber y presión social sin quedarse en un tema demasiado general.",
      },
      {
        texto: "La imaginación puede ser refugio, trampa o forma de cambiar la realidad.",
        importancia:
          "Funciona bien cuando la obra mezcla fantasía, memoria, sueño o invención con una realidad difícil.",
      },
      {
        texto: "El arte puede expresar lo que los personajes no se atreven a decir directamente.",
        importancia:
          "Da una vía clara para conectar forma y contenido: símbolos, imágenes, ritmo, escena o voz.",
      },
    ],
    debiles: [
      {
        texto: "El arte",
        razon:
          "Es un campo de indagación, no un asunto global: no plantea ningún problema concreto ni tensión analizables.",
      },
      {
        texto: "La creatividad humana",
        razon:
          "Demasiado general: no define en qué contexto aparece, qué conflicto crea ni qué está en juego para los personajes.",
      },
      {
        texto: "La imaginación",
        razon:
          "Sin contexto ni tensión: necesita especificar su función en relación con algo para servir como eje analítico.",
      },
    ],
    porQueFuncionan:
      "Los mejores asuntos de este campo conectan la creación con algo que está en riesgo: una identidad amenazada, una represión que se evita o un dolor que no encuentra otro canal. Eso da dirección concreta al análisis formal.",
  },
  {
    key: "ciencia",
    nombre: "Ciencia, tecnología y medio ambiente",
    buenos: [
      {
        texto: "El progreso puede separar al ser humano de la naturaleza.",
        importancia:
          "Permite analizar paisajes, ciudades, máquinas o espacios como señales de una relación dañada con el entorno.",
      },
      {
        texto: "El desarrollo científico o industrial puede romper vínculos de comunidad.",
        importancia:
          "Ayuda a mostrar que el progreso no siempre mejora la vida de todos y puede producir aislamiento.",
      },
      {
        texto: "El cuerpo puede convertirse en algo que otros intentan controlar.",
        importancia:
          "Sirve para estudiar enfermedad, vigilancia, normas sociales, medicina o poder sobre la identidad física.",
      },
      {
        texto: "Un paisaje destruido o transformado puede reflejar un conflicto humano.",
        importancia:
          "Conecta descripciones de la naturaleza con emociones, poder, pérdida o cambio social.",
      },
    ],
    debiles: [
      {
        texto: "El medio ambiente",
        razon:
          "Descriptivo: no define qué problema plantea el entorno ni qué tensión crea para los personajes o la sociedad representada.",
      },
      {
        texto: "La tecnología y el mundo moderno",
        razon:
          "Demasiado amplio y vago: no permite un análisis enfocado porque no indica qué aspecto de la tecnología ni qué efecto produce.",
      },
      {
        texto: "La ciencia",
        razon:
          "Es un campo de conocimiento, no un asunto: sin precisar qué conflicto crea en el texto, no guía el análisis.",
      },
    ],
    porQueFuncionan:
      "Los buenos asuntos de este campo funcionan cuando el texto usa el entorno natural o tecnológico como espejo de conflictos humanos. El asunto global debe nombrar esa relación y la tensión que crea.",
  },
];

const CAMPOS_INDAGACION_EN: CampoIndagacion[] = [
  {
    key: "cultura",
    nombre: "Culture, identity and community",
    buenos: [
      {
        texto: "Community pressure can make a person hide who they are.",
        importancia:
          "This lets you analyse how characters change their voice, choices, or behaviour in order to belong.",
      },
      {
        texto: "Cultural norms can limit what a woman is allowed to do, say, or desire.",
        importancia:
          "It helps you analyse inequality in everyday spaces such as the home, family, or public reputation.",
      },
      {
        texto:
          "A migrant or displaced person may feel divided between inherited culture and the life they want to build.",
        importancia:
          "It connects personal experience with global questions about belonging, language, and memory.",
      },
      {
        texto: "Silence inside a family or community can keep unfair norms in place.",
        importancia:
          "It lets you study not only what characters say, but also what they avoid saying and why.",
      },
      {
        texto: "Remembering the past can protect identity, but it can also distort it.",
        importancia:
          "It gives you an accessible way to discuss memory, nostalgia, and communities under pressure.",
      },
    ],
    debiles: [
      {
        texto: "Identity",
        razon:
          "Too broad: any work can be connected to identity. It does not indicate which aspect, in what context, or what tension is at stake.",
      },
      {
        texto: "Cultural traditions",
        razon:
          "Descriptive, not debatable: it does not create a tension or connect the issue with a problem the works might illuminate.",
      },
      {
        texto: "Community",
        razon:
          "It is a concept, not a global issue: it does not define what is problematic, relevant, or debatable about community.",
      },
    ],
    porQueFuncionan:
      "Good global issues name a concrete problem, place characters in a real tension, and are broad enough to appear in works from very different cultural contexts. They are debatable: someone could disagree about how that problem is presented.",
  },
  {
    key: "creencias",
    nombre: "Beliefs, values and education",
    buenos: [
      {
        texto: "A person may clash with the values their family has taught them.",
        importancia:
          "This helps you explain how a character begins to think independently and what that independence costs.",
      },
      {
        texto: "Education can teach people, but it can also control how they think.",
        importancia:
          "It works well for analysing schools, speeches, social rules, or authority figures that shape characters' minds.",
      },
      {
        texto: "Guilt appears when a person acts against what they believe is right.",
        importancia:
          "It helps you study inner conflict, monologues, confessions, and decisions that change a character's life.",
      },
      {
        texto: "One generation's beliefs can limit the freedom of the next.",
        importancia:
          "It connects family, education, and power, and helps you see whether a work presents change or repetition.",
      },
      {
        texto: "A person may hide the truth in order to protect others.",
        importancia:
          "It creates a clear debate: when a lie seems necessary, and what damage it produces.",
      },
    ],
    debiles: [
      {
        texto: "Religion",
        razon:
          "Too broad: it does not define which aspect of religion or what tension it creates for characters or their world.",
      },
      {
        texto: "Values",
        razon:
          "Abstract and boundless: all texts deal with values in some form; without specifying, no analytical focus is possible.",
      },
      {
        texto: "Education",
        razon:
          "Education as a field does not pose a debatable problem on its own; it needs to specify what problem or tension it creates.",
      },
    ],
    porQueFuncionan:
      "A good global issue about beliefs and values names a specific tension between forces the text puts in conflict: family vs. individual, duty vs. desire, faith vs. doubt. That tension must be the axis of analysis, not the background.",
  },
  {
    key: "politica",
    nombre: "Politics, power and justice",
    buenos: [
      {
        texto: "A system of power can treat people as objects or functions.",
        importancia:
          "This lets you analyse how voice, space, the body, or even a character's name can show loss of humanity.",
      },
      {
        texto: "Ordinary people can help maintain injustice even when they are not in charge.",
        importancia:
          "It works for secondary characters, collective silence, and communities that accept unfair rules.",
      },
      {
        texto: "Language and silence can be used both to dominate and to resist.",
        importancia:
          "It gives you strong material for dialogue, orders, rumours, censorship, irony, or narrative voice.",
      },
      {
        texto: "Vulnerable people can be excluded by laws or social rules.",
        importancia:
          "It helps you explain who has power in the work, who does not, and how that inequality is represented.",
      },
      {
        texto: "Political violence can affect more than one generation.",
        importancia:
          "It connects personal scenes with collective wounds, historical memory, and social fear.",
      },
    ],
    debiles: [
      {
        texto: "Power",
        razon:
          "It does not define which aspect of power: political, family, economic, symbolic. Without specifying, the oral will have no analytical focus.",
      },
      {
        texto: "War",
        razon:
          "Descriptive: war can function as context for the works, but not as an analytical axis, because it does not pose what is examined within that context.",
      },
      {
        texto: "Injustice",
        razon:
          "Abstract: almost all literary works deal with injustice in some form; without specifying what kind, toward whom, and through what mechanisms, it does not guide analysis.",
      },
    ],
    porQueFuncionan:
      "Good issues in this field name the mechanism of power (dehumanization, complicity, language as control) and point out who suffers it or exercises it. This allows analysis of concrete formal choices: who speaks, who stays silent, what space she occupies.",
  },
  {
    key: "arte",
    nombre: "Art, creativity and imagination",
    buenos: [
      {
        texto: "Creating art can be a way to resist or survive oppression.",
        importancia:
          "It lets you analyse poems, stories, songs, images, or creative acts as responses to pain or control.",
      },
      {
        texto: "A creative person may conflict with what family or society expects from them.",
        importancia:
          "It helps you discuss desire, vocation, duty, and social pressure without becoming too general.",
      },
      {
        texto: "Imagination can be a refuge, a trap, or a way to transform reality.",
        importancia:
          "It works well when a text mixes fantasy, memory, dream, or invention with a difficult reality.",
      },
      {
        texto: "Art can express what characters cannot say directly.",
        importancia:
          "It gives you a clear way to connect form and content: symbols, images, rhythm, scene, or voice.",
      },
    ],
    debiles: [
      {
        texto: "Art",
        razon:
          "It is a field of inquiry, not a global issue: it does not pose any concrete problem or any analyzable tension.",
      },
      {
        texto: "Human creativity",
        razon:
          "Too general: it does not define in what context it appears, what conflict it creates, or what is at stake for the characters.",
      },
      {
        texto: "Imagination",
        razon:
          "Without context or tension: it needs to specify its function in relation to something (power, oppression, truth, escape) to work as an analytical axis.",
      },
    ],
    porQueFuncionan:
      "The best global issues in this field connect creation with something at risk: a threatened identity, a repression to be avoided, a pain that finds no other channel. This gives formal analysis a concrete direction.",
  },
  {
    key: "ciencia",
    nombre: "Science, technology and environment",
    buenos: [
      {
        texto: "Progress can separate human beings from nature.",
        importancia:
          "It lets you analyse landscapes, cities, machines, or settings as signs of a damaged relationship with the environment.",
      },
      {
        texto: "Scientific or industrial development can break community bonds.",
        importancia:
          "It helps you show that progress does not always improve life for everyone and can produce isolation.",
      },
      {
        texto: "The body can become something that other people or institutions try to control.",
        importancia:
          "It works for illness, surveillance, social rules, medicine, or power over physical identity.",
      },
      {
        texto: "A damaged or transformed landscape can reflect a human conflict.",
        importancia:
          "It connects descriptions of nature with emotion, power, loss, or social change.",
      },
    ],
    debiles: [
      {
        texto: "The environment",
        razon:
          "Descriptive: it does not define what problem the environment poses or what tension it creates for characters or society represented.",
      },
      {
        texto: "Technology and the modern world",
        razon:
          "Too broad and vague: it does not allow focused analysis because it does not indicate what aspect of technology or what effect on what.",
      },
      {
        texto: "Science",
        razon:
          "It is a field of knowledge, not an issue: without specifying what conflict science creates in the text, it does not guide analysis.",
      },
    ],
    porQueFuncionan:
      "Good issues in this field work when the literary text uses the natural or technological environment as a mirror of human conflicts. The global issue must name that relationship and the tension it creates.",
  },
];

export function getCamposIndagacion(isEN: boolean): CampoIndagacion[] {
  return isEN ? CAMPOS_INDAGACION_EN : CAMPOS_INDAGACION_ES;
}

const CAMPOS_INDAGACION = CAMPOS_INDAGACION_ES;

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

const EJEMPLOS_INTRODUCCION_ES: EjemploIntroduccion[] = [
  {
    tipo: "bueno",
    etiqueta: "Introducción buena · alumno con profesor",
    contexto: {
      tipoOral: "Alumno con profesor (10 min + 5 min de preguntas)",
      asuntoGlobal:
        "La deshumanización del individuo bajo estructuras de poder autoritarias que suprimen su subjetividad.",
      obra1: "_La casa de Bernarda Alba_ — Federico García Lorca (original en español)",
      obra2: "_La metamorfosis_ — Franz Kafka (en traducción)",
    },
    texto: `En este oral voy a explorar el asunto global de la deshumanización del individuo bajo estructuras de poder autoritarias. Lo sitúo dentro del campo "Política, poder y justicia" porque trata de cómo una autoridad puede reducir a una persona a obediencia, silencio o utilidad. Es un asunto significativo y transnacional: aparece en contextos políticos, familiares y laborales, y sigue siendo relevante allí donde una institución decide cuánto vale una vida humana.

Mis obras son _La casa de Bernarda Alba_, drama de Federico García Lorca escrito en España en 1936 y originalmente en español, y _La metamorfosis_, novela corta de Franz Kafka publicada en 1915 en el contexto centroeuropeo y estudiada en traducción. El primer extracto corresponde al inicio del primer acto de _La casa de Bernarda Alba_, cuando Bernarda impone el luto y la reclusión. El segundo es el párrafo inicial de _La metamorfosis_, cuando Gregorio Samsa despierta convertido en insecto y aun así piensa en su obligación laboral.

Mi tesis es que Lorca y Kafka convierten el espacio cerrado en una forma visible de deshumanización: en Lorca, la casa funciona como extensión del poder patriarcal que borra la voz de las hijas; en Kafka, la habitación muestra cómo la lógica del trabajo reduce a Gregorio a su utilidad. Seguiré una estructura de zoom in y zoom out: primero analizaré el extracto y la obra completa de Lorca, después el extracto y la obra completa de Kafka, y terminaré comparando cómo ambas obras presentan el mismo asunto global de manera distinta.`,
    comentario: `Este introducción funciona por cuatro razones:

1. Define el asunto global, el campo de indagación y por qué importa antes de entrar en las obras.

2. Identifica las obras con título en cursiva, autor, género, fecha/contexto y estado lingüístico.

3. Localiza los extractos con precisión y justifica por qué sirven para el asunto global.

4. La tesis conecta forma y contenido: el espacio cerrado no es un detalle decorativo, sino el mecanismo que presenta la deshumanización.

El mapa final prepara al examinador para una estructura clara de zoom in / zoom out y para una síntesis comparativa breve.`,
  },
  {
    tipo: "bueno",
    etiqueta: "Introducción buena · aprendizaje autodidacta con apoyo del colegio",
    contexto: {
      tipoOral:
        "aprendizaje autodidacta con apoyo del colegio (15 min de exposición continua, sin preguntas del profesor)",
      asuntoGlobal:
        "El conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él.",
      obra1: "_San Manuel Bueno, mártir_ — Miguel de Unamuno (original en español)",
      obra2: "_Crimen y castigo_ — Fiódor Dostoievski (en traducción)",
    },
    texto: `Este oral explora el asunto global del conflicto entre la verdad privada y la mentira pública. Lo sitúo en el campo "Creencias, valores y educación" porque examina qué ocurre cuando una persona conoce una verdad dolorosa, pero decide ocultarla para proteger a una comunidad o a quienes dependen de ella. Es importante porque no pertenece a un solo país o época: aparece cuando la religión, la familia, la política o la culpa obligan a elegir entre honestidad y protección.

Las obras son _San Manuel Bueno, mártir_, novela corta de Miguel de Unamuno publicada en España en 1931 y originalmente en español, y _Crimen y castigo_, novela de Fiódor Dostoievski publicada en Rusia en 1866 y estudiada en traducción. El primer extracto procede del momento en que Manuel le confiesa a Lázaro su falta de fe; el segundo corresponde al interrogatorio en que Raskolnikov empieza a derrumbarse ante Porfiri.

Mi tesis es que ambas obras presentan la verdad como algo que no aparece de forma directa, sino filtrada por silencios, confesiones parciales y voces narrativas inestables. En _San Manuel_, la forma testimonial de Ángela mantiene la duda sobre si Manuel miente por amor o por debilidad; en _Crimen y castigo_, el discurso indirecto libre muestra una conciencia que intenta esconderse incluso cuando se está delatando.

Como esta modalidad no incluye preguntas del profesor, integraré dentro de los quince minutos el zoom in sobre cada extracto, el zoom out hacia la obra completa y una síntesis final más desarrollada sobre cómo las dos obras convierten la mentira en un dilema moral.`,
    comentario: `Esta introducción es adecuada para la modalidad de aprendizaje autodidacta con apoyo del colegio por tres razones específicas:

1. La introducción explica el asunto global y por qué importa antes de presentar los textos.

2. Cada obra queda contextualizada con género, autor, fecha, país/contexto y estado lingüístico.

3. La tesis identifica decisiones formales concretas: testimonio, confesión, perspectiva limitada y discurso indirecto libre.

4. La última frase adapta la estructura al formato autodidacta: no habrá preguntas, así que la síntesis debe estar completa dentro de la exposición.`,
  },
  {
    tipo: "debil",
    etiqueta: "Introducción débil · errores habituales",
    contexto: {
      tipoOral: "Sin especificar",
      asuntoGlobal: "La identidad",
      obra1: "_Don Quijote de la Mancha_ — Miguel de Cervantes",
      obra2: "_La casa de Bernarda Alba_ — Federico García Lorca",
    },
    texto: `En este oral voy a hablar sobre la identidad. He elegido _Don Quijote de la Mancha_ de Miguel de Cervantes y también _La casa de Bernarda Alba_ de García Lorca porque son dos obras muy importantes de la literatura española. Estas dos obras tienen cosas en común y también diferencias.

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

const EJEMPLOS_INTRODUCCION_EN: EjemploIntroduccion[] = [
  {
    tipo: "bueno",
    etiqueta: "Good introduction · taught student",
    contexto: {
      tipoOral: "Taught student (10 min + 5 min of teacher questions)",
      asuntoGlobal:
        "The dehumanization of the individual under authoritarian power structures that suppress his subjectivity.",
      obra1: "_The House of Bernarda Alba_ — Federico García Lorca (originally written in Spanish)",
      obra2: "_The Metamorphosis_ — Franz Kafka (in translation)",
    },
    texto: `In this oral, I will explore the global issue of the dehumanization of the individual under authoritarian power structures. I place it in the field of "Politics, power and justice" because it asks how authority can reduce a person to obedience, silence, or usefulness. This issue is significant and transnational: it appears in political, family, and work contexts, and remains relevant wherever an institution decides how much a human life is worth.

My works are _The House of Bernarda Alba_, a play by Federico García Lorca written in Spain in 1936 and originally in Spanish, and _The Metamorphosis_, a novella by Franz Kafka published in 1915 in a Central European context and studied in translation. The first extract is the opening of Act One of _The House of Bernarda Alba_, when Bernarda imposes mourning and confinement. The second is the opening paragraph of _The Metamorphosis_, when Gregor Samsa wakes up as an insect and still thinks about his obligation to work.

My thesis is that Lorca and Kafka turn enclosed space into a visible form of dehumanization: in Lorca, the house becomes an extension of patriarchal power that erases the daughters' voices; in Kafka, the room shows how the logic of work reduces Gregor to his usefulness. I will follow a zoom in and zoom out structure: first the extract and whole work by Lorca, then the extract and whole work by Kafka, and finally a comparison of how both works present the same global issue differently.`,
    comentario: `This introduction works for four reasons:

1. It defines the global issue, field of inquiry, and why the issue matters before moving into the works.

2. It identifies the works with italicised titles, author, genre, date/context, and linguistic status.

3. It locates both extracts precisely and explains why they are useful for the global issue.

4. The thesis connects form and content: enclosed space is not decorative, but the mechanism that presents dehumanization.

The final map prepares the examiner for a clear zoom in / zoom out structure and a brief comparative synthesis.`,
  },
  {
    tipo: "bueno",
    etiqueta: "Good introduction · school-supported self-taught",
    contexto: {
      tipoOral:
        "school-supported self-taught (15 min of continuous presentation, no teacher questions)",
      asuntoGlobal:
        "The conflict between the truth the individual knows and the public lie she assumes to protect those who depend on her.",
      obra1: "_San Manuel Bueno, mártir_ — Miguel de Unamuno (originally written in Spanish)",
      obra2: "_Crime and Punishment_ — Fyodor Dostoevsky (in translation)",
    },
    texto: `This oral explores the global issue of the conflict between private truth and public lies. I place it in the field of "Beliefs, values and education" because it examines what happens when a person knows a painful truth but hides it to protect a community or those who depend on them. It matters because it is not limited to one country or period: religion, family, politics, and guilt can all force people to choose between honesty and protection.

The works are _San Manuel Bueno, mártir_, a novella by Miguel de Unamuno published in Spain in 1931 and originally in Spanish, and _Crime and Punishment_, a novel by Fyodor Dostoevsky published in Russia in 1866 and studied in translation. The first extract comes from the moment when Manuel confesses his lack of faith to Lázaro; the second is the interrogation in which Raskolnikov begins to break down before Porfiry.

My thesis is that both works present truth as something that does not appear directly, but is filtered through silence, partial confession, and unstable narrative voices. In _San Manuel_, Ángela's testimonial perspective preserves uncertainty about whether Manuel lies out of love or weakness; in _Crime and Punishment_, free indirect discourse reveals a mind that tries to hide even while exposing itself.

Because this format has no teacher questions, I will integrate into the fifteen minutes the zoom in on each extract, the zoom out to each whole work, and a fuller final synthesis on how both works turn lying into a moral dilemma.`,
    comentario: `This introduction is appropriate for the school-supported self-taught modality for three specific reasons:

1. The introduction explains the global issue and why it matters before presenting the texts.

2. Each work is contextualised with genre, author, date, country/context, and linguistic status.

3. The thesis identifies concrete formal choices: testimony, confession, limited perspective, and free indirect discourse.

4. The last sentence adapts the structure to the self-taught format: there are no questions, so the synthesis must be complete inside the presentation.`,
  },
  {
    tipo: "debil",
    etiqueta: "Weak introduction · common mistakes",
    contexto: {
      tipoOral: "Not specified",
      asuntoGlobal: "Identity",
      obra1: "_Don Quixote_ — Miguel de Cervantes",
      obra2: "_The House of Bernarda Alba_ — Federico García Lorca",
    },
    texto: `In this oral I am going to talk about identity. I have chosen _Don Quixote_ by Miguel de Cervantes and also _The House of Bernarda Alba_ by García Lorca because they are two very important works of Spanish literature. These two works have things in common and also differences.

The global issue I have chosen is identity, which is a very important theme today and which affects everyone.

The text I have chosen from Don Quixote is the first chapter, where Don Quixote decides to become a knight. And from The House of Bernarda Alba I have chosen the scene in which Adela rebels against her mother.

I think that in both works the global issue appears because the characters have problems knowing who they are. Don Quixote does not know if he is a real knight or not, and Adela does not know how to behave in her family.`,
    comentario: `This introduction has four serious problems:

1. The global issue is too broad. "Identity" without specifying does not guide the analysis: which aspect of identity? In what context? What tension does it create? Every literary text talks about identity in some form.

2. Both works are originally written in Spanish. The Language A: Literature oral requires one work originally written in the studied language and one work studied in translation. This oral does not meet that requirement, and the introduction does not mention it.

3. The extracts are not identified with precision. "The first chapter" and "the scene in which Adela rebels" do not locate specific passages. The examiner does not know what excerpt will be analyzed.

4. There is no thesis. "Have problems knowing who they are" describes the plot but proposes no interpretation of how form constructs that problem. The announced analysis is pure thematic, without reference to authorial choices.`,
  },
];

export function getEjemplosIntroduccion(isEN: boolean): EjemploIntroduccion[] {
  return isEN ? EJEMPLOS_INTRODUCCION_EN : EJEMPLOS_INTRODUCCION_ES;
}

const EJEMPLOS_INTRODUCCION = EJEMPLOS_INTRODUCCION_ES;

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

const ESTRUCTURAS_ORAL_ES: EstructuraOral[] = [
  {
    tipo: "taught",
    etiqueta: "Alumno con profesor",
    totalMin: 15,
    exposicionMin: 10,
    preguntasMin: 5,
    bloques: [
      {
        tiempo: "0:00 – 1:30",
        descripcion:
          "Introducción: define el asunto global, di por qué es significativo, transnacional y relevante en contextos locales, presenta las obras y anuncia tu tesis.",
        nota: "Inspirado en la checklist: el examinador debe entender el asunto global, el campo de indagación, las obras y la ruta del oral antes del análisis.",
      },
      {
        tiempo: "1:30 – 3:30",
        descripcion:
          "Zoom in · Extracto 1: analiza 2-3 decisiones de contenido y forma que presentan el asunto global en el pasaje.",
        nota: "Elige tus batallas: imagen, símbolo, voz, diálogo, espacio, ritmo o estructura. No intentes explicarlo todo.",
      },
      {
        tiempo: "3:30 – 5:00",
        descripcion:
          "Zoom out · Obra 1: conecta el extracto con la obra completa mediante momentos, patrones o decisiones autorales relevantes.",
        nota: "Muestra conocimiento de la obra sin resumirla. Vuelve siempre al asunto global.",
      },
      {
        tiempo: "5:00 – 7:00",
        descripcion:
          "Zoom in · Extracto 2: analiza 2-3 decisiones de contenido y forma con el mismo foco en el asunto global.",
        nota: "Mantén equilibrio: no dejes el segundo texto como ejemplo rápido o apéndice.",
      },
      {
        tiempo: "7:00 – 8:30",
        descripcion:
          "Zoom out · Obra 2: muestra cómo el asunto global se desarrolla en la obra completa más allá del extracto.",
        nota: "Usa referencias concretas y vocabulario literario preciso.",
      },
      {
        tiempo: "8:30 – 10:00",
        descripcion:
          "Conclusión comparativa: responde al asunto global. ¿Las obras lo presentan de forma similar o diferente? ¿Qué consigue cada autor?",
        nota: "No repitas: sintetiza. La checklist insiste en volver a la tesis guía para asegurar coherencia.",
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
    etiqueta: "School-supported self-taught",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 2:00",
        descripcion:
          "Introducción: define el asunto global, explica por qué importa, presenta el campo de indagación, contextualiza obras y extractos, y anuncia tu tesis.",
        nota: "Sin preguntas del profesor, la introducción debe dejar claro el proyecto completo del oral.",
      },
      {
        tiempo: "2:00 – 4:30",
        descripcion:
          "Zoom in · Extracto 1: análisis detallado de recursos, estructura y efectos que presentan el asunto global.",
        nota: "Escoge 2-3 recursos clave y evalúa cómo funcionan, no solo qué son.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Zoom out · Obra 1: conecta el pasaje con la obra completa mediante momentos, patrones o decisiones autorales.",
        nota: "Demuestra conocimiento de la obra completa sin perder el foco del asunto global.",
      },
      {
        tiempo: "6:30 – 9:00",
        descripcion:
          "Zoom in · Extracto 2: análisis detallado del segundo pasaje con equilibrio y precisión terminológica.",
        nota: "Mantén el mismo nivel de profundidad que en el primer extracto.",
      },
      {
        tiempo: "9:00 – 11:00",
        descripcion:
          "Zoom out · Obra 2: muestra cómo la obra completa amplía, complica o contrasta lo visto en el extracto.",
        nota: "Usa referencias concretas; evita convertirlo en resumen de trama.",
      },
      {
        tiempo: "11:00 – 14:00",
        descripcion:
          "Síntesis extendida: compara cómo las dos obras presentan el asunto global y qué logra cada autor con sus decisiones.",
        nota: "Aquí integras lo que un alumno con profesor podría ampliar en la sección de preguntas.",
      },
      {
        tiempo: "14:00 – 15:00",
        descripcion:
          "Cierre: vuelve a la tesis y responde de forma clara qué revelan las obras sobre el asunto global.",
        nota: "Debe sentirse completo: no habrá preguntas para rescatar una idea que haya quedado fuera.",
      },
    ],
  },
];

const ESTRUCTURAS_ORAL_EN: EstructuraOral[] = [
  {
    tipo: "taught",
    etiqueta: "Taught student",
    totalMin: 15,
    exposicionMin: 10,
    preguntasMin: 5,
    bloques: [
      {
        tiempo: "0:00 – 1:30",
        descripcion:
          "Introduction: define the global issue, say why it is significant, transnational and relevant to local contexts, introduce the works and state your thesis.",
        nota: "Based on the checklist: the examiner should understand the global issue, field of inquiry, works and route of the oral before the analysis begins.",
      },
      {
        tiempo: "1:30 – 3:30",
        descripcion:
          "Zoom in · Extract 1: analyse 2-3 choices of content and form that present the global issue in the passage.",
        nota: "Pick your battles: image, symbol, voice, dialogue, setting, rhythm or structure. Do not try to explain everything.",
      },
      {
        tiempo: "3:30 – 5:00",
        descripcion:
          "Zoom out · Work 1: connect the extract to the whole work through relevant moments, patterns or authorial choices.",
        nota: "Show knowledge of the whole work without summarising it. Keep returning to the global issue.",
      },
      {
        tiempo: "5:00 – 7:00",
        descripcion:
          "Zoom in · Extract 2: analyse 2-3 choices of content and form with the same focus on the global issue.",
        nota: "Keep balance: do not treat the second text as a quick example or appendix.",
      },
      {
        tiempo: "7:00 – 8:30",
        descripcion:
          "Zoom out · Work 2: show how the global issue develops in the whole work beyond the extract.",
        nota: "Use concrete references and precise literary vocabulary.",
      },
      {
        tiempo: "8:30 – 10:00",
        descripcion:
          "Comparative conclusion: respond to the global issue. Do the works present it similarly or differently? What does each author achieve?",
        nota: "Do not repeat: synthesise. The checklist stresses returning to the guiding thesis for coherence.",
      },
    ],
    consejosPostExposicion: [
      "The teacher will ask to deepen what you have said, not to trap you. Use the questions to show more knowledge, not to defend what you have already said.",
      "If a question points out a gap in your analysis (a work you have not mentioned enough, a resource you have not analyzed), acknowledge it: you have 5 minutes to complete that dimension of the oral.",
      "When you cannot answer with certainty, anchor your answer in the text: 'In the extract I have worked on, the author chooses…' is always better than speculating.",
      "Always return to the global issue. Whatever the teacher's question, the end of your answer must connect with the axis of the oral.",
      "Do not repeat entire phrases from the presentation. Questions are meant to expand, nuance, or correct, not to reproduce.",
    ],
  },
  {
    tipo: "self_taught",
    etiqueta: "Aprendizaje autodidacta con apoyo del colegio",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 2:00",
        descripcion:
          "Introduction: define the global issue, explain why it matters, present the field of inquiry, contextualise works and extracts, and state your thesis.",
        nota: "Without teacher questions, the introduction must make the whole oral project clear.",
      },
      {
        tiempo: "2:00 – 4:30",
        descripcion:
          "Zoom in · Extract 1: detailed analysis of resources, structure and effects that present the global issue.",
        nota: "Choose 2-3 key resources and evaluate how they work, not only what they are.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Zoom out · Work 1: connect the passage with the whole work through moments, patterns or authorial choices.",
        nota: "Show knowledge of the whole work without losing focus on the global issue.",
      },
      {
        tiempo: "6:30 – 9:00",
        descripcion:
          "Zoom in · Extract 2: detailed analysis of the second passage with balance and precise terminology.",
        nota: "Maintain the same level of depth as in the first extract.",
      },
      {
        tiempo: "9:00 – 11:00",
        descripcion:
          "Zoom out · Work 2: show how the whole work extends, complicates or contrasts what appeared in the extract.",
        nota: "Use concrete references; avoid turning this into plot summary.",
      },
      {
        tiempo: "11:00 – 14:00",
        descripcion:
          "Extended synthesis: compare how both works present the global issue and what each author achieves through their choices.",
        nota: "This integrates what a taught student might develop in the teacher-question section.",
      },
      {
        tiempo: "14:00 – 15:00",
        descripcion:
          "Closing: return to the thesis and state clearly what the works reveal about the global issue.",
        nota: "It must feel complete: there are no questions to rescue an idea left outside the presentation.",
      },
    ],
  },
];

export function getEstructurasOral(isEN: boolean): EstructuraOral[] {
  return isEN ? ESTRUCTURAS_ORAL_EN : ESTRUCTURAS_ORAL_ES;
}

const ESTRUCTURAS_ORAL = ESTRUCTURAS_ORAL_ES;
