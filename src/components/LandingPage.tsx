import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Compass,
  Gauge,
  Globe,
  ListChecks,
  Minus,
  Plus,
  Quote,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, type Variants } from "framer-motion";
import {
  LANDING as L,
  DEEP,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { OralPreview } from "@/components/landing/OralPreview";
import { Reveal } from "@/components/landing/Reveal";
import { HeroLoop } from "@/components/landing/HeroLoop";

// ─────────────────────────────────────────────────────────────────────────────
// LIBerico — landing "Claro premium"
// Fondo claro educativo + índigo como acción + ámbar como acento de marca.
// Rejilla con máscara radial y focos suaves en el héroe; dos bandas índigo
// profundo (autoridad y CTA final) para dar profundidad. Acentos por criterio
// (A azul · B violeta · C ámbar · D rosa). Animaciones con framer-motion.
// Tres ideas mandan: examinadores reales · sin suscripción · simplicidad.
// ─────────────────────────────────────────────────────────────────────────────

type LandingLang = "es" | "en";
const LANG_KEY = "liberico.landingLang";

const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

function getInitialLang(): LandingLang {
  if (typeof window === "undefined") return "es";
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "es") return stored;
    return navigator.language.startsWith("en") ? "en" : "es";
  } catch {
    return "es";
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  es: {
    nav: {
      how: "Cómo funciona",
      pricing: "Precio",
      trust: "Fiabilidad",
      courses: "Asignaturas",
      reviews: "Opiniones",
      faq: "Dudas",
    },
    login: "Entrar",
    cta: "Corregir mi texto",
    cta_short: "Empezar",
    h1a: "Feedback especializado en los ",
    h1mark: "cursos de idiomas del IB",
    h1b: ", con rigor de examinador.",
    sub: "Pega tu comentario, ensayo u oral y recibe la nota por criterios con comentarios detallados y propuestas claras sobre cómo mejorar. Sin suscripción: pagas solo cuando lo usas.",
    priceFrom: "desde",
    price: "1,50 €",
    priceUnit: "por corrección",
    pillars: [
      {
        t: "Criterios del IB, aplicados con rigor",
        d: "Aplica los criterios con el rigor de quien ha examinado y estandarizado notas de corte en el IB.",
      },
      {
        t: "Sin suscripción",
        d: "Las mensualidades te enganchan. Aquí pagas por corrección: si te sirve, sigue; si no, no lo usas.",
      },
    ],
    heroLoop: {
      deskLabel: "Corrector de análisis literario · IB Español A: Literatura NM · Prueba 1",
      passageLabel: "Texto literario",
      questionLabel: "Pregunta de orientación",
      analysisLabel: "Tu análisis",
      passage:
        "El faro seguía allí, alto e inútil, al final del espigón. Marta lo miraba cada tarde desde la ventana, como quien vigila algo que ya no puede salvarse. El mar era un campo gris que respiraba despacio bajo la niebla, y la luz giraba sin alumbrar a nadie. Desde que su padre faltaba, ella había aprendido a mirar el agua del mismo modo: con una espera que no sabía nombrar.",
      question:
        "¿Cómo construye el texto la relación entre el faro y el estado interior de la protagonista?",
      analysis: [
        "Este texto trata de una mujer, Marta, que mira el faro desde su ventana después de perder a su padre. El autor utiliza el faro y el mar para mostrar cómo se siente ella por dentro. En este análisis voy a explicar cómo usa estas imágenes y con qué propósito.",
        "En primer lugar, el faro representa a Marta. El autor dice que es «alto e inútil», y eso muestra que ella también se siente inútil y sola después de la muerte de su padre. El propósito es transmitir tristeza al lector.",
        "También usa el mar. Dice que es «un campo gris que respiraba», que es una metáfora muy bonita para mostrar el mar como algo vivo. Esto crea una imagen que transmite calma y a la vez pena.",
        "En conclusión, el autor utiliza el faro y el mar para transmitir el dolor de Marta. Creo que lo hace sobre todo para que el lector entienda cómo se siente ella.",
      ],
      credits: "1,5 cr",
      evalBtn: "Evaluar análisis",
      resultLabel: "Resultado",
      resultTitle: "Evaluación por criterios",
      scoreLabel: "Punt.",
      scoreVal: "12",
      scoreMax: "/20",
      gradeLabel: "Nota",
      gradeVal: "5",
      critHeading: "Calificación por criterios",
      crit: [
        {
          l: "A" as const,
          n: "Comprensión e interpretación",
          s: 3,
          max: 5,
          comment:
            "Comprende el sentido literal y lo apoya con citas pertinentes («alto e inútil», «un campo gris que respiraba»). La lectura se queda en la superficie: no explora por qué la luz «gira sin alumbrar a nadie» ni la espera que Marta «no sabía nombrar».",
        },
        {
          l: "B" as const,
          n: "Análisis y evaluación",
          s: 3,
          max: 5,
          comment:
            "Identifica recursos —la imagen del mar, el faro como símbolo— y los ordena. El análisis del efecto es general: llama «metáfora» a lo que es una personificación y no comenta cómo la luz inútil construye el duelo.",
        },
        {
          l: "C" as const,
          n: "Foco y organización",
          s: 3,
          max: 5,
          comment:
            "Organización clara: tesis, un párrafo por imagen y conclusión. El foco se mantiene, pero la progresión es aditiva («en primer lugar», «también») más que argumentativa.",
        },
        {
          l: "D" as const,
          n: "Lengua",
          s: 3,
          max: 5,
          comment:
            "Lenguaje correcto y claro, con pocos errores. A veces coloquial («una metáfora muy bonita», «creo que») y con léxico crítico limitado: se repiten «usar», «mostrar» y «transmitir».",
        },
      ],
      globalLabel: "Comentario global de evaluación",
      global:
        "Análisis competente y bien encaminado que responde a la pregunta. Banda media (un 3 en los cuatro criterios, nota 5): hay comprensión sólida y orden, pero el análisis se queda en identificar y describir el efecto, sin profundizar en cómo el faro y el mar construyen el duelo de Marta.",
      strengthsLabel: "Fortalezas",
      strengths:
        "Buena comprensión literal y selección pertinente de citas. La estructura por imágenes es coherente con la pregunta y el cierre conecta el faro y el mar con un mismo sentimiento.",
      areasLabel: "Áreas de mejora",
      areas:
        "Profundiza en el efecto: nombra con precisión los recursos (personificación, no metáfora) y enlázalos con el duelo. Evita los giros coloquiales y el metadiscurso escolar («voy a explicar»).",
      ctaChip: "Feedback completo · +2 cr",
      ctaTitle: "Solución anotada, lenguaje y ensayo de banda alta",
      ctaSub: "Mantiene tu voz; muestra cómo subir cada criterio.",
      fbBtn: "Dame feedback completo",
      annotHeading: "Tu solución anotada",
      annot: [
        [
          { t: "Este texto trata de una mujer que mira el faro tras perder a su padre. " },
          { h: "El autor utiliza el faro y el mar", c: "D" as const },
          { t: " para mostrar cómo se siente. " },
          { h: "En este análisis voy a explicar cómo usa estas imágenes", c: "D" as const },
          { t: "." },
        ],
        [
          { h: "El faro representa a Marta", c: "A" as const },
          { t: ": el autor dice que es «alto e inútil». " },
          { h: "Es una metáfora muy bonita", c: "B" as const },
          { t: " del mar como algo vivo." },
        ],
      ],
      pop: {
        kicker: "D · Lenguaje · reescritura de banda alta",
        body: "Metadiscurso escolar («voy a explicar») y repetición de «usa». Rebaja el tono académico.",
        fix: "el autor enlaza el faro y el mar para encarnar el duelo de Marta",
      },
      langHeading: "Lenguaje analítico · precisión",
      lang: [
        {
          kind: "verb" as const,
          tag: "«usar» × 6",
          from: "el autor utiliza el faro y el mar",
          to: "el autor despliega / articula el faro y el mar",
        },
        {
          kind: "verb" as const,
          tag: "«transmitir» × 3",
          from: "para transmitir tristeza al lector",
          to: "para construir / encarnar el duelo",
        },
        {
          kind: "colo" as const,
          tag: "Coloquialismo",
          from: "«una metáfora muy bonita»",
          to: "una imagen que dota de vida al paisaje",
        },
      ],
      essayHeading: "Tu ensayo elevado a banda alta",
      essaySub: "La misma idea, desarrollada con precisión y sin perder tu voz.",
      essay: [
        "El texto da voz al duelo de Marta a través de dos imágenes que se sostienen entre sí: el faro y el mar. Desde la primera línea el faro aparece «alto e inútil», y esa inutilidad no la describe a ella, la encarna: como el faro que gira «sin alumbrar a nadie», Marta vigila algo que ya no puede salvarse.",
        "El mar prolonga ese estado. Al personificarlo como «un campo gris que respiraba», el autor lo vuelve un cuerpo vivo y lento, del mismo ritmo que la espera de Marta. No es solo una imagen bonita: la respiración del mar mide el tiempo detenido del duelo, y la niebla que lo cubre es la misma que enturbia su mirada.",
        "Por eso el faro y el agua acaban diciendo lo mismo. La luz que no alumbra y la espera que Marta «no sabía nombrar» se reflejan: el paisaje no acompaña su dolor, lo piensa por ella. El texto no explica el duelo; lo deja girar, como el haz del faro, sobre una superficie que ya no espera respuesta.",
      ],
      chips: [
        { c: "A" as const, t: "A ↑ interpretación" },
        { c: "B" as const, t: "B ↑ recursos" },
        { c: "C" as const, t: "C ↑ progresión" },
        { c: "D" as const, t: "D ↑ léxico" },
      ],
    },
    tiers2: {
      kicker: "Cada corrección, en dos partes",
      title: "Empieza por la nota. Profundiza cuando quieras.",
      sub: "La corrección base te da la evaluación por criterios. El feedback completo abre las anotaciones, el diagnóstico de lenguaje y la reescritura de banda alta.",
      base: {
        tag: "Corrección",
        price: "1,50 €",
        title: "La evaluación por criterios",
        points: [
          "Nota IB estimada de la prueba",
          "Nota y comentario criterio por criterio",
          "Comentario global, fortalezas y áreas de mejora",
          "Se guarda en tu historial de progreso",
        ],
      },
      full: {
        badge: "Lo que de verdad enseña",
        tag: "Feedback completo",
        price: "+2,00 €",
        title: "Diagnóstico, anotaciones y reescritura",
        points: [
          "Solución anotada: comentarios por frase",
          "Diagnóstico de lenguaje: verbos débiles e interferencias",
          "Ensayo completo elevado a banda alta, con tu voz",
          "Qué se conserva, qué se transforma y qué criterios suben",
        ],
      },
    },
    authorityKicker: "Por qué fiarte de la nota",
    authorityTitle: "Calibrado por quien ha puesto las notas de corte",
    authorityBody:
      "LIBerico lo construyen profesores con décadas en el programa del Diploma: han examinado, han formado alumnado y han participado en la estandarización que decide dónde cae cada banda. Esa experiencia es la que el corrector aplica a tu texto. Es un proyecto independiente, sin afiliación oficial con el Bachillerato Internacional.",
    proofStat: { v: "20+", l: "años examinando y estandarizando exámenes del IB" },
    proofs: [
      {
        t: "Conocen las notas de corte por dentro",
        d: "Han participado en la estandarización que decide dónde cae cada banda.",
      },
      {
        t: "Los criterios de tu prueba, no una rúbrica genérica",
        d: "Cada componente se evalúa con sus propios criterios oficiales del IB.",
      },
      {
        t: "Una estimación calibrada, no una nota oficial",
        d: "Pensada para orientarte y para hablarlo con tu profesor.",
      },
    ],
    howKicker: "Tres pasos",
    howTitle: "De tu borrador a una banda IB",
    how: [
      {
        t: "Pega tu texto",
        d: "Tu comentario, ensayo o guion oral. Eliges la prueba y la asignatura.",
      },
      {
        t: "Recibe la nota",
        d: "En segundos: bandas A–D, nota estimada sobre 7 y el comentario del examinador.",
      },
      {
        t: "Itera y sube",
        d: "Corrige con el feedback, vuelve a entregar y mide el salto. El historial lo registra.",
      },
    ],
    priceTitle: "Pagas solo cuando lo usas",
    priceLead:
      "Otras plataformas te atan a una mensualidad aunque solo necesites tres correcciones en mayo. Aquí compras crédito y lo gastas a tu ritmo.",
    usTag: "LIBerico · pago por uso",
    us: [
      "1,50 € por corrección",
      "Sin mensualidad ni permanencia",
      "Recargas desde 5 €, cuando quieras",
      "Si no lo usas, no pagas",
    ],
    themTag: "Otros · suscripción",
    them: [
      "Mensualidad obligatoria",
      "Pagas aunque no practiques",
      "Renovación automática y permanencia",
      "Presión por «amortizar» el plan",
    ],
    tiersNote: "Recarga mínima 5 €. Sin mensualidad ni compromiso.",
    priceMatrix: {
      kicker: "Tarifas",
      title: "Cuánto cuesta cada cosa",
      sub: "Sin paquetes ni sorpresas: cada acción gasta una cantidad fija de créditos, y 1 crédito = 1 €.",
      colProduct: "Qué corriges",
      colCost: "Coste",
      rows: [
        {
          name: "Corrección · Prueba 1",
          desc: "Nota por criterios y comentario",
          euro: "1,50 €",
          credits: "1,5 créditos",
          tag: "",
        },
        {
          name: "Corrección · Prueba 2",
          desc: "Ensayo comparativo evaluado",
          euro: "2,00 €",
          credits: "2 créditos",
          tag: "",
        },
        {
          name: "Feedback de oral individual",
          desc: "Evaluación del guion y de las preguntas",
          euro: "2,00 €",
          credits: "2 créditos",
          tag: "",
        },
        {
          name: "Feedback completo",
          desc: "Anotaciones, diagnóstico de lenguaje y reescritura de banda alta",
          euro: "+2,00 €",
          credits: "+2 créditos",
          tag: "Añadido",
        },
        {
          name: "Sesión oral conversacional",
          desc: "Oral en vivo con avatar examinador",
          euro: "5,00 €",
          credits: "5 créditos",
          tag: "Español B",
        },
      ],
      note: "1 crédito = 1 € · recarga desde 5 € (hasta 200) · sin suscripción.",
    },
    coursesKicker: "Cursos disponibles",
    coursesTitle: "Asignaturas disponibles, con el mismo rigor del IB",
    courses: [
      {
        subject: "Español A: Literatura",
        level: "NM/NS",
        exams: ["Prueba 1", "Prueba 2", "Oral individual"],
      },
      {
        subject: "Inglés A: Literatura",
        level: "NM/NS",
        exams: ["Prueba 1", "Prueba 2", "Oral individual"],
      },
      {
        subject: "Español B",
        level: "NM/NS",
        exams: ["Prueba 1", "Prueba 2", "Oral individual"],
      },
    ],
    upcomingKicker: "Próximamente",
    upcomingCourses: [
      "Inglés A: Lengua y Literatura",
      "Español A: Lengua y Literatura",
      "Inglés B",
      "Francés B",
      "Alemán B",
      "Polaco A: Literatura",
      "Turco A: Literatura",
    ],
    critKicker: "Sin atajos",
    critTitle: "Cada prueba tiene sus criterios",
    critSub:
      "No usamos una rúbrica única. LIBerico aplica los criterios oficiales de cada componente — y cambian según la prueba y la asignatura.",
    critTabs: [
      {
        tab: "Lit · P1",
        subject: "Lengua A · Literatura",
        paper: "Prueba 1 — Comentario",
        scale: "A–D · /20",
        items: [
          {
            l: "A",
            c: "A" as const,
            n: "Comprensión e interpretación",
            f: "Lectura del texto, inferencias y matices.",
            ex: "No «habla de la pérdida», sino «instala la pérdida como un presente que no cesa».",
          },
          {
            l: "B",
            c: "B" as const,
            n: "Análisis y evaluación",
            f: "El efecto de los recursos sobre el lector.",
            ex: "De «usa una anáfora» a «la anáfora convierte el poema en una lucha interna».",
          },
          {
            l: "C",
            c: "C" as const,
            n: "Foco y organización",
            f: "Estructura del comentario y coherencia.",
            ex: "Cada párrafo avanza la tesis; las transiciones conectan, no solo enumeran.",
          },
          {
            l: "D",
            c: "D" as const,
            n: "Lengua",
            f: "Precisión léxica y registro académico.",
            ex: "Citas exactas y verbos precisos: «vertebra», no «es muy importante».",
          },
        ],
      },
      {
        tab: "Lit · P2",
        subject: "Lengua A · Literatura",
        paper: "Prueba 2 — Ensayo comparativo",
        scale: "A–D · /30",
        items: [
          {
            l: "A",
            c: "A" as const,
            n: "Conocimiento e interpretación",
            f: "Dominio de las dos obras y del contexto.",
            ex: "Demuestra que conoces ambas obras y su contexto, no solo el argumento.",
          },
          {
            l: "B",
            c: "B" as const,
            n: "Análisis y evaluación",
            f: "Comparación de las decisiones de cada autor.",
            ex: "Compara: cómo cada autor usa el narrador para un mismo tema.",
          },
          {
            l: "C",
            c: "C" as const,
            n: "Foco y organización",
            f: "Hilo del ensayo y progresión del argumento.",
            ex: "Una tesis comparativa que progresa, no dos resúmenes en paralelo.",
          },
          {
            l: "D",
            c: "D" as const,
            n: "Lengua",
            f: "Claridad y registro académico sostenido.",
            ex: "Registro académico sostenido y conectores de comparación precisos.",
          },
        ],
      },
      {
        tab: "Lit · Oral",
        subject: "Lengua A · Literatura",
        paper: "Oral Individual",
        scale: "A–D · /40",
        items: [
          {
            l: "A",
            c: "A" as const,
            n: "Conocimiento e interpretación",
            f: "Las obras y el asunto global elegido.",
            ex: "Conecta las obras con un asunto global concreto, no genérico.",
          },
          {
            l: "B",
            c: "B" as const,
            n: "Análisis y evaluación",
            f: "Cómo se construye el significado en cada obra.",
            ex: "Explica cómo se construye el significado, con citas memorizadas.",
          },
          {
            l: "C",
            c: "C" as const,
            n: "Foco y organización",
            f: "Estructura y equilibrio del discurso.",
            ex: "Equilibrio entre las dos obras y una estructura clara de 10 min.",
          },
          {
            l: "D",
            c: "D" as const,
            n: "Lengua",
            f: "Fluidez y precisión en la lengua oral.",
            ex: "Pausas y autocorrecciones no penalizan si comunicas con claridad.",
          },
        ],
      },
      {
        tab: "Esp B · Escrita",
        subject: "Lengua B · Español B",
        paper: "Producción escrita",
        scale: "A · B · C",
        items: [
          {
            l: "A",
            c: "A" as const,
            n: "Lengua",
            f: "Gramática, vocabulario y corrección.",
            ex: "Variedad de tiempos y vocabulario preciso; errores que no dificulten.",
          },
          {
            l: "B",
            c: "B" as const,
            n: "Mensaje",
            f: "Ideas, desarrollo y cumplimiento de la tarea.",
            ex: "Cumple la tarea: todas las ideas pedidas, desarrolladas con ejemplos.",
          },
          {
            l: "C",
            c: "C" as const,
            n: "Comprensión conceptual",
            f: "Tipo de texto, registro y destinatario.",
            ex: "Elige el tipo de texto y el registro correctos para el destinatario.",
          },
        ],
      },
      {
        tab: "Esp B · Oral",
        subject: "Lengua B · Español B",
        paper: "Oral Individual",
        scale: "A · B1 · B2 · C",
        items: [
          {
            l: "A",
            c: "A" as const,
            n: "Lengua",
            f: "Vocabulario, gramática y pronunciación.",
            ex: "Pronunciación clara y vocabulario variado durante la conversación.",
          },
          {
            l: "B1",
            c: "B" as const,
            n: "Mensaje · estímulo",
            f: "Presentación del estímulo visual.",
            ex: "Describe el estímulo y relaciónalo con la cultura hispana.",
          },
          {
            l: "B2",
            c: "B" as const,
            n: "Mensaje · conversación",
            f: "Interacción y desarrollo de las ideas.",
            ex: "Respondes y amplías: das ejemplos, opinas, preguntas.",
          },
          {
            l: "C",
            c: "C" as const,
            n: "Comprensión conceptual",
            f: "Registro y conexión con los temas.",
            ex: "Adecúa el registro y conecta con los temas del curso.",
          },
        ],
      },
    ],
    critNote:
      "Pulsa cada prueba: los criterios, su foco y su peso cambian. Evaluamos con los de cada componente.",
    critExample: "Ejemplo",
    annotCriterion: "Criterio",
    annotKicker: "La corrección por dentro",
    annotTitle: "Una corrección anotada de verdad",
    annotSub:
      "No es una nota y ya. Cada marca señala un punto concreto de tu texto, con el criterio afectado y cómo subirlo. Toca una marca para verla.",
    annotLegend: "Criterios",
    annotHint: "Toca una marca del texto",
    annotCardProblem: "Qué detecta el examinador",
    annotCardFrom: "Tu fragmento",
    annotCardImproved: "Versión mejorada",
    annotCardWhy: "Por qué sube",
    annotSegments: [
      { t: '"La voz testimonial de Elsa Marín contribuye ' },
      {
        c: "D" as const,
        text: "de manera fundamental",
        name: "Lengua",
        problem: "Arranque con perífrasis genérica y verbo débil que diluye la tesis.",
        from: "La voz testimonial contribuye de manera fundamental al significado del texto",
        improved:
          "La voz testimonial de Elsa Marín vertebra el significado del texto: convierte el monólogo en confesión y obliga al lector a habitar su desesperanza desde dentro",
        why: "Cambiar «contribuye de manera fundamental» por «vertebra» y nombrar el género (confesión, monólogo) eleva el registro y jerarquiza la tesis.",
      },
      { t: " al significado del texto. Cuando cita " },
      {
        c: "A" as const,
        text: "«acá tenemos que manejar»",
        name: "Comprensión e interpretación",
        problem: "Cita alterada («manejar» por «morir») que invierte el sentido del texto.",
        from: "«acá nacimos y que acá tenemos que manejar» (líneas 2-3)",
        improved:
          "Elsa reproduce la voz de Andrés en estilo indirecto libre: «acá nacimos y que acá tenemos que morir» (ll. 2-3), fórmula que liga nacimiento, muerte y territorio en un mismo arraigo",
        why: "Restituir la cita correcta y nombrar el estilo indirecto libre evidencia un recurso clave y profundiza la interpretación.",
      },
      { t: ", invierte el sentido. Además, las palabras " },
      {
        c: "B" as const,
        text: "«tristes» y «pura piedra»",
        name: "Análisis y evaluación",
        problem:
          "Buen análisis del paisaje como reflejo anímico, pero sin nombrar el recurso ni desarrollar su efecto.",
        from: "«tristes» y «pura piedra» convierten el paisaje en un reflejo del estado emocional de los personajes",
        improved:
          "La adjetivación emotiva («tristes») y la personificación de los yuyos que «arañan el viento» transforman el paisaje en correlato del ánimo de Elsa: la esterilidad de la tierra anticipa la sequedad final de los cuerpos «resecos»",
        why: "Nombrar los recursos (adjetivación, personificación, correlato objetivo) y conectarlos con el cierre eleva el análisis al nivel evaluativo del Criterio B.",
      },
      { t: " reflejan el estado de los personajes." },
    ],
    oralKicker: "Novedad · Spanish B",
    oralTitle: "Habla con tu profesor virtual",
    oralSub:
      "El oral de Spanish B como una videollamada: el profesor te muestra un estímulo, lo presentas y conversáis en español sobre los temas. Tú solo enciendes el micro.",
    oralPoints: [
      "Estímulo visual (NM) o pasaje literario (NS), como en el examen",
      "Presentas y luego te repregunta sobre el tema",
      "Transcripción en vivo + feedback por criterios",
    ],
    oralCredits: "Sesión completa por créditos · sin suscripción",
    oralTeacher: "Profesora IA · Lengua B",
    oralLive: "En directo",
    oralSpeaking: "Hablando",
    oralListening: "Escuchando",
    oralMic: "Tu micrófono",
    oralStimulus: "Estímulo visual",
    oralTheme: "Identidades",
    oralLevel: "NM",
    oralShared: "El profesor comparte un estímulo",
    oralTurns: [
      {
        who: "ai" as const,
        text: "Cuando quieras, describe la fotografía y relaciónala con el mundo hispano.",
      },
      {
        who: "user" as const,
        text: "En la foto veo a una familia de varias generaciones en una comida; para mí refleja la importancia de la familia en la cultura hispana.",
      },
      {
        who: "ai" as const,
        text: "Has hablado de las tradiciones familiares. ¿Crees que los jóvenes las mantienen igual hoy?",
      },
      {
        who: "user" as const,
        text: "Creo que algunas cambian, pero muchas se conservan, sobre todo en las fiestas.",
      },
    ],
    quotesKicker: "Quién lo usa",
    quotes: [
      {
        q: "Por primera vez mis alumnos entienden por qué su párrafo no es banda 5. El feedback es concreto, anclado al texto, y nunca inventa citas.",
        who: "Profesora IB",
        role: "Coordinadora de Lengua A · 20+ años en el Diploma",
      },
      {
        q: "Después de dos intentos pasé de banda 3 a banda 5 en Criterio B. Entendí exactamente qué fallaba en mi análisis.",
        who: "Alumna de 12º",
        role: "Español A: Literatura",
      },
    ],
    faqTitle: "Dudas razonables",
    faq: [
      {
        q: "¿Esto es hacer trampa?",
        a: "No. LIBerico no escribe por ti: evalúa lo que tú escribes y te muestra qué mejorar, como haría un tutor.",
      },
      {
        q: "¿Está afiliado al IB?",
        a: "No. Es una herramienta independiente creada por docentes con experiencia en el programa. No forma parte de la IBO ni cuenta con su respaldo.",
      },
      {
        q: "¿Cuánto cuesta de verdad?",
        a: "La corrección vale 1,50 €. Si además quieres el texto corregido parte por parte, son 2 € más. La recarga mínima es de 5 € y no hay mensualidad.",
      },
      {
        q: "¿Y si no estoy de acuerdo con la nota?",
        a: "Es una estimación calibrada por examinadores, no una nota oficial. Úsala como punto de partida para hablarlo con tu profesor: nadie conoce tu trabajo mejor que tú.",
      },
      {
        q: "¿Mis textos son privados?",
        a: "Sí. No compartimos tus análisis con terceros. Tienes el detalle en la política de privacidad.",
      },
    ],
    finalTitle: "Tu próximo comentario puede ser más preciso, más profundo y más IB.",
    finalSub: "Sin suscripción. Sin compromiso. Una corrección cuando la necesites.",
    teacher: "¿Eres docente?",
    teacherLink: "Entra al panel de profesor",
    footerDisc: "No afiliado ni avalado por el International Baccalaureate (IBO)",
    privacy: "Privacidad",
    cookies: "Cookies",
    terms: "Términos",
  },
};

export type LandingCopy = typeof COPY.es;

// English mirrors the Spanish structure.
const COPY_EN: typeof COPY.es = {
  nav: {
    how: "How it works",
    pricing: "Pricing",
    trust: "Reliability",
    courses: "Subjects",
    reviews: "Reviews",
    faq: "FAQ",
  },
  login: "Sign in",
  cta: "Mark my text",
  cta_short: "Start",
  h1a: "Feedback specialised in ",
  h1mark: "IB language courses",
  h1b: ", with examiner-level rigour.",
  sub: "Paste your commentary, essay or oral and get the grade by criteria, with detailed comments and clear suggestions on how to improve. No subscription: you pay only when you use it.",
  priceFrom: "from",
  price: "€1.50",
  priceUnit: "per correction",
  pillars: [
    {
      t: "IB criteria, applied with rigour",
      d: "It applies the criteria with the rigour of someone who has marked and standardised grade boundaries in the IB.",
    },
    {
      t: "No subscription",
      d: "Monthly plans hook you. Here you pay per correction: if it helps, keep going; if not, don't use it.",
    },
  ],
  heroLoop: {
    deskLabel: "Literary analysis corrector · IB English A: Literature SL · Paper 1",
    passageLabel: "Literary text",
    questionLabel: "Guiding question",
    analysisLabel: "Your analysis",
    passage:
      "The lighthouse was still there, tall and useless, at the end of the breakwater. Marta watched it every evening from the window, like someone keeping watch over something that can no longer be saved. The sea was a grey field that breathed slowly under the fog, and the light turned without lighting anyone home. Since her father's death, she had learned to look at the water the same way: with a waiting she could not name.",
    question:
      "How does the text build the relationship between the lighthouse and the protagonist's inner state?",
    analysis: [
      "This text is about a woman, Marta, who looks at the lighthouse from her window after losing her father. The author uses the lighthouse and the sea to show how she feels inside. In this analysis I am going to explain how he uses these images and for what purpose.",
      "First, the lighthouse represents Marta. The author says it is 'tall and useless', and that shows she also feels useless and alone after her father's death. The purpose is to convey sadness to the reader.",
      "He also uses the sea. He says it is 'a grey field that breathed', which is a very beautiful metaphor to show the sea as something alive. This creates an image that conveys calm and sorrow at the same time.",
      "In conclusion, the author uses the lighthouse and the sea to convey Marta's pain. I think he does it above all so the reader understands how she feels.",
    ],
    credits: "1.5 cr",
    evalBtn: "Evaluate analysis",
    resultLabel: "Result",
    resultTitle: "Criteria-based evaluation",
    scoreLabel: "Score",
    scoreVal: "12",
    scoreMax: "/20",
    gradeLabel: "Grade",
    gradeVal: "5",
    critHeading: "Criteria marking",
    crit: [
      {
        l: "A" as const,
        n: "Understanding and interpretation",
        s: 3,
        max: 5,
        comment:
          "Grasps the literal sense and supports it with apt quotations ('tall and useless', 'a grey field that breathed'). The reading stays on the surface: it never explores why the light 'turns without lighting anyone home' nor the waiting Marta 'could not name'.",
      },
      {
        l: "B" as const,
        n: "Analysis and evaluation",
        s: 3,
        max: 5,
        comment:
          "Identifies devices —the sea image, the lighthouse as symbol— and orders them. The reading of effect is general: it calls a personification a 'metaphor' and never comments how the useless light builds the grief.",
      },
      {
        l: "C" as const,
        n: "Focus and organisation",
        s: 3,
        max: 5,
        comment:
          "Clear organisation: thesis, one paragraph per image and a conclusion. Focus holds, but the progression is additive ('first', 'also') rather than argumentative.",
      },
      {
        l: "D" as const,
        n: "Language",
        s: 3,
        max: 5,
        comment:
          "Correct, clear language with few errors. At times colloquial ('a very beautiful metaphor', 'I think') and with limited critical lexis: 'use', 'show' and 'convey' repeat.",
      },
    ],
    globalLabel: "Global evaluation comment",
    global:
      "A competent, well-aimed analysis that answers the question. Mid-band (a 3 across all four criteria, grade 5): there is solid understanding and order, but the analysis stops at identifying and describing the effect, without probing how the lighthouse and the sea build Marta's grief.",
    strengthsLabel: "Strengths",
    strengths:
      "Good literal understanding and apt choice of quotations. The image-by-image structure fits the question and the close ties the lighthouse and the sea to a single feeling.",
    areasLabel: "Areas to improve",
    areas:
      "Go deeper into the effect: name the devices precisely (personification, not metaphor) and tie them to the grief. Avoid colloquial turns and school metadiscourse ('I am going to explain').",
    ctaChip: "Full feedback · +2 cr",
    ctaTitle: "Annotated response, language and high-band essay",
    ctaSub: "Keeps your voice; shows how to raise each criterion.",
    fbBtn: "Give me full feedback",
    annotHeading: "Your annotated response",
    annot: [
      [
        { t: "This text is about a woman who watches the lighthouse after losing her father. " },
        { h: "The author uses the lighthouse and the sea", c: "D" as const },
        { t: " to show how she feels. " },
        { h: "In this analysis I am going to explain how he uses these images", c: "D" as const },
        { t: "." },
      ],
      [
        { h: "The lighthouse represents Marta", c: "A" as const },
        { t: ": the author says it is 'tall and useless'. " },
        { h: "It is a very beautiful metaphor", c: "B" as const },
        { t: " of the sea as something alive." },
      ],
    ],
    pop: {
      kicker: "D · Language · high-band rewrite",
      body: "School metadiscourse ('I am going to explain') and repeated 'use'. Lower the academic scaffolding.",
      fix: "the author ties the lighthouse and the sea to embody Marta's grief",
    },
    langHeading: "Analytical language · precision",
    lang: [
      {
        kind: "verb" as const,
        tag: "'use' × 6",
        from: "the author uses the lighthouse and the sea",
        to: "the author deploys / articulates the lighthouse and the sea",
      },
      {
        kind: "verb" as const,
        tag: "'convey' × 3",
        from: "to convey sadness to the reader",
        to: "to build / embody the grief",
      },
      {
        kind: "colo" as const,
        tag: "Colloquialism",
        from: "'a very beautiful metaphor'",
        to: "an image that gives life to the landscape",
      },
    ],
    essayHeading: "Your essay raised to high band",
    essaySub: "The same idea, developed with precision and without losing your voice.",
    essay: [
      "The text gives voice to Marta's grief through two images that hold each other up: the lighthouse and the sea. From the first line the lighthouse stands 'tall and useless', and that uselessness does not describe her — it embodies her: like the light that turns 'without lighting anyone home', Marta keeps watch over something that can no longer be saved.",
      "The sea extends that state. By personifying it as 'a grey field that breathed', the author makes it a living, slow body, paced like Marta's waiting. It is not just a beautiful image: the sea's breathing measures the stalled time of grief, and the fog that covers it is the same that clouds her gaze.",
      "That is why the lighthouse and the water end up saying the same thing. The light that does not illuminate and the waiting Marta 'could not name' mirror each other: the landscape does not accompany her pain, it thinks it for her. The text does not explain the grief; it lets it turn, like the lighthouse beam, over a surface that no longer expects an answer.",
    ],
    chips: [
      { c: "A" as const, t: "A ↑ interpretation" },
      { c: "B" as const, t: "B ↑ devices" },
      { c: "C" as const, t: "C ↑ progression" },
      { c: "D" as const, t: "D ↑ lexis" },
    ],
  },
  tiers2: {
    kicker: "Every correction, in two parts",
    title: "Start with the grade. Go deeper when you want.",
    sub: "The base correction gives you the criteria-based evaluation. Full feedback opens the annotations, the language diagnosis and the high-band rewrite.",
    base: {
      tag: "Correction",
      price: "€1.50",
      title: "The criteria-based evaluation",
      points: [
        "Estimated IB grade for the paper",
        "Grade and comment for each criterion",
        "Global comment, strengths and areas to improve",
        "Saved to your progress history",
      ],
    },
    full: {
      badge: "What truly teaches",
      tag: "Full feedback",
      price: "+€2.00",
      title: "Diagnosis, annotations and rewrite",
      points: [
        "Annotated response: sentence-by-sentence comments",
        "Language diagnosis: weak verbs and interference",
        "Full essay raised to high band, in your voice",
        "What is kept, what is transformed and which criteria rise",
      ],
    },
  },
  authorityKicker: "Why trust the grade",
  authorityTitle: "Calibrated by the people who set the boundaries",
  authorityBody:
    "LIBerico is built by teachers with decades in the Diploma Programme: they have examined, trained students, and taken part in the standardisation that decides where each band falls. That experience is what the corrector applies to your text. It's an independent project, with no official affiliation with the International Baccalaureate.",
  proofStat: { v: "20+", l: "years examining and standardising IB exams" },
  proofs: [
    {
      t: "They know grade boundaries from the inside",
      d: "They've taken part in the standardisation that decides where each band falls.",
    },
    {
      t: "Your paper's criteria, not a generic rubric",
      d: "Each component is assessed with its own official IB criteria.",
    },
    {
      t: "A calibrated estimate, not an official grade",
      d: "Made to guide you and to discuss with your teacher.",
    },
  ],
  howKicker: "Three steps",
  howTitle: "From your draft to an IB band",
  how: [
    {
      t: "Paste your text",
      d: "Your commentary, essay or oral script. Pick the paper and subject.",
    },
    {
      t: "Get the grade",
      d: "In seconds: bands A–D, an estimated grade out of 7, and the examiner's comment.",
    },
    {
      t: "Iterate and rise",
      d: "Revise with the feedback, resubmit and measure the jump. Your history tracks it.",
    },
  ],
  priceTitle: "Pay only when you use it",
  priceLead:
    "Other platforms tie you to a monthly fee even if you only need three corrections in May. Here you buy credit and spend it at your pace.",
  usTag: "LIBerico · pay per use",
  us: [
    "€1.50 per correction",
    "No subscription, no lock-in",
    "Top up from €5, whenever",
    "If you don't use it, you don't pay",
  ],
  themTag: "Others · subscription",
  them: [
    "Mandatory monthly fee",
    "You pay even if you don't practise",
    "Auto-renewal and lock-in",
    "Pressure to 'get your money's worth'",
  ],
  tiersNote: "Minimum top-up €5. No monthly fee, no commitment.",
  priceMatrix: {
    kicker: "Pricing",
    title: "What each thing costs",
    sub: "No bundles, no surprises: each action spends a fixed number of credits, and 1 credit = €1.",
    colProduct: "What you correct",
    colCost: "Cost",
    rows: [
      {
        name: "Correction · Paper 1",
        desc: "Grade by criteria and comment",
        euro: "€1.50",
        credits: "1.5 credits",
        tag: "",
      },
      {
        name: "Correction · Paper 2",
        desc: "Comparative essay assessed",
        euro: "€2.00",
        credits: "2 credits",
        tag: "",
      },
      {
        name: "Individual oral feedback",
        desc: "Evaluation of the script and questions",
        euro: "€2.00",
        credits: "2 credits",
        tag: "",
      },
      {
        name: "Full feedback",
        desc: "Annotations, language diagnosis and high-band rewrite",
        euro: "+€2.00",
        credits: "+2 credits",
        tag: "Add-on",
      },
      {
        name: "Live oral session",
        desc: "Live oral with examiner avatar",
        euro: "€5.00",
        credits: "5 credits",
        tag: "Spanish B",
      },
    ],
    note: "1 credit = €1 · top up from €5 (up to 200) · no subscription.",
  },
  coursesKicker: "Available courses",
  coursesTitle: "Available subjects, with the same IB rigour",
  courses: [
    {
      subject: "Spanish A: Literature",
      level: "SL/HL",
      exams: ["Paper 1", "Paper 2", "Individual oral"],
    },
    {
      subject: "English A: Literature",
      level: "SL/HL",
      exams: ["Paper 1", "Paper 2", "Individual oral"],
    },
    {
      subject: "Spanish B",
      level: "SL/HL",
      exams: ["Paper 1", "Paper 2", "Individual oral"],
    },
  ],
  upcomingKicker: "Coming soon",
  upcomingCourses: [
    "English A: Language and Literature",
    "Spanish A: Language and Literature",
    "English B",
    "French B",
    "German B",
    "Polish A: Literature",
    "Turkish A: Literature",
  ],
  critKicker: "No shortcuts",
  critTitle: "Each paper has its own criteria",
  critSub:
    "We don't use a single rubric. LIBerico applies the official criteria of each component — and they change by paper and by subject.",
  critTabs: [
    {
      tab: "Lit · P1",
      subject: "Language A · Literature",
      paper: "Paper 1 — Guided analysis",
      scale: "A–D · /20",
      items: [
        {
          l: "A",
          c: "A" as const,
          n: "Understanding and interpretation",
          f: "Reading of the text, inferences and nuance.",
          ex: "Not 'it talks about loss', but 'it installs loss as a present that never ceases'.",
        },
        {
          l: "B",
          c: "B" as const,
          n: "Analysis and evaluation",
          f: "The effect of the devices on the reader.",
          ex: "From 'it uses anaphora' to 'the anaphora turns the poem into an internal struggle'.",
        },
        {
          l: "C",
          c: "C" as const,
          n: "Focus and organisation",
          f: "Structure of the commentary and coherence.",
          ex: "Each paragraph advances the thesis; transitions connect, not just list.",
        },
        {
          l: "D",
          c: "D" as const,
          n: "Language",
          f: "Lexical precision and academic register.",
          ex: "Exact quotes and precise verbs: 'anchors', not 'is very important'.",
        },
      ],
    },
    {
      tab: "Lit · P2",
      subject: "Language A · Literature",
      paper: "Paper 2 — Comparative essay",
      scale: "A–D · /30",
      items: [
        {
          l: "A",
          c: "A" as const,
          n: "Knowledge and interpretation",
          f: "Command of both works and their context.",
          ex: "Show you know both works and their context, not just the plot.",
        },
        {
          l: "B",
          c: "B" as const,
          n: "Analysis and evaluation",
          f: "Comparison of each author's choices.",
          ex: "Compare: how each author uses the narrator for the same theme.",
        },
        {
          l: "C",
          c: "C" as const,
          n: "Focus and organisation",
          f: "Through-line and argument progression.",
          ex: "One comparative thesis that progresses, not two parallel summaries.",
        },
        {
          l: "D",
          c: "D" as const,
          n: "Language",
          f: "Clarity and sustained academic register.",
          ex: "Sustained academic register and precise comparison connectors.",
        },
      ],
    },
    {
      tab: "Lit · Oral",
      subject: "Language A · Literature",
      paper: "Individual Oral",
      scale: "A–D · /40",
      items: [
        {
          l: "A",
          c: "A" as const,
          n: "Knowledge and interpretation",
          f: "The works and the chosen global issue.",
          ex: "Connect the works to a specific global issue, not a generic one.",
        },
        {
          l: "B",
          c: "B" as const,
          n: "Analysis and evaluation",
          f: "How meaning is built in each work.",
          ex: "Explain how meaning is built, with memorised quotations.",
        },
        {
          l: "C",
          c: "C" as const,
          n: "Focus and organisation",
          f: "Structure and balance of the talk.",
          ex: "Balance across both works and a clear 10-minute structure.",
        },
        {
          l: "D",
          c: "D" as const,
          n: "Language",
          f: "Fluency and precision in spoken language.",
          ex: "Pauses and self-corrections don't penalise if you communicate clearly.",
        },
      ],
    },
    {
      tab: "Spanish B · Writing",
      subject: "Language B · Spanish B",
      paper: "Written production",
      scale: "A · B · C",
      items: [
        {
          l: "A",
          c: "A" as const,
          n: "Language",
          f: "Grammar, vocabulary and accuracy.",
          ex: "A range of tenses and precise vocabulary; errors that don't impede.",
        },
        {
          l: "B",
          c: "B" as const,
          n: "Message",
          f: "Ideas, development and task completion.",
          ex: "Complete the task: every required idea, developed with examples.",
        },
        {
          l: "C",
          c: "C" as const,
          n: "Conceptual understanding",
          f: "Text type, register and audience.",
          ex: "Choose the right text type and register for the audience.",
        },
      ],
    },
    {
      tab: "Spanish B · Oral",
      subject: "Language B · Spanish B",
      paper: "Individual Oral",
      scale: "A · B1 · B2 · C",
      items: [
        {
          l: "A",
          c: "A" as const,
          n: "Language",
          f: "Vocabulary, grammar and pronunciation.",
          ex: "Clear pronunciation and varied vocabulary throughout the conversation.",
        },
        {
          l: "B1",
          c: "B" as const,
          n: "Message · stimulus",
          f: "Presentation of the visual stimulus.",
          ex: "Describe the stimulus and connect it to the Spanish-speaking world.",
        },
        {
          l: "B2",
          c: "B" as const,
          n: "Message · conversation",
          f: "Interaction and development of ideas.",
          ex: "You answer and expand: give examples, give opinions, ask back.",
        },
        {
          l: "C",
          c: "C" as const,
          n: "Conceptual understanding",
          f: "Register and link to the themes.",
          ex: "Adapt the register and connect to the course themes.",
        },
      ],
    },
  ],
  critNote:
    "Tap each paper: the criteria, their focus and their weight change. We assess with each component's own.",
  critExample: "Example",
  annotCriterion: "Criterion",
  annotKicker: "Inside a correction",
  annotTitle: "What an annotated correction really looks like",
  annotSub:
    "Not just a grade. Every mark points to a specific spot in your text, with the criterion it affects and how to raise it. Tap a mark to see it.",
  annotLegend: "Criteria",
  annotHint: "Tap a mark in the text",
  annotCardProblem: "What the examiner spots",
  annotCardFrom: "Your excerpt",
  annotCardImproved: "Improved version",
  annotCardWhy: "Why it rises",
  annotSegments: [
    { t: "\"Elsa Marín's testimonial voice " },
    {
      c: "D" as const,
      text: "fundamentally contributes",
      name: "Language",
      problem: "A generic periphrasis and a weak verb that dilute the thesis.",
      from: "The testimonial voice fundamentally contributes to the meaning of the text",
      improved:
        "Elsa Marín's testimonial voice anchors the meaning of the text: it turns the monologue into a confession and forces the reader to inhabit her despair from within",
      why: "Swapping 'fundamentally contributes' for 'anchors' and naming the genre (confession, monologue) lifts the register and sharpens the thesis.",
    },
    { t: " to the meaning of the text. When it quotes " },
    {
      c: "A" as const,
      text: "'here we have to manage'",
      name: "Understanding and interpretation",
      problem: "An altered quote ('manage' for 'die') that inverts the meaning of the text.",
      from: "'here we were born and here we have to manage' (lines 2-3)",
      improved:
        "Elsa relays Andrés's voice in free indirect style: 'here we were born and here we have to die' (ll. 2-3), a formula binding birth, death and land into a single rootedness",
      why: "Restoring the exact quote and naming the free indirect style reveals a key device and deepens the interpretation.",
    },
    { t: ", it inverts the sense. The words " },
    {
      c: "B" as const,
      text: "'sad' and 'pure stone'",
      name: "Analysis and evaluation",
      problem:
        "Good reading of the landscape as a mood-mirror, but the device is unnamed and its effect undeveloped.",
      from: "'sad' and 'pure stone' turn the landscape into a reflection of the characters' emotional state",
      improved:
        "The emotive adjective ('sad') and the personification of the weeds that 'claw at the wind' turn the landscape into a correlative of Elsa's mood: the barrenness of the land foreshadows the final dryness of the 'withered' bodies",
      why: "Naming the devices (emotive adjective, personification, objective correlative) and tying them to the close lifts the analysis to the evaluative level of Criterion B.",
    },
    { t: " also mirror the characters' state." },
  ],
  oralKicker: "New · Spanish B",
  oralTitle: "Talk to your virtual teacher",
  oralSub:
    "The Spanish B oral as a video call: the teacher shows you a stimulus, you present it and discuss the themes in Spanish. You only turn on your mic.",
  oralPoints: [
    "Visual stimulus (SL) or literary passage (HL), like the exam",
    "You present, then it follows up on the theme",
    "Live transcription + feedback by criteria",
  ],
  oralCredits: "Full session on credits · no subscription",
  oralTeacher: "AI teacher · Language B",
  oralLive: "Live",
  oralSpeaking: "Speaking",
  oralListening: "Listening",
  oralMic: "Your microphone",
  oralStimulus: "Visual stimulus",
  oralTheme: "Identities",
  oralLevel: "SL",
  oralShared: "The teacher shares a stimulus",
  oralTurns: [
    {
      who: "ai" as const,
      text: "Cuando quieras, describe la fotografía y relaciónala con el mundo hispano.",
    },
    {
      who: "user" as const,
      text: "En la foto veo a una familia de varias generaciones en una comida; para mí refleja la importancia de la familia en la cultura hispana.",
    },
    {
      who: "ai" as const,
      text: "Has hablado de las tradiciones familiares. ¿Crees que los jóvenes las mantienen igual hoy?",
    },
    {
      who: "user" as const,
      text: "Creo que algunas cambian, pero muchas se conservan, sobre todo en las fiestas.",
    },
  ],
  quotesKicker: "Who uses it",
  quotes: [
    {
      q: "For the first time my students understand why their paragraph isn't band 5. The feedback is concrete, anchored to the text, and never invents quotations.",
      who: "IB teacher",
      role: "Language A Coordinator · 20+ years in the Diploma",
    },
    {
      q: "After two attempts I went from band 3 to band 5 in Criterion B. I understood exactly what was failing in my analysis.",
      who: "Year 12 student",
      role: "English A: Literature",
    },
  ],
  faqTitle: "Fair questions",
  faq: [
    {
      q: "Is this cheating?",
      a: "No. LIBerico doesn't write for you: it assesses what you write and shows you how to improve, like a tutor would.",
    },
    {
      q: "Is it affiliated with the IB?",
      a: "No. It's an independent tool built by teachers with experience in the programme. It is not part of the IBO and has no official endorsement.",
    },
    {
      q: "What does it really cost?",
      a: "A correction is €1.50. If you also want the text marked up line by line, that's €2 more. The minimum top-up is €5 and there's no monthly fee.",
    },
    {
      q: "What if I disagree with the grade?",
      a: "It's an estimate calibrated by examiners, not an official grade. Use it as a starting point to discuss with your teacher: nobody knows your work better than you.",
    },
    {
      q: "Are my texts private?",
      a: "Yes. We don't share your analyses with third parties. The details are in the privacy policy.",
    },
  ],
  finalTitle: "Your next commentary can be more precise, more analytical, and more IB.",
  finalSub: "No subscription. No commitment. A correction when you need it.",
  teacher: "Are you a teacher?",
  teacherLink: "Open the teacher panel",
  footerDisc: "Not affiliated with or endorsed by the International Baccalaureate (IBO)",
  privacy: "Privacy",
  cookies: "Cookies",
  terms: "Terms",
};

// ── Section eyebrow ────────────────────────────────────────────────────────────

// ── Dato de autoridad: cuenta de 0 al valor al entrar en viewport ─────────────

function CountUpStat({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : null;
  const suffix = match ? match[2] : "";
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(target ?? 0);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setN(target);
      return;
    }
    setN(0);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const duration = 1100;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
          setN(Math.round(eased * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  if (target === null) {
    return (
      <span className={className} style={style}>
        {value}
      </span>
    );
  }
  return (
    <span ref={ref} className={className} style={style}>
      {n}
      {suffix}
    </span>
  );
}

// ── Eyebrow ───────────────────────────────────────────────────────────────────

function Eyebrow({ children, color = L.primary }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1"
      style={{ backgroundColor: color + "14" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em]" style={{ color }}>
        {children}
      </span>
    </div>
  );
}

// ── FAQ row ──────────────────────────────────────────────────────────────────

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mb-3 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: L.surface,
        border: `1px solid ${L.line}`,
        boxShadow: open ? cardShadow : "none",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[0.98rem] font-semibold" style={{ color: L.ink }}>
          {q}
        </span>
        <span
          className="lib-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: open ? L.primary : L.bg2,
            color: open ? "#fff" : L.primary,
          }}
        >
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </span>
      </button>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? 240 : 0,
          transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <p className="px-5 pb-5 pr-12 text-[0.9rem] leading-relaxed" style={{ color: L.muted }}>
          {a}
        </p>
      </div>
    </div>
  );
}

// ── Annotated correction (faithful to the real AnalisisAnotado) ───────────────

// ── Language switcher (globe + dropdown) ──────────────────────────────────────

function LangMenu({ lang, onChange }: { lang: LandingLang; onChange: (l: LandingLang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options: { value: LandingLang; label: string }[] = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={lang === "es" ? "Cambiar idioma" : "Change language"}
        className="lib-press flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:text-[#0F172A]"
        style={{ color: open ? L.primary : L.muted }}
      >
        <Globe className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        <span className="text-[0.66rem] font-semibold uppercase tracking-widest">{lang}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[9rem] overflow-hidden rounded-2xl py-1.5"
          style={{
            backgroundColor: L.surface,
            border: `1px solid ${L.line}`,
            boxShadow: cardShadow,
          }}
        >
          {options.map((opt) => {
            const active = opt.value === lang;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[0.8rem] font-medium transition-colors hover:bg-[rgba(15,23,42,0.04)]"
                style={{ color: active ? L.primary : L.ink }}
              >
                {opt.label}
                {active && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const [lang, setLang] = useState<LandingLang>("es");
  const c = lang === "en" ? COPY_EN : COPY.es;

  useEffect(() => {
    setLang(getInitialLang());
  }, []);

  const changeLang = (l: LandingLang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const navLinks = [
    { id: "trust", label: c.nav.trust },
    { id: "courses", label: c.nav.courses },
    { id: "reviews", label: c.nav.reviews },
    { id: "faq", label: c.nav.faq },
  ];

  const heading = { ...fontSans, letterSpacing: "-0.025em" } as CSSProperties;

  // barra de progreso de scroll
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.25 });

  // sombra del header al hacer scroll
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll-spy: resalta la sección visible en el nav
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    const ids = ["trust", "courses", "reviews", "faq"];
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const reduce = useReducedMotion();
  const heroContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
  };
  const heroItem: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  // botón primario reutilizable (índigo + glow)
  const ctaPrimary: CSSProperties = {
    backgroundColor: L.primary,
    color: "#fff",
    boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
  };

  return (
    <div
      id="top"
      className="min-h-screen w-full overflow-x-clip"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      {/* scroll progress */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
        style={{
          scaleX: progressX,
          background: `linear-gradient(90deg, ${L.primary}, ${L.amber})`,
        }}
      />

      {/* NAV */}
      <nav
        aria-label="Principal"
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          borderBottom: `1px solid ${scrolled ? L.line : "transparent"}`,
          backgroundColor: scrolled ? "rgba(246,245,242,0.92)" : "rgba(246,245,242,0.55)",
          boxShadow: scrolled
            ? "0 1px 0 rgba(15,23,42,0.04), 0 10px 30px -18px rgba(15,23,42,0.25)"
            : "none",
          transition: "background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <a
            href="#top"
            className="text-xl font-extrabold tracking-tight transition-opacity hover:opacity-70 sm:text-2xl"
            style={{ ...heading, color: L.ink }}
          >
            L<span style={{ color: L.amber }}>IB</span>erico
          </a>
          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => {
              const on = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className="lib-navlink relative text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[#4F46E5]"
                  style={{ color: on ? L.primary : L.muted }}
                >
                  {item.label}
                  {on && (
                    <motion.span
                      layoutId="navDot"
                      className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: L.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <LangMenu lang={lang} onChange={changeLang} />
            <Link
              to="/login"
              className="hidden text-[0.72rem] font-semibold uppercase tracking-widest transition-opacity hover:opacity-70 sm:inline-block"
              style={{ color: L.ink }}
            >
              {c.login}
            </Link>
            <Link
              to="/login"
              className="lib-press rounded-full px-4 py-2 text-[0.64rem] font-bold uppercase tracking-widest sm:px-5 sm:text-[0.7rem]"
              style={{ backgroundColor: L.ink, color: "#fff" }}
            >
              {c.cta_short}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section
          className="relative overflow-hidden"
          style={{ borderBottom: `1px solid ${L.line}` }}
        >
          <div className="lib-grid" aria-hidden />
          <div
            className="lib-glow-blob lib-glow-1"
            aria-hidden
            style={{ backgroundColor: L.primary }}
          />
          <div
            className="lib-glow-blob lib-glow-2"
            aria-hidden
            style={{ backgroundColor: L.amber }}
          />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
            {/* left: thesis */}
            <motion.div
              variants={heroContainer}
              initial="hidden"
              animate="show"
              className="max-w-[38rem]"
            >
              <motion.h1
                variants={heroItem}
                className="mb-5 text-[2.3rem] font-extrabold leading-[1.04] sm:text-[2.9rem] lg:text-[3.5rem]"
                style={{ ...heading, color: L.ink }}
              >
                {c.h1a}
                <span className="lib-underline" style={{ position: "relative", color: L.primary }}>
                  {c.h1mark}
                </span>
                {c.h1b}
              </motion.h1>

              <motion.p
                variants={heroItem}
                className="mb-8 max-w-[32rem] text-[1.1rem] leading-relaxed"
                style={{ color: L.muted }}
              >
                {c.sub}
              </motion.p>

              <motion.div variants={heroItem} className="mb-9 flex flex-wrap items-center gap-5">
                <Link
                  to="/login"
                  className="lib-press group inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold uppercase tracking-[0.07em]"
                  style={ctaPrimary}
                >
                  {c.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span
                  className="inline-flex flex-col"
                  style={{ borderLeft: `2px solid ${L.amber}`, paddingLeft: "0.8rem" }}
                >
                  <span
                    className="text-[0.62rem] uppercase tracking-[0.12em]"
                    style={{ color: L.muted }}
                  >
                    {c.priceFrom}
                  </span>
                  <span className="text-base font-bold" style={{ ...fontMono, color: L.ink }}>
                    {c.price}{" "}
                    <span className="text-[0.72rem] font-normal" style={{ color: L.muted }}>
                      {c.priceUnit}
                    </span>
                  </span>
                </span>
              </motion.div>

              {/* trust strip */}
              <motion.div
                variants={heroItem}
                className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
              >
                {c.pillars.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 text-[0.82rem] font-medium"
                    style={{ color: L.ink }}
                  >
                    <Check
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: L.primary }}
                      aria-hidden
                    />
                    {p.t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* right: examiner readout (animated walkthrough) */}
            <motion.div
              className="flex w-full justify-center lg:justify-end"
              initial={{ opacity: 0, x: reduce ? 0 : 30, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <HeroLoop c={c} reduce={!!reduce} />
            </motion.div>
          </div>
        </section>

        {/* AUTHORITY — deep indigo band */}
        <section
          id="trust"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: DEEP.bg, color: DEEP.text }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
              <Reveal>
                <Eyebrow color={L.amber}>{c.authorityKicker}</Eyebrow>
                <h2
                  className="text-3xl font-extrabold leading-[1.1] sm:text-[2.6rem]"
                  style={heading}
                >
                  {c.authorityTitle}
                </h2>
                <p
                  className="mt-6 max-w-xl text-[1.02rem] leading-relaxed"
                  style={{ color: DEEP.muted }}
                >
                  {c.authorityBody}
                </p>
              </Reveal>
              <Reveal delay={120}>
                <div
                  className="rounded-2xl p-7 sm:p-8"
                  style={{ backgroundColor: DEEP.surface, border: `1px solid ${DEEP.border}` }}
                >
                  {/* dato fuerte y honesto */}
                  <div className="flex items-baseline gap-3">
                    <CountUpStat
                      value={c.proofStat.v}
                      className="text-5xl font-extrabold leading-none sm:text-6xl"
                      style={{ ...heading, ...fontMono, color: L.amber }}
                    />
                    <span className="text-[0.84rem] leading-snug" style={{ color: DEEP.muted }}>
                      {c.proofStat.l}
                    </span>
                  </div>

                  <div className="my-6 h-px w-full" style={{ backgroundColor: DEEP.border }} />

                  {/* credenciales del examinador */}
                  <ul className="flex flex-col gap-5">
                    {c.proofs.map((p, i) => {
                      const Icon = [Gauge, ListChecks, Compass][i] ?? Gauge;
                      const accent = [L.amber, "#A5B4FC", "#C4B5FD"][i] ?? L.amber;
                      return (
                        <li key={p.t}>
                          <Reveal delay={160 + i * 110} y={10} className="flex gap-3.5">
                            <span
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor: "rgba(255,255,255,0.05)",
                                border: `1px solid ${DEEP.border}`,
                              }}
                            >
                              <Icon
                                className="h-[18px] w-[18px]"
                                style={{ color: accent }}
                                aria-hidden
                              />
                            </span>
                            <div>
                              <div
                                className="text-[0.95rem] font-semibold leading-snug"
                                style={{ color: DEEP.text }}
                              >
                                {p.t}
                              </div>
                              <div
                                className="mt-1 text-[0.84rem] leading-relaxed"
                                style={{ color: DEEP.muted }}
                              >
                                {p.d}
                              </div>
                            </div>
                          </Reveal>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* COURSES */}
        <section
          id="courses"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: L.bg }}
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>{c.coursesKicker}</Eyebrow>
              <h2
                className="mb-14 max-w-2xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]"
                style={heading}
              >
                {c.coursesTitle}
              </h2>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.courses.map((course, i) => {
                const accent = ["#4F46E5", "#9A5E10", "#15803D"][i] ?? L.primary;
                return (
                  <Reveal key={course.subject} delay={i * 90}>
                    <div
                      className="lib-card flex h-full min-h-[230px] flex-col overflow-hidden rounded-[20px] p-7 sm:p-8"
                      style={{
                        backgroundColor: L.surface,
                        border: `1px solid ${L.line}`,
                        boxShadow: cardShadow,
                      }}
                    >
                      <div className="mb-7 flex items-center justify-between gap-3">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em]"
                          style={{ backgroundColor: accent + "18", color: accent }}
                        >
                          {course.level}
                        </span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: accent }}
                          aria-hidden="true"
                        />
                      </div>
                      <h3
                        className="text-2xl font-extrabold leading-tight"
                        style={{ ...heading, color: L.ink }}
                      >
                        {course.subject}
                      </h3>
                      <div
                        className="mt-6 border-t pt-5"
                        style={{ borderColor: L.lineSoft }}
                        aria-label={lang === "es" ? "Pruebas evaluadas" : "Assessed papers"}
                      >
                        <div
                          className="mb-3 text-[0.58rem] font-bold uppercase tracking-[0.16em]"
                          style={{ color: L.muted }}
                        >
                          {lang === "es" ? "Pruebas que evaluamos" : "Papers we assess"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {course.exams.map((exam) => (
                            <span
                              key={exam}
                              className="rounded-full px-3 py-1.5 text-[0.76rem] font-semibold"
                              style={{
                                backgroundColor: L.bg2,
                                border: `1px solid ${L.line}`,
                                color: L.ink,
                              }}
                            >
                              {exam}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={280}>
              <div
                className="mt-8 rounded-[18px] px-5 py-5 sm:px-6"
                style={{
                  backgroundColor: L.bg2,
                  border: `1px solid ${L.line}`,
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span
                    className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.18em]"
                    style={{ color: L.muted }}
                  >
                    {c.upcomingKicker}
                  </span>
                  <div className="flex flex-wrap gap-2" aria-label={c.upcomingKicker}>
                    {c.upcomingCourses.map((course) => (
                      <span
                        key={course}
                        className="rounded-full px-3 py-1.5 text-[0.74rem] font-semibold"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.58)",
                          border: `1px solid ${L.line}`,
                          color: L.muted,
                        }}
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ORAL PREVIEW (Spanish B) */}
        <OralPreview c={c} reduce={reduce} />

        {/* TESTIMONIALS */}
        <section
          id="reviews"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: L.bg }}
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <Eyebrow>{c.quotesKicker}</Eyebrow>
            </Reveal>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {c.quotes.map((quote, i) => {
                const accent = ["#6D28D9", "#4F46E5"][i] ?? L.primary;
                return (
                  <Reveal key={quote.who} delay={i * 110}>
                    <figure
                      className="lib-card flex h-full flex-col rounded-[20px] p-8 sm:p-10"
                      style={{
                        backgroundColor: L.surface,
                        border: `1px solid ${L.line}`,
                        boxShadow: cardShadow,
                      }}
                    >
                      <Quote className="mb-5 h-7 w-7" style={{ color: accent }} aria-hidden />
                      <blockquote
                        className="flex-1 text-lg leading-[1.55] sm:text-xl"
                        style={{ color: L.ink }}
                      >
                        {quote.q}
                      </blockquote>
                      <figcaption className="mt-7">
                        <div
                          className="mb-3 h-1 w-10 rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                        <div className="text-[0.9rem] font-bold" style={{ color: L.ink }}>
                          {quote.who}
                        </div>
                        <div
                          className="mt-0.5 text-[0.72rem] uppercase tracking-[0.14em]"
                          style={{ color: L.muted }}
                        >
                          {quote.role}
                        </div>
                      </figcaption>
                    </figure>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: L.bg2 }}
        >
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2
                className="mb-10 text-center text-3xl font-extrabold leading-tight sm:text-4xl"
                style={heading}
              >
                {c.faqTitle}
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <div>
                {c.faq.map((item) => (
                  <FaqRow key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* FINAL CTA — deep indigo band */}
        <section
          className="relative overflow-hidden px-6 py-24 text-center sm:px-8 sm:py-32"
          style={{ backgroundColor: DEEP.bg, color: DEEP.text }}
        >
          <div
            className="lib-glow-blob lib-glow-3"
            aria-hidden
            style={{ backgroundColor: L.amber }}
          />
          <div className="relative z-10 mx-auto max-w-3xl">
            <Reveal>
              <h2 className="text-3xl font-extrabold leading-[1.12] sm:text-5xl" style={heading}>
                {c.finalTitle}
              </h2>
              <div className="mt-10 flex justify-center">
                <Link
                  to="/login"
                  className="lib-press group inline-flex items-center gap-2.5 rounded-2xl px-10 py-5 text-base font-bold uppercase tracking-[0.07em] sm:text-lg"
                  style={{
                    backgroundColor: L.primary,
                    color: "#fff",
                    boxShadow: "0 16px 36px -14px rgba(79,70,229,0.7)",
                  }}
                >
                  {c.cta}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <p className="mt-7 text-[0.95rem]" style={{ color: DEEP.muted }}>
                {c.finalSub}
              </p>
              <p className="mt-10 text-[0.85rem]" style={{ color: DEEP.muted }}>
                {c.teacher}{" "}
                <Link
                  to="/login"
                  className="underline underline-offset-4"
                  style={{ color: "#C7D2FE" }}
                >
                  {c.teacherLink}
                </Link>
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        className="px-6 py-10 text-[0.62rem] uppercase tracking-[0.18em] sm:px-8"
        style={{ backgroundColor: DEEP.bgAlt, color: DEEP.muted }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <div>© 2026 LIBerico</div>
          <div>{c.footerDisc}</div>
          <div className="flex gap-6">
            <Link to="/privacy" className="transition-colors hover:text-white">
              {c.privacy}
            </Link>
            <Link to="/cookies" className="transition-colors hover:text-white">
              {c.cookies}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              {c.terms}
            </Link>
          </div>
        </div>
      </footer>

      {/* signature + interactions (claro premium) */}
      <style>{`
        .lib-underline::after{
          content:"";position:absolute;left:0;right:0;bottom:-0.06em;height:0.12em;border-radius:3px;
          background:linear-gradient(90deg, ${L.primary}, ${L.amber});
          transform:scaleX(0);transform-origin:left center;
          animation:libUnderline 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
        }
        @keyframes libUnderline{to{transform:scaleX(1);}}
        .lib-card{transition:transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease;}
        .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        .lib-press:active{transform:scale(0.96);}
        #top a:focus-visible, #top button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        .lib-navlink:focus-visible{outline-offset:6px;}
        .lib-navlink::after{content:"";position:absolute;left:2px;right:2px;bottom:-7px;height:2px;border-radius:2px;background:${L.primary};transform:scaleX(0);transform-origin:center;transition:transform 0.22s ease;}
        @media (hover:hover) and (pointer:fine){
          .lib-card:hover{transform:translateY(-4px);}
          .lib-navlink:hover::after{transform:scaleX(1);}
        }
        .lib-grid{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.7;
          background-image:linear-gradient(#E4E0D7 1px,transparent 1px),linear-gradient(90deg,#E4E0D7 1px,transparent 1px);
          background-size:46px 46px;
          -webkit-mask-image:radial-gradient(ellipse 62% 64% at 28% 38%, #000 0%, transparent 72%);
          mask-image:radial-gradient(ellipse 62% 64% at 28% 38%, #000 0%, transparent 72%);}
        .lib-glow-blob{position:absolute;border-radius:9999px;filter:blur(120px);pointer-events:none;z-index:0;}
        .lib-glow-1{width:34rem;height:34rem;top:-12rem;left:-10rem;opacity:0.10;animation:libDrift1 24s ease-in-out infinite;}
        .lib-glow-2{width:28rem;height:28rem;bottom:-14rem;right:-6rem;opacity:0.10;animation:libDrift2 28s ease-in-out infinite;}
        .lib-glow-3{width:40rem;height:40rem;top:-16rem;left:50%;margin-left:-20rem;opacity:0.16;}
        @keyframes libDrift1{0%,100%{transform:translate(0,0);}50%{transform:translate(26px,-18px);}}
        @keyframes libDrift2{0%,100%{transform:translate(0,0);}50%{transform:translate(-22px,18px);}}
        @media (prefers-reduced-motion: reduce){
          .lib-underline::after{animation:none;transform:scaleX(1);}
          .lib-card,.lib-press{transition:none;}
          .lib-card:hover{transform:none;}
          .lib-press:active{transform:none;}
          .lib-glow-blob{animation:none;}
          .lib-navlink::after{animation:none;transition:none;}
        }
      `}</style>
    </div>
  );
}
