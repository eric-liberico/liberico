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
        texto: "La presión de la comunidad sobre la identidad individual.",
        importancia:
          "Funciona bien cuando una obra muestra personajes que cambian su voz, sus decisiones o su comportamiento para ser aceptados.",
      },
      {
        texto: "El control de la libertad femenina mediante normas culturales y familiares.",
        importancia:
          "Es un asunto global claro porque conecta género, cultura y poder en espacios cotidianos como la casa, la familia o la reputación.",
      },
      {
        texto: "El conflicto entre la cultura heredada y la búsqueda de una identidad propia.",
        importancia:
          "Permite hablar de pertenencia, lengua, memoria y cambio cultural sin reducir el análisis a una biografía individual.",
      },
      {
        texto: "El silencio familiar como forma de mantener normas injustas.",
        importancia:
          "Da una dirección concreta al análisis: no solo importa lo que los personajes dicen, sino lo que callan y quién se beneficia de ese silencio.",
      },
      {
        texto: "La memoria del pasado como base de la identidad colectiva.",
        importancia:
          "Sirve para analizar comunidades que intentan proteger una tradición, pero también los riesgos de idealizar o deformar el pasado.",
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
        texto: "El conflicto entre los valores familiares y la libertad individual.",
        importancia:
          "Es útil cuando un personaje empieza a pensar por sí mismo y la obra muestra el coste personal de separarse de lo aprendido.",
      },
      {
        texto: "La educación como herramienta de formación o de control ideológico.",
        importancia:
          "Encaja con escuelas, discursos, normas sociales o figuras de autoridad que moldean la mente de los personajes.",
      },
      {
        texto: "La culpa moral ante la ruptura de una creencia personal o colectiva.",
        importancia:
          "Permite analizar conflictos internos, monólogos, confesiones y decisiones que revelan qué considera correcto una sociedad.",
      },
      {
        texto: "El peso de las creencias heredadas sobre las nuevas generaciones.",
        importancia:
          "Conecta familia, educación y poder, y ayuda a explicar si una obra presenta cambio, repetición o ruptura.",
      },
      {
        texto: "El conflicto ético entre decir la verdad y proteger a otros.",
        importancia:
          "Plantea una tensión debatible: cuándo una mentira parece necesaria, qué daño evita y qué daño produce.",
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
        texto: "La deshumanización del individuo bajo sistemas de poder.",
        importancia:
          "Permite analizar cómo la voz, el espacio, el cuerpo o el nombre de un personaje muestran pérdida de humanidad.",
      },
      {
        texto: "La complicidad de la sociedad en el mantenimiento de la injusticia.",
        importancia:
          "Sirve para estudiar personajes secundarios, silencios colectivos y comunidades que aceptan reglas injustas aunque no las hayan creado.",
      },
      {
        texto: "El lenguaje y el silencio como formas de dominación y resistencia.",
        importancia:
          "Da mucho material para analizar diálogos, órdenes, rumores, censura, ironía o voces narrativas.",
      },
      {
        texto: "La exclusión de los grupos vulnerables por leyes o normas sociales.",
        importancia:
          "Ayuda a explicar quién tiene poder en la obra, quién queda fuera y cómo se representa esa desigualdad.",
      },
      {
        texto: "El impacto de la violencia política en la memoria de una comunidad.",
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
        texto: "La creación artística como forma de resistencia ante la opresión.",
        importancia:
          "Permite analizar poemas, relatos, canciones, imágenes o actos creativos como respuesta al dolor o al control.",
      },
      {
        texto: "El conflicto entre la vocación creativa y las expectativas sociales.",
        importancia:
          "Ayuda a estudiar deseo, vocación, deber y presión social sin quedarse en un tema demasiado general.",
      },
      {
        texto: "La imaginación como refugio ante una realidad opresiva.",
        importancia:
          "Funciona bien cuando la obra mezcla fantasía, memoria, sueño o invención con una realidad difícil.",
      },
      {
        texto: "El arte como lenguaje para expresar aquello que no puede decirse directamente.",
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
        texto: "La ruptura entre el ser humano y la naturaleza causada por el progreso.",
        importancia:
          "Permite analizar paisajes, ciudades, máquinas o espacios como señales de una relación dañada con el entorno.",
      },
      {
        texto: "El impacto del desarrollo industrial en los vínculos comunitarios.",
        importancia:
          "Ayuda a mostrar que el progreso no siempre mejora la vida de todos y puede producir aislamiento o desigualdad.",
      },
      {
        texto: "El control del cuerpo por instituciones científicas, médicas o sociales.",
        importancia:
          "Sirve para estudiar enfermedad, vigilancia, normas sociales, medicina o poder sobre la identidad física.",
      },
      {
        texto: "La destrucción del paisaje como reflejo de conflictos humanos.",
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
        texto: "Community pressure on individual identity.",
        importancia:
          "This works well when a text shows characters changing their voice, choices, or behaviour in order to be accepted.",
      },
      {
        texto: "The control of female freedom through cultural and family norms.",
        importancia:
          "It is a clear global issue because it connects gender, culture, and power in everyday spaces such as the home, family, or reputation.",
      },
      {
        texto: "The conflict between inherited culture and the search for personal identity.",
        importancia:
          "It lets you discuss belonging, language, memory, and cultural change without reducing the analysis to one person's biography.",
      },
      {
        texto: "Family silence as a way of maintaining unfair norms.",
        importancia:
          "It gives the analysis a clear direction: what matters is not only what characters say, but what they avoid saying and who benefits from that silence.",
      },
      {
        texto: "Memory of the past as the basis of collective identity.",
        importancia:
          "It helps you analyse communities trying to protect tradition, while also examining the risks of idealising or distorting the past.",
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
        texto: "The conflict between family values and individual freedom.",
        importancia:
          "This is useful when a character begins to think independently and the work shows the personal cost of separating from inherited values.",
      },
      {
        texto: "Education as a tool for formation or ideological control.",
        importancia:
          "It fits schools, speeches, social rules, or authority figures that shape how characters think.",
      },
      {
        texto: "Moral guilt after breaking a personal or collective belief.",
        importancia:
          "It helps you analyse inner conflict, monologues, confessions, and decisions that reveal what a society considers right.",
      },
      {
        texto: "The weight of inherited beliefs on younger generations.",
        importancia:
          "It connects family, education, and power, and helps explain whether a work presents change, repetition, or rupture.",
      },
      {
        texto: "The ethical conflict between telling the truth and protecting others.",
        importancia:
          "It creates a debatable tension: when a lie seems necessary, what damage it prevents, and what damage it causes.",
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
        texto: "The dehumanisation of the individual under systems of power.",
        importancia:
          "This lets you analyse how voice, space, the body, or even a character's name can show loss of humanity.",
      },
      {
        texto: "Society's complicity in maintaining injustice.",
        importancia:
          "It works for secondary characters, collective silence, and communities that accept unfair rules even when they did not create them.",
      },
      {
        texto: "Language and silence as forms of domination and resistance.",
        importancia:
          "It gives strong material for dialogue, orders, rumours, censorship, irony, or narrative voice.",
      },
      {
        texto: "The exclusion of vulnerable groups through laws or social rules.",
        importancia:
          "It helps you explain who has power in the work, who is excluded, and how that inequality is represented.",
      },
      {
        texto: "The impact of political violence on a community's memory.",
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
        texto: "Artistic creation as a form of resistance against oppression.",
        importancia:
          "It lets you analyse poems, stories, songs, images, or creative acts as responses to pain or control.",
      },
      {
        texto: "The conflict between creative vocation and social expectations.",
        importancia:
          "It helps you discuss desire, vocation, duty, and social pressure without becoming too general.",
      },
      {
        texto: "Imagination as a refuge from an oppressive reality.",
        importancia:
          "It works well when a text mixes fantasy, memory, dream, or invention with a difficult reality.",
      },
      {
        texto: "Art as a language for expressing what cannot be said directly.",
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
        texto: "The rupture between human beings and nature caused by progress.",
        importancia:
          "It lets you analyse landscapes, cities, machines, or settings as signs of a damaged relationship with the environment.",
      },
      {
        texto: "The impact of industrial development on community bonds.",
        importancia:
          "It helps you show that progress does not always improve life for everyone and can produce isolation or inequality.",
      },
      {
        texto: "The control of the body by scientific, medical, or social institutions.",
        importancia:
          "It works for illness, surveillance, social rules, medicine, or power over physical identity.",
      },
      {
        texto: "The destruction of landscape as a reflection of human conflict.",
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
      tipoOral: "Introducción modelo (250-300 palabras)",
      asuntoGlobal: "La incomprensión del artista en un mundo hostil.",
      obra1: '"Donde habite el olvido" — Luis Cernuda',
      obra2: '"Un artista del hambre" — Franz Kafka',
    },
    texto: `En este oral se va a tratar un asunto de relevancia global relacionado con el campo de "Arte, creatividad e imaginación"; más concretamente, lo que se va a discutir es la incomprensión del artista en un mundo hostil. Para el artista, y en este caso para el literato, la escritura no es una elección cómoda ni un pasatiempo, sino una necesidad. Muchos grandes autores han defendido que no escriben por gusto, sino porque no hacerlo supondría negar una parte fundamental de sí mismos.

Sin embargo, esa entrega del creador, dentro de un mundo que mide el valor en términos de utilidad, productividad o éxito inmediato, suele ser vista como extravagancia o rareza. Pocos comprenden que, bajo esa capa de aparente excentricidad, se libra una batalla dura entre el caos interior y la necesidad de ordenarlo con palabras. Por eso, ser artista siempre ha sido difícil: significa vivir atrapado en una grieta entre el mundo y uno mismo, lo cual convierte este asunto en un problema universal que merece ser tratado.

Para ello se han elegido dos fragmentos extraídos de dos grandes obras de la literatura. El primero es el poema "Donde habite el olvido", incluido en el poemario _La realidad y el deseo_ del poeta español Luis Cernuda, perteneciente a la Generación del 27 y publicado en 1936. El segundo extracto pertenece al cuento "Un artista del hambre", del autor checo Franz Kafka, publicado en 1922. Esta obra constituye un ejemplo perfecto del absurdo kafkiano, es decir, una escritura situada entre el existencialismo y el surrealismo más profundo.`,
    comentario: `Esta introducción funciona por cuatro razones:

1. Define el asunto global y el campo de indagación desde la primera frase.

2. La justificación es clara y madura: explica por qué la escritura puede ser necesidad, no pasatiempo.

3. Cierra la justificación con una oración de alcance universal.

4. Presenta los fragmentos, las obras y los autores sin gastar palabras en explicar qué obra está en traducción o en español.

La extensión está dentro del objetivo de 250-300 palabras y el registro es suficientemente académico sin sonar artificial.`,
  },
  {
    tipo: "bueno",
    etiqueta: "Introducción buena · aprendizaje autodidacta con apoyo del colegio",
    contexto: {
      tipoOral:
        "aprendizaje autodidacta con apoyo del colegio (15 min de exposición continua, sin preguntas del profesor)",
      asuntoGlobal:
        "El conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él.",
      obra1: "_San Manuel Bueno, mártir_ — Miguel de Unamuno",
      obra2: "_Crimen y castigo_ — Fiódor Dostoievski",
    },
    texto: `Este oral explora el asunto global del conflicto entre la verdad privada y la mentira pública. Lo sitúo en el campo "Creencias, valores y educación" porque examina qué ocurre cuando una persona conoce una verdad dolorosa, pero decide ocultarla para proteger a una comunidad o a quienes dependen de ella. Es importante porque no pertenece a un solo país o época: aparece cuando la religión, la familia, la política o la culpa obligan a elegir entre honestidad y protección.

Las obras son _San Manuel Bueno, mártir_, novela corta de Miguel de Unamuno publicada en España en 1931, y _Crimen y castigo_, novela de Fiódor Dostoievski publicada en Rusia en 1866. El primer extracto procede del momento en que Manuel le confiesa a Lázaro su falta de fe; el segundo corresponde al interrogatorio en que Raskolnikov empieza a derrumbarse ante Porfiri.

Mi tesis es que ambas obras presentan la verdad como algo que no aparece de forma directa, sino filtrada por silencios, confesiones parciales y voces narrativas inestables. En _San Manuel_, la forma testimonial de Ángela mantiene la duda sobre si Manuel miente por amor o por debilidad; en _Crimen y castigo_, el discurso indirecto libre muestra una conciencia que intenta esconderse incluso cuando se está delatando.

Como esta modalidad no incluye preguntas del profesor, integraré dentro de los quince minutos el zoom in sobre cada extracto, el zoom out hacia la obra completa y una síntesis final más desarrollada sobre cómo las dos obras convierten la mentira en un dilema moral.`,
    comentario: `Esta introducción es adecuada para la modalidad de aprendizaje autodidacta con apoyo del colegio por tres razones específicas:

1. La introducción explica el asunto global y por qué importa antes de presentar los textos.

2. Cada obra queda contextualizada con género, autor, fecha y contexto literario relevante.

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
      tipoOral: "Model introduction (250-300 words)",
      asuntoGlobal: "The incomprehension of the artist in a hostile world.",
      obra1: '"Donde habite el olvido" — Luis Cernuda',
      obra2: '"A Hunger Artist" — Franz Kafka',
    },
    texto: `In this oral, I will discuss a global issue related to the field of "Art, creativity and imagination"; more specifically, I will focus on the incomprehension of the artist in a hostile world. For the artist, and in this case for the writer, writing is not a comfortable choice or a pastime, but a necessity. Many major authors have argued that they do not write merely because they enjoy it, but because not writing would mean denying a fundamental part of themselves.

However, this dedication to creation, in a world that measures value in terms of usefulness, productivity, or immediate success, is often seen as extravagance or strangeness. Few understand that beneath this appearance of eccentricity there is a difficult battle between inner chaos and the need to order it through words. For that reason, being an artist has always been difficult: it means living trapped in a gap between the world and the self, which makes this issue a universal problem worth discussing.

For this purpose, I have chosen two extracts from two major literary works. The first is the poem "Donde habite el olvido", included in the collection _La realidad y el deseo_ by the Spanish poet Luis Cernuda, a member of the Generation of '27, published in 1936. The second extract comes from the short story "A Hunger Artist", by the Czech author Franz Kafka, published in 1922. This work is a perfect example of the Kafkaesque absurd, that is, a form of writing placed between existentialism and a deep surrealism.`,
    comentario: `This introduction works for four reasons:

1. It defines the global issue and field of inquiry in the first sentence.

2. The justification is clear and mature: it explains why writing can be a necessity, not a pastime.

3. It closes the justification with a sentence of universal relevance.

4. It presents the extracts, works, and authors without spending words explaining which work is in translation or originally written in the studied language.

Its length fits the 250-300 word target and the register is academic without sounding artificial.`,
  },
  {
    tipo: "bueno",
    etiqueta: "Good introduction · school-supported self-taught",
    contexto: {
      tipoOral:
        "school-supported self-taught (15 min of continuous presentation, no teacher questions)",
      asuntoGlobal:
        "The conflict between the truth the individual knows and the public lie she assumes to protect those who depend on her.",
      obra1: "_San Manuel Bueno, mártir_ — Miguel de Unamuno",
      obra2: "_Crime and Punishment_ — Fyodor Dostoevsky",
    },
    texto: `This oral explores the global issue of the conflict between private truth and public lies. I place it in the field of "Beliefs, values and education" because it examines what happens when a person knows a painful truth but hides it to protect a community or those who depend on them. It matters because it is not limited to one country or period: religion, family, politics, and guilt can all force people to choose between honesty and protection.

The works are _San Manuel Bueno, mártir_, a novella by Miguel de Unamuno published in Spain in 1931, and _Crime and Punishment_, a novel by Fyodor Dostoevsky published in Russia in 1866. The first extract comes from the moment when Manuel confesses his lack of faith to Lázaro; the second is the interrogation in which Raskolnikov begins to break down before Porfiry.

My thesis is that both works present truth as something that does not appear directly, but is filtered through silence, partial confession, and unstable narrative voices. In _San Manuel_, Ángela's testimonial perspective preserves uncertainty about whether Manuel lies out of love or weakness; in _Crime and Punishment_, free indirect discourse reveals a mind that tries to hide even while exposing itself.

Because this format has no teacher questions, I will integrate into the fifteen minutes the zoom in on each extract, the zoom out to each whole work, and a fuller final synthesis on how both works turn lying into a moral dilemma.`,
    comentario: `This introduction is appropriate for the school-supported self-taught modality for three specific reasons:

1. The introduction explains the global issue and why it matters before presenting the texts.

2. Each work is contextualised with genre, author, date, and relevant literary context.

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
        tiempo: "0:00 – 1:00",
        descripcion:
          "Introducción: presenta el asunto global, su campo de indagación, una justificación breve de su importancia y los dos fragmentos con sus obras y autores.",
        nota: "Respeta el minuto inicial. La introducción debe ser clara y preparada, no una explicación larga.",
      },
      {
        tiempo: "1:00 – 3:00",
        descripcion:
          "Análisis del primer extracto: muestra cómo está representado y desarrollado el asunto global mediante contenido y forma.",
        nota: "Dedica unos 2 minutos. Elige 1-2 recursos fuertes y explica su efecto con precisión.",
      },
      {
        tiempo: "3:00 – 4:30",
        descripcion:
          "Análisis del asunto global en la obra completa: conecta el extracto con patrones, escenas o decisiones autorales de toda la obra.",
        nota: "Dedica unos 1:30 minutos. No resumas; usa referencias concretas que amplíen el asunto global.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Análisis del segundo extracto: muestra cómo está representado y desarrollado el mismo asunto global en el segundo pasaje.",
        nota: "Dedica unos 2 minutos y mantén el equilibrio con el primer extracto.",
      },
      {
        tiempo: "6:30 – 9:00",
        descripcion:
          "Análisis del asunto global en la segunda obra completa: explica cómo la obra amplía, complica o confirma lo visto en el extracto.",
        nota: "Dedica unos 2:30 minutos. Esta parte puede ser ligeramente más amplia para compensar que luego habrá preguntas del profesor.",
      },
      {
        tiempo: "9:00 – 10:00",
        descripcion:
          "Conclusión: vuelve al asunto global y cierra explicando qué revelan, en conjunto, las dos obras.",
        nota: "Respeta el minuto final. No introduzcas ideas nuevas: sintetiza.",
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
    etiqueta: "Aprendizaje autodidacta con apoyo del colegio",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 1:00",
        descripcion:
          "Introducción: presenta el asunto global, su campo de indagación, una justificación breve de su importancia y los dos fragmentos con sus obras y autores.",
        nota: "Debe durar aproximadamente un minuto y estar preparada en 250-300 palabras.",
      },
      {
        tiempo: "1:00 – 4:00/4:15",
        descripcion:
          "Análisis del primer extracto: muestra cómo está representado y desarrollado el asunto global mediante contenido y forma.",
        nota: "Dedica unos 3-3:15 minutos. Escoge recursos concretos y explica su efecto, no solo los nombres.",
      },
      {
        tiempo: "4:00/4:15 – 7:00/7:30",
        descripcion:
          "Análisis del asunto global en la obra completa: conecta el extracto con patrones, escenas o decisiones autorales de toda la obra.",
        nota: "Dedica unos 3-3:15 minutos. No hagas resumen de trama; amplía el análisis del asunto global.",
      },
      {
        tiempo: "7:00/7:30 – 10:00/10:45",
        descripcion:
          "Análisis del segundo extracto: muestra cómo está representado y desarrollado el mismo asunto global en el segundo pasaje.",
        nota: "Dedica unos 3-3:15 minutos y mantén el mismo nivel de precisión que en el primer extracto.",
      },
      {
        tiempo: "10:00/10:45 – 13:00/14:00",
        descripcion:
          "Análisis del asunto global en la segunda obra completa: explica cómo la obra amplía, complica o confirma lo visto en el extracto.",
        nota: "Dedica unos 3-3:15 minutos. Usa referencias concretas de la obra completa.",
      },
      {
        tiempo: "14:00 – 15:00",
        descripcion:
          "Conclusión: vuelve al asunto global y cierra explicando qué revelan, en conjunto, las dos obras.",
        nota: "Debe durar aproximadamente un minuto. No introduzcas ideas nuevas: sintetiza.",
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
        tiempo: "0:00 – 1:00",
        descripcion:
          "Introduction: present the global issue, its field of inquiry, a brief justification of its importance, and the two extracts with their works and authors.",
        nota: "Respect the opening minute. The introduction should be clear and prepared, not a long explanation.",
      },
      {
        tiempo: "1:00 – 3:00",
        descripcion:
          "Analysis of the first extract: show how the global issue is represented and developed through content and form.",
        nota: "Spend about 2 minutes. Choose 1-2 strong devices and explain their effect precisely.",
      },
      {
        tiempo: "3:00 – 4:30",
        descripcion:
          "Analysis of the global issue in the whole first work: connect the extract with patterns, scenes, or authorial choices across the work.",
        nota: "Spend about 1:30 minutes. Do not summarise; use concrete references that extend the global issue.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Analysis of the second extract: show how the same global issue is represented and developed in the second passage.",
        nota: "Spend about 2 minutes and keep balance with the first extract.",
      },
      {
        tiempo: "6:30 – 9:00",
        descripcion:
          "Analysis of the global issue in the whole second work: explain how the work extends, complicates, or confirms what appears in the extract.",
        nota: "Spend about 2:30 minutes. This section can be slightly fuller because the teacher questions will allow later expansion.",
      },
      {
        tiempo: "9:00 – 10:00",
        descripcion:
          "Conclusion: return to the global issue and close by explaining what the two works reveal together.",
        nota: "Respect the final minute. Do not introduce new ideas: synthesise.",
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
    etiqueta: "School-supported self-taught",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 1:00",
        descripcion:
          "Introduction: present the global issue, its field of inquiry, a brief justification of its importance, and the two extracts with their works and authors.",
        nota: "It should last about one minute and be prepared in 250-300 words.",
      },
      {
        tiempo: "1:00 – 4:00/4:15",
        descripcion:
          "Analysis of the first extract: show how the global issue is represented and developed through content and form.",
        nota: "Spend about 3-3:15 minutes. Choose concrete devices and explain their effect, not only their names.",
      },
      {
        tiempo: "4:00/4:15 – 7:00/7:30",
        descripcion:
          "Analysis of the global issue in the whole first work: connect the extract with patterns, scenes, or authorial choices across the work.",
        nota: "Spend about 3-3:15 minutes. Do not summarise the plot; extend the analysis of the global issue.",
      },
      {
        tiempo: "7:00/7:30 – 10:00/10:45",
        descripcion:
          "Analysis of the second extract: show how the same global issue is represented and developed in the second passage.",
        nota: "Spend about 3-3:15 minutes and keep the same level of precision as in the first extract.",
      },
      {
        tiempo: "10:00/10:45 – 13:00/14:00",
        descripcion:
          "Analysis of the global issue in the whole second work: explain how the work extends, complicates, or confirms what appears in the extract.",
        nota: "Spend about 3-3:15 minutes. Use concrete references from the whole work.",
      },
      {
        tiempo: "14:00 – 15:00",
        descripcion:
          "Conclusion: return to the global issue and close by explaining what the two works reveal together.",
        nota: "It should last about one minute. Do not introduce new ideas: synthesise.",
      },
    ],
  },
];

export function getEstructurasOral(isEN: boolean): EstructuraOral[] {
  return isEN ? ESTRUCTURAS_ORAL_EN : ESTRUCTURAS_ORAL_ES;
}

const ESTRUCTURAS_ORAL = ESTRUCTURAS_ORAL_ES;
