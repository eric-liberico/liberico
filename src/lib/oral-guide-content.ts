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

const CAMPOS_INDAGACION_ES: CampoIndagacion[] = [
  {
    key: "cultura",
    nombre: "Cultura, identidad y comunidad",
    buenos: [
      {
        texto:
          "Cuando una comunidad espera que todos actúen igual, una persona puede perder libertad para ser ella misma. Importa porque muestra cómo la presión social puede borrar la identidad individual.",
      },
      {
        texto:
          "Las normas culturales pueden limitar lo que una mujer puede hacer, decir o desear. Importa porque ayuda a analizar cómo una obra representa la desigualdad en la vida cotidiana.",
      },
      {
        texto:
          "Una persona migrante o desplazada puede sentirse dividida entre la cultura que hereda y la identidad que quiere construir. Importa porque conecta experiencias personales con cambios sociales globales.",
      },
      {
        texto:
          "El silencio dentro de una familia o comunidad puede mantener normas injustas. Importa porque permite estudiar no solo lo que los personajes dicen, sino también lo que callan.",
      },
      {
        texto:
          "Recordar el pasado puede proteger una identidad, pero también puede idealizarla o deformarla. Importa porque muchas obras muestran cómo la memoria afecta a comunidades en crisis.",
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
          "El conflicto entre los valores transmitidos por la familia y los valores formados por la experiencia personal.",
      },
      {
        texto:
          "La instrumentalización de la educación como mecanismo de adoctrinamiento o control ideológico en contextos autoritarios.",
      },
      {
        texto:
          "La culpa como consecuencia del choque entre un código ético interiorizado y decisiones individuales irreversibles.",
      },
      {
        texto:
          "La transmisión intergeneracional de creencias que limitan la libertad y la subjetividad de las nuevas generaciones.",
      },
      {
        texto:
          "El conflicto entre la verdad que el individuo conoce y la mentira pública que acepta para proteger a quienes dependen de él.",
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
        texto:
          "La deshumanización del individuo bajo estructuras de poder autoritarias que niegan o suprimen su subjetividad.",
      },
      {
        texto:
          "La complicidad del ciudadano común en el mantenimiento de sistemas de injusticia estructural.",
      },
      {
        texto:
          "El uso del lenguaje y del silencio como instrumentos de dominación y como espacios de resistencia frente al poder.",
      },
      {
        texto:
          "La vulnerabilidad de los débiles ante sistemas legales y sociales que los excluyen o los vuelven invisibles.",
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
          "La función del arte o la creación como acto de resistencia o supervivencia frente a la opresión política o social.",
      },
      {
        texto:
          "La tensión entre la vocación artística o creativa del individuo y las expectativas de su familia o entorno social.",
      },
      {
        texto:
          "La imaginación como refugio, trampa o herramienta de transformación para personajes que no pueden cambiar su realidad.",
      },
      {
        texto:
          "El arte como espacio privilegiado para expresar aquello que el lenguaje cotidiano no puede o no se atreve a nombrar.",
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
        texto:
          "La alienación del ser humano respecto a la naturaleza como consecuencia de la modernización industrial o tecnológica.",
      },
      {
        texto:
          "La tensión entre el progreso científico o industrial y la destrucción de vínculos comunitarios y sentido de pertenencia.",
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
        texto:
          "When a community expects everyone to behave the same way, a person can lose the freedom to be themselves. This matters because it shows how social pressure can erase individual identity.",
      },
      {
        texto:
          "Cultural norms can limit what a woman is allowed to do, say, or desire. This matters because it helps analyse how a work represents inequality in everyday life.",
      },
      {
        texto:
          "A migrant or displaced person may feel divided between the culture they inherit and the identity they want to build. This matters because it connects personal experience with global social change.",
      },
      {
        texto:
          "Silence inside a family or community can keep unfair norms in place. This matters because it lets you study not only what characters say, but also what they do not say.",
      },
      {
        texto:
          "Remembering the past can protect identity, but it can also idealise or distort it. This matters because many works show how memory shapes communities in crisis.",
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
        texto:
          "The conflict between moral values transmitted by the family and values forged by personal experience.",
      },
      {
        texto:
          "The instrumentalization of education as a mechanism for indoctrination or ideological control in authoritarian contexts.",
      },
      {
        texto:
          "Guilt as a consequence of the clash between internalized ethical code and irreversible individual decisions.",
      },
      {
        texto:
          "The intergenerational transmission of beliefs that limit the freedom and subjectivity of new generations.",
      },
      {
        texto:
          "The conflict between the truth the individual knows and the public lie she accepts to protect those who depend on her.",
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
        texto:
          "The dehumanization of the individual under authoritarian power structures that deny or suppress his subjectivity.",
      },
      {
        texto:
          "The complicity of the ordinary citizen in maintaining systems of structural injustice.",
      },
      {
        texto:
          "The use of language and silence as instruments of domination and as spaces of resistance against power.",
      },
      {
        texto:
          "The vulnerability of the weak before legal and social systems that exclude or render them invisible.",
      },
      {
        texto:
          "The intergenerational transmission of violence in societies marked by political conflict or repression.",
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
        texto:
          "The function of art or creation as an act of resistance or survival in the face of political or social oppression.",
      },
      {
        texto:
          "The tension between the artistic or creative vocation of the individual and the expectations of her family or social environment.",
      },
      {
        texto:
          "Imagination as refuge, as trap, or as a tool for transformation for characters who cannot change their reality.",
      },
      {
        texto:
          "Art as a privileged space for expressing what everyday language cannot or is not allowed to name.",
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
        texto:
          "The alienation of the human being from nature as a consequence of industrial or technological modernization.",
      },
      {
        texto:
          "The tension between scientific or industrial progress and the destruction of community ties and sense of belonging.",
      },
      {
        texto:
          "The human body as territory over which medical, state, or technological control is exercised.",
      },
      {
        texto:
          "The transformation of the natural landscape as symbol or symptom of the deterioration of the relationship between the individual and her environment.",
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
    texto: `En este oral exploraré cómo el asunto global de la deshumanización del individuo bajo estructuras de poder autoritarias se presenta mediante el contenido y la forma en dos obras de contextos distintos pero con resonancias profundas: _La casa de Bernarda Alba_, de Federico García Lorca, escrita originalmente en español, y _La metamorfosis_, de Franz Kafka, que estudiaré en su traducción al español.

El primer extracto corresponde al inicio del primer acto de _La casa de Bernarda Alba_, en el que Bernarda anuncia el luto e impone la reclusión total a sus hijas. El segundo extracto es el párrafo de apertura de _La metamorfosis_, donde Gregorio Samsa despierta transformado en un insecto y comprueba que su nueva condición no interrumpe su obligación de ir al trabajo.

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
    etiqueta: "Introducción buena · aprendizaje autodidacta con apoyo del colegio",
    contexto: {
      tipoOral:
        "aprendizaje autodidacta con apoyo del colegio (15 min de exposición continua, sin preguntas del profesor)",
      asuntoGlobal:
        "El conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él.",
      obra1: "_San Manuel Bueno, mártir_ — Miguel de Unamuno (original en español)",
      obra2: "_Crimen y castigo_ — Fiódor Dostoievski (en traducción)",
    },
    texto: `Este oral explora cómo el asunto global del conflicto entre la verdad que el individuo conoce y la mentira pública que asume para proteger a quienes dependen de él se presenta mediante las decisiones de contenido y forma en dos obras que, a pesar de sus diferencias de género y contexto cultural, coinciden en colocar a sus protagonistas ante una elección ética irresoluble.

Las obras son _San Manuel Bueno, mártir_, de Miguel de Unamuno, escrita originalmente en español, y _Crimen y castigo_, de Fiódor Dostoievski, que estudiaré en traducción.

El primer extracto procede del fragmento en que el sacerdote Manuel le confiesa a Lázaro su falta de fe; el segundo extracto corresponde al interrogatorio en que Raskolnikov comienza a derrumbarse bajo la presión psicológica de Porfiri.

Mi eje de lectura es que tanto Unamuno como Dostoievski construyen el silencio y la confesión como los espacios donde la verdad se filtra: en _San Manuel_, la forma epistolar y la perspectiva limitada de Ángela preservan la ambigüedad sobre si Manuel actúa por compasión o por cobardía; en _Crimen y castigo_, el discurso indirecto libre da acceso al pensamiento de Raskolnikov mientras oculta sus intenciones al exterior, reproduciendo en la forma misma la mentira del protagonista.

Como esta es una exposición de quince minutos sin preguntas del profesor, desarrollaré cada movimiento analítico con la profundidad necesaria para que la síntesis final sea completa sin apoyo externo.`,
    comentario: `Esta introducción es adecuada para la modalidad de aprendizaje autodidacta con apoyo del colegio por tres razones específicas:

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
    texto: `In this oral, I will explore how the global issue of the dehumanization of the individual under authoritarian power structures manifests itself through both content and form in two works from different contexts but with profound resonances: _The House of Bernarda Alba_ by Federico García Lorca, originally written in Spanish, and _The Metamorphosis_ by Franz Kafka, which I will study in its Spanish translation.

The first extract corresponds to the opening of Act One of _The House of Bernarda Alba_, in which Bernarda announces the mourning and imposes total confinement on her daughters. The second extract is the opening paragraph of _The Metamorphosis_, in which Gregor Samsa wakes up transformed into an insect and discovers that his new condition does not interrupt his obligation to go to work.

My reading hypothesis is that both Lorca and Kafka use space—the house in one case, the room in the other—as a concrete instrument of dehumanization: in Lorca, domestic architecture functions as an extension of the patriarchal order that denies women's subjectivity; in Kafka, the room becomes the stage where the logic of productivity reduces the human being to his economic utility. I will develop first the extract and Lorca's work, then the extract and Kafka's work, and close with a synthesis of how both works construct complementary perspectives on dehumanization from very different genres and cultural contexts.`,
    comentario: `This introduction works for four reasons:

1. The global issue is specific and debatable. It is not "power" but dehumanization as a concrete mechanism of that power, with an agent (authoritarian structures) and a victim (the individual's subjectivity).

2. Both works are identified with author, title, and linguistic status (original/translated), which is a requirement of the Language A: Literature oral.

3. The extracts are located with precision within the works. "The opening of Act One" and "the opening paragraph" locate concrete, analyzable passages.

4. The thesis connects form with the global issue: architectural space as an instrument of dehumanization. It does not simply say "both works deal with power": it says how they construct it formally.

The structure map at the end allows the teacher to know exactly what will happen in the next 10 minutes.`,
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
    texto: `This oral explores how the global issue of the conflict between the truth the individual knows and the public lie she assumes to protect those who depend on her manifests itself through decisions of content and form in two works that, despite their differences in genre and cultural context, agree in placing their protagonists before an unresolvable ethical choice.

The works are _San Manuel Bueno, mártir_ by Miguel de Unamuno, originally written in Spanish, and _Crime and Punishment_ by Fyodor Dostoevsky, which I will study in translation.

The first extract comes from the passage in which the priest Manuel confesses to Lázaro his lack of faith; the second extract corresponds to the interrogation in which Raskolnikov begins to break down under the psychological pressure of Porfiri.

My axis of reading is that both Unamuno and Dostoevsky construct silence and confession as the spaces where truth filters through: in _San Manuel_, the epistolary form and Ángela's limited perspective preserve ambiguity about whether Manuel acts from compassion or cowardice; in _Crime and Punishment_, free indirect discourse gives access to Raskolnikov's thought while hiding his intentions from the outside, reproducing in form itself the protagonist's lie.

Since this is a fifteen-minute presentation without teacher questions, I will develop each analytical movement with the depth necessary for the final synthesis to be complete without external support.`,
    comentario: `This introduction is appropriate for the school-supported self-taught modality for three specific reasons:

1. The last sentence explicitly anticipates the difference in format: the student knows there will be no questions and adjusts the statement of intent accordingly. That demonstrates understanding of the task.

2. The thesis not only names a theme (lies, confession) but identifies a concrete formal choice in each work: the epistolary form with limited perspective in Unamuno, and free indirect discourse in Dostoevsky. This allows analysis of how content and form work together.

3. The global issue demands real comparison: you cannot talk about just one work to illustrate it. This guarantees that the oral will have focus and balance.`,
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
    etiqueta: "Aprendizaje autodidacta con apoyo del colegio",
    totalMin: 15,
    exposicionMin: 15,
    bloques: [
      {
        tiempo: "0:00 – 1:30",
        descripcion:
          "Introducción: presenta el asunto global, las dos obras, los dos extractos, tu tesis y un mapa detallado de la estructura.",
        nota: "1,5 minutos. Más tiempo que en la modalidad con profesor porque aquí no habrá preguntas para aclarar. El examinador debe entender el proyecto del oral desde el principio.",
      },
      {
        tiempo: "1:30 – 4:00",
        descripcion:
          "Extracto 1: análisis detallado de las decisiones de contenido y forma que construyen el asunto global en este fragmento.",
        nota: "2,5 minutos. Más profundidad que en la modalidad con profesor, porque no habrá preguntas para explorar lo que dejes sin desarrollar.",
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
        nota: "3 minutos. Esta síntesis es más larga que en la modalidad con profesor porque aquí integra lo que en la otra modalidad el alumno podría haber completado en las preguntas del profesor.",
      },
      {
        tiempo: "13:30 – 15:00",
        descripcion:
          "Cierre completo: responde al asunto global con una conclusión matizada y autosuficiente. No necesitas que nadie te pregunte más.",
        nota: "1,5 minutos. El cierre del oral de aprendizaje autodidacta con apoyo del colegio debe ser más completo que el de la modalidad con profesor. No puede quedar ninguna laguna evidente sin abordar.",
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
          "Introduction: present the global issue, the two works, the two extracts and your thesis or reading line. Include a brief map of the structure.",
        nota: "1 minute. Be precise and concise. The examiner needs to orient himself before the analysis begins.",
      },
      {
        tiempo: "1:00 – 3:00",
        descripcion:
          "Extract 1: analyze the decisions of content and form that construct the global issue in this specific fragment.",
        nota: "2 minutes. Do not summarize the extract: analyze it. What does the author choose and why? What effect does it have on the global issue?",
      },
      {
        tiempo: "3:00 – 4:30",
        descripcion:
          "Complete Work 1: show how the global issue develops beyond the extract, using reference to other moments in the work.",
        nota: "1.5 minutes. Do not recite the plot: select two or three key moments that expand what you have already analyzed in the extract.",
      },
      {
        tiempo: "4:30 – 6:30",
        descripcion:
          "Extract 2: analyze the decisions of content and form that construct the global issue in the second fragment.",
        nota: "2 minutes. Same level of analysis as Extract 1. If you have already established the pattern with Work 1, you can use Work 2 to contrast or deepen.",
      },
      {
        tiempo: "6:30 – 8:00",
        descripcion:
          "Complete Work 2: show how the global issue develops in the whole of the work, beyond the extract.",
        nota: "1.5 minutes. Same as with Work 1: select, do not recite.",
      },
      {
        tiempo: "8:00 – 9:30",
        descripcion:
          "Synthesis: connect the two works through the global issue. This is not Paper 2: do not compare the works mechanically. Show how each work constructs a perspective on the global issue.",
        nota: "1.5 minutes. This is the hardest part. The synthesis must advance your thesis, not repeat what has already been said.",
      },
      {
        tiempo: "9:30 – 10:00",
        descripcion:
          "Closing: respond directly to the global issue. What does your analysis conclude about how this issue manifests itself through content and form in these works?",
        nota: "30 seconds. Brief and definitive. Return to your thesis and show that the analysis has sustained it.",
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
        tiempo: "0:00 – 1:30",
        descripcion:
          "Introduction: present the global issue, the two works, the two extracts, your thesis and a detailed map of the structure.",
        nota: "1.5 minutes. More time than in the taught modality because there will be no questions to clarify. The examiner must understand the project of the oral from the beginning.",
      },
      {
        tiempo: "1:30 – 4:00",
        descripcion:
          "Extract 1: detailed analysis of the decisions of content and form that construct the global issue in this fragment.",
        nota: "2.5 minutes. More depth than in the taught modality, because there will be no questions to explore what you leave undeveloped.",
      },
      {
        tiempo: "4:00 – 6:00",
        descripcion:
          "Complete Work 1: develop how the global issue manifests itself throughout the work, beyond the extract.",
        nota: "2 minutes. Select two or three moments or formal features of the work that expand and complicate what you have analyzed in the extract.",
      },
      {
        tiempo: "6:00 – 8:30",
        descripcion:
          "Extract 2: detailed analysis of the second fragment with the same level of depth as the first.",
        nota: "2.5 minutes. In this modality, the analysis of each extract must be self-sufficient: you cannot depend on the teacher asking for more.",
      },
      {
        tiempo: "8:30 – 10:30",
        descripcion:
          "Complete Work 2: develop how the global issue manifests itself in the whole of the second work.",
        nota: "2 minutes. Same level of detail as with Work 1.",
      },
      {
        tiempo: "10:30 – 13:30",
        descripcion:
          "Extended synthesis: connect the two works through the global issue. Show how each one constructs a distinct or complementary perspective. Nuance, contrast, or deepen.",
        nota: "3 minutes. This synthesis is longer than in the taught modality because it integrates what in the other modality the student could have completed in the teacher's questions.",
      },
      {
        tiempo: "13:30 – 15:00",
        descripcion:
          "Complete closing: respond to the global issue with a nuanced and self-sufficient conclusion. You do not need anyone to ask you more.",
        nota: "1.5 minutes. The closing of the school-supported self-taught oral must be more complete than that of the taught modality. No obvious gaps should remain unaddressed.",
      },
    ],
  },
];

export function getEstructurasOral(isEN: boolean): EstructuraOral[] {
  return isEN ? ESTRUCTURAS_ORAL_EN : ESTRUCTURAS_ORAL_ES;
}

const ESTRUCTURAS_ORAL = ESTRUCTURAS_ORAL_ES;
