import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { OralPreview } from "@/components/landing/OralPreview";
import { Reveal } from "@/components/landing/Reveal";

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
    nav: { how: "Cómo funciona", pricing: "Precio", courses: "Asignaturas", faq: "Dudas" },
    login: "Entrar",
    cta: "Corregir mi texto",
    cta_short: "Empezar",
    badge: "Examinadores y estandarizadores de notas de corte del IB",
    h1a: "La corrección que haría tu ",
    h1mark: "examinador del IB",
    h1b: ", en segundos.",
    sub: "Pega tu comentario y recibe la nota por criterios A–D y el comentario del examinador. Si quieres, te corregimos el texto parte por parte. Sin suscripción: pagas solo cuando lo usas.",
    priceFrom: "desde",
    price: "1,50 €",
    priceUnit: "por corrección",
    pillars: [
      {
        t: "Lo califica un examinador, no un chatbot",
        d: "Aplica los criterios con el rigor de quien ha examinado y estandarizado notas de corte en el IB.",
      },
      {
        t: "Sin suscripción, sin jaula",
        d: "Las mensualidades te enganchan. Aquí pagas por corrección: si te sirve, sigue; si no, no lo usas.",
      },
      {
        t: "Un paso, sin curva",
        d: "Pegas el texto, eliges la prueba y recibes la nota. Sin tutoriales ni configuración.",
      },
    ],
    sheet: {
      deskLabel: "Resultado real · IB Español A: Literatura NM · Prueba 1",
      tier1: "Corrección",
      tier1Price: "1,50 €",
      tier2: "Texto corregido",
      tier2Price: "+2,00 €",
      result: "Resultado",
      examiner: "Evaluación del examinador",
      work: "¿Cómo contribuye la voz testimonial de la narradora al significado del texto?",
      score: "Punt.",
      grade: "Nota est.",
      scoreVal: "13",
      bands: [
        { l: "A", n: "Comprensión e interpretación", s: 4 },
        { l: "B", n: "Análisis y evaluación", s: 3 },
        { l: "C", n: "Foco y organización", s: 3 },
        { l: "D", n: "Lengua", s: 3 },
      ],
      globalLabel: "Comentario global del examinador",
      global: [
        "Comprensión madura e interpretación coherente centrada en la voz testimonial. Para subir, profundiza en el ",
        "efecto de los recursos",
        " y cuida la ",
        "fidelidad de las citas",
        ".",
      ],
      annotLabel: "Tu solución anotada",
      lockChip: "+2 €",
      passage: [
        {
          t: '"La voz testimonial contribuye ',
          c: "D" as const,
          h: "de manera fundamental",
          t2: " al significado del texto. ",
        },
        {
          t: "Las palabras ",
          c: "B" as const,
          h: "«tristes» y «pura piedra»",
          t2: " reflejan el estado de los personajes, aunque cita ",
        },
        { t: "", c: "A" as const, h: "«acá tenemos que manejar»", t2: '."' },
      ],
      lockedNote: "Desbloquea el +2 € y subrayamos tu texto, parte por parte.",
      rwTitle: "Reescritura de banda alta",
      rwFromLabel: "Tu fragmento",
      rwFrom:
        '"Las palabras «tristes» y «pura piedra» convierten el paisaje en un reflejo del estado emocional de los personajes."',
      rwToLabel: "Versión mejorada",
      rwTo: '"La adjetivación emotiva («tristes») y la personificación de los yuyos que «arañan el viento» transforman el paisaje en correlato del ánimo de Elsa: la esterilidad de la tierra anticipa la sequedad final de los cuerpos «resecos»."',
      rwWhyLabel: "Por qué sube:",
      rwWhy:
        "nombrar los recursos (adjetivación, personificación, correlato objetivo) y conectarlos con el cierre del texto eleva el análisis al nivel evaluativo del Criterio B.",
      footnote: "Una corrección real de LIBerico. La corrección, no una promesa.",
    },
    authorityKicker: "Por qué fiarte de la nota",
    authorityTitle: "Calibrado por quien ha puesto las notas de corte",
    authorityBody:
      "LIBerico no improvisa. Lo construyen profesores con décadas en el programa del Diploma: han examinado, han formado alumnado y han participado en la estandarización que decide dónde cae cada banda. El corrector aplica esa misma lógica a tu texto.",
    stats: [
      { v: "A–D", l: "Criterios oficiales" },
      { v: "20+", l: "Años examinando IB" },
      { v: "4", l: "Componentes evaluables" },
      { v: "ES · EN", l: "Literatura y Lengua B" },
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
    priceKicker: "Contra las jaulas",
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
    tiers: [
      {
        price: "1,50 €",
        label: "Corrección",
        desc: "Nota A–D por criterio, comentario del examinador y áreas de mejora.",
      },
      {
        price: "+2,00 €",
        label: "Texto corregido",
        desc: "Tu texto subrayado parte por parte, con la versión mejorada de cada fragmento.",
        feat: true,
      },
    ],
    tiersNote: "Recarga mínima 5 €. Sin mensualidad ni compromiso.",
    coursesKicker: "Qué corregimos",
    coursesTitle: "Tres cursos, el mismo rigor",
    courses: [
      {
        tag: "Español A · Literatura",
        level: "NM · NS",
        title: "Prueba 1, Prueba 2 y Oral",
        desc: "Comentario de texto, ensayo comparativo y guion oral, con bandas A–D, anotaciones y reescritura modelo.",
        bullets: [
          "Bandas A–D con justificación",
          "Texto anotado parte por parte",
          "Ensayo modelo en tu voz",
        ],
      },
      {
        tag: "English A · Literature",
        level: "NM · NS",
        title: "Paper 1, Paper 2 y Oral",
        desc: "Lo mismo que Español A, en inglés: misma evaluación por criterios A–D, con toda la interfaz y el feedback en English.",
        bullets: [
          "Interfaz y feedback en inglés",
          "Bandas A–D con anotaciones",
          "Ensayo modelo de banda alta",
        ],
      },
      {
        tag: "Español B · Lengua",
        level: "NM · NS",
        title: "Producción escrita y Oral",
        desc: "Otro formato, mismos principios: criterios propios de Lengua B y oral conversacional con profesor virtual.",
        bullets: [
          "Criterios A–C de la asignatura",
          "Oral con avatar y transcripción",
          "Feedback por tipo de texto",
        ],
      },
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
      "Transcripción en vivo + feedback por criterios A–C",
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
    footerDisc: "No afiliado al International Baccalaureate Organization",
    privacy: "Privacidad",
    cookies: "Cookies",
    terms: "Términos",
  },
};

// English mirrors the Spanish structure.
const COPY_EN: typeof COPY.es = {
  nav: { how: "How it works", pricing: "Pricing", courses: "Subjects", faq: "FAQ" },
  login: "Sign in",
  cta: "Mark my text",
  cta_short: "Start",
  badge: "IB examiners and grade-boundary standardisers",
  h1a: "The correction your ",
  h1mark: "IB examiner",
  h1b: " would give — in seconds.",
  sub: "Paste your commentary and get the grade by criteria A–D and the examiner's comment. If you want, we mark the text line by line. No subscription: you pay only when you use it.",
  priceFrom: "from",
  price: "€1.50",
  priceUnit: "per correction",
  pillars: [
    {
      t: "Marked by an examiner, not a chatbot",
      d: "It applies the criteria with the rigour of someone who has marked and standardised grade boundaries in the IB.",
    },
    {
      t: "No subscription, no cage",
      d: "Monthly plans hook you. Here you pay per correction: if it helps, keep going; if not, don't use it.",
    },
    {
      t: "One step, no learning curve",
      d: "Paste the text, pick the paper, get the grade. No tutorials, no setup.",
    },
  ],
  sheet: {
    deskLabel: "Real result · IB English A: Literature SL · Paper 1",
    tier1: "Correction",
    tier1Price: "€1.50",
    tier2: "Marked-up text",
    tier2Price: "+€2.00",
    result: "Result",
    examiner: "Examiner's evaluation",
    work: "How does the narrator's testimonial voice shape the meaning of the text?",
    score: "Score",
    grade: "Est. grade",
    scoreVal: "13",
    bands: [
      { l: "A", n: "Understanding and interpretation", s: 4 },
      { l: "B", n: "Analysis and evaluation", s: 3 },
      { l: "C", n: "Focus and organisation", s: 3 },
      { l: "D", n: "Language", s: 3 },
    ],
    globalLabel: "Examiner's global comment",
    global: [
      "Mature understanding and a coherent reading centred on the testimonial voice. To go higher, dig into the ",
      "effect of the devices",
      " and watch the ",
      "accuracy of your quotations",
      ".",
    ],
    annotLabel: "Your annotated response",
    lockChip: "+€2",
    passage: [
      {
        t: '"The testimonial voice ',
        c: "D" as const,
        h: "fundamentally contributes",
        t2: " to the meaning of the text. ",
      },
      {
        t: "The words ",
        c: "B" as const,
        h: "'sad' and 'pure stone'",
        t2: " mirror the characters' state, though it misquotes ",
      },
      { t: "", c: "A" as const, h: "'here we have to manage'", t2: '."' },
    ],
    lockedNote: "Unlock +€2 and we underline your text, line by line.",
    rwTitle: "High-band rewrite",
    rwFromLabel: "Your excerpt",
    rwFrom:
      "\"The words 'sad' and 'pure stone' turn the landscape into a reflection of the characters' emotional state.\"",
    rwToLabel: "Improved version",
    rwTo: "\"The emotive adjective ('sad') and the personification of the weeds that 'claw at the wind' turn the landscape into a correlative of Elsa's mood: the barrenness of the land foreshadows the final dryness of the 'withered' bodies.\"",
    rwWhyLabel: "Why it rises:",
    rwWhy:
      "naming the devices (emotive adjective, personification, objective correlative) and tying them to the text's close lifts the analysis to the evaluative level of Criterion B.",
    footnote: "A real LIBerico correction. The correction, not a promise.",
  },
  authorityKicker: "Why trust the grade",
  authorityTitle: "Calibrated by the people who set the boundaries",
  authorityBody:
    "LIBerico doesn't improvise. It's built by teachers with decades in the Diploma Programme: they have examined, trained students, and taken part in the standardisation that decides where each band falls. The corrector applies that same logic to your text.",
  stats: [
    { v: "A–D", l: "Official criteria" },
    { v: "20+", l: "Years marking IB" },
    { v: "4", l: "Assessed components" },
    { v: "ES · EN", l: "Literature and Language B" },
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
  priceKicker: "Against cages",
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
  tiers: [
    {
      price: "€1.50",
      label: "Correction",
      desc: "A–D band per criterion, examiner's comment and areas to improve.",
    },
    {
      price: "+€2.00",
      label: "Marked-up text",
      desc: "Your text underlined line by line, with an improved version of each fragment.",
      feat: true,
    },
  ],
  tiersNote: "Minimum top-up €5. No monthly fee, no commitment.",
  coursesKicker: "What we mark",
  coursesTitle: "Three courses, one standard",
  courses: [
    {
      tag: "Spanish A · Literature",
      level: "SL · HL",
      title: "Paper 1, Paper 2 and Oral",
      desc: "Textual analysis, comparative essay and oral script, with bands A–D, annotations and a model rewrite.",
      bullets: [
        "Bands A–D with justification",
        "Text annotated line by line",
        "Model essay in your voice",
      ],
    },
    {
      tag: "English A · Literature",
      level: "SL · HL",
      title: "Paper 1, Paper 2 and Oral",
      desc: "The same as Spanish A, in English: identical A–D assessment, with the whole interface and feedback in English.",
      bullets: [
        "Interface and feedback in English",
        "Bands A–D with annotations",
        "High-band model essay",
      ],
    },
    {
      tag: "Spanish B · Language",
      level: "SL · HL",
      title: "Written production and Oral",
      desc: "A different format, the same principles: the subject's own A–C criteria and a conversational oral with a virtual teacher.",
      bullets: ["Subject criteria A–C", "Oral with avatar and transcript", "Feedback by text type"],
    },
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
    "Live transcription + feedback by criteria A–C",
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
  footerDisc: "Not affiliated with the International Baccalaureate Organization",
  privacy: "Privacy",
  cookies: "Cookies",
  terms: "Terms",
};

// ── Scroll-reveal primitive (enhancement only; content stays in the DOM) ───────

// ── Interactive examiner sheet — the signature element ────────────────────────

function ExaminerSheet({ c }: { c: typeof COPY.es }) {
  const s = c.sheet;
  const [tier, setTier] = useState<1 | 2>(1);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setTier(2);
      return;
    }
    const t = window.setTimeout(() => setTier(2), 2100);
    return () => window.clearTimeout(t);
  }, []);

  const t2 = tier === 2;

  const markStyle = (crit: "A" | "B" | "C" | "D"): CSSProperties =>
    t2
      ? {
          backgroundColor: CRIT[crit] + "1f",
          borderBottom: `2px solid ${CRIT[crit]}`,
          borderRadius: "4px",
          padding: "0 2px",
          transition: "background-color 0.5s ease, border-color 0.5s ease",
        }
      : { transition: "background-color 0.5s ease, border-color 0.5s ease" };

  return (
    <div className="w-full max-w-[33rem]">
      {/* Tier toggle */}
      <div
        className="mb-4 inline-flex rounded-full p-1"
        style={{ backgroundColor: L.bg2, border: `1px solid ${L.line}` }}
        role="tablist"
        aria-label="Tramo de corrección"
      >
        {([1, 2] as const).map((n) => {
          const active = tier === n;
          const label = n === 1 ? s.tier1 : s.tier2;
          const price = n === 1 ? s.tier1Price : s.tier2Price;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTier(n)}
              className="lib-press flex flex-col items-center rounded-full px-4 py-2 leading-tight transition"
              style={{
                backgroundColor: active ? L.primary : "transparent",
                color: active ? "#fff" : L.muted,
              }}
            >
              <span className="text-[0.74rem] font-semibold">{label}</span>
              <span className="mt-px text-[0.62rem]" style={fontMono}>
                {price}
              </span>
            </button>
          );
        })}
      </div>

      {/* The readout card */}
      <div
        className="overflow-hidden rounded-[20px]"
        style={{ backgroundColor: L.surface, border: `1px solid ${L.line}`, boxShadow: cardShadow }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ backgroundColor: L.ink, color: "#fff" }}
        >
          <div>
            <div className="text-[0.58rem] uppercase tracking-[0.2em] opacity-70">{s.result}</div>
            <div className="mt-0.5 text-[1.05rem] font-bold">{s.examiner}</div>
            <div className="mt-0.5 text-[0.62rem] opacity-60">{s.work}</div>
          </div>
          <div className="flex items-end gap-5 text-right">
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.14em] opacity-70">{s.score}</div>
              <div className="mt-0.5 text-[1.55rem] font-bold leading-none">
                <span style={fontMono}>{s.scoreVal}</span>
                <span className="text-[0.7rem] font-normal opacity-60">/20</span>
              </div>
            </div>
            <div>
              <div className="text-[0.55rem] uppercase tracking-[0.14em] opacity-70">{s.grade}</div>
              <div
                className="mt-0.5 inline-block rounded-lg px-2.5 text-[1.5rem] font-bold leading-tight"
                style={{ backgroundColor: L.ok, color: "#fff", ...fontMono }}
              >
                5
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          {/* bands */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {s.bands.map((b) => {
              const col = CRIT[b.l as "A" | "B" | "C" | "D"];
              return (
                <div
                  key={b.l}
                  className="rounded-2xl p-2"
                  style={{ backgroundColor: L.surface, border: `1px solid ${L.line}` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-lg text-[0.7rem] font-bold"
                      style={{ backgroundColor: col + "1f", color: col, ...fontMono }}
                    >
                      {b.l}
                    </span>
                    <span
                      className="text-[0.92rem] font-bold"
                      style={{ ...fontMono, color: L.ink }}
                    >
                      {b.s}
                      <span className="text-[0.6rem] font-normal" style={{ color: L.muted }}>
                        /5
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i
                        key={n}
                        className="h-[3px] flex-1 rounded-full"
                        style={{
                          backgroundColor: n <= b.s ? col : L.line,
                          transition: "background-color 0.4s ease",
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 text-[0.56rem] leading-tight" style={{ color: L.muted }}>
                    {b.n}
                  </div>
                </div>
              );
            })}
          </div>

          {/* global comment */}
          <div className="mb-4 rounded-2xl p-3" style={{ backgroundColor: L.bg2 }}>
            <div
              className="mb-1.5 text-[0.56rem] uppercase tracking-[0.16em]"
              style={{ color: L.muted }}
            >
              {s.globalLabel}
            </div>
            <p className="text-[0.85rem] leading-relaxed" style={{ color: L.ink }}>
              {s.global[0]}
              <b style={{ color: CRIT.B, fontWeight: 700 }}>{s.global[1]}</b>
              {s.global[2]}
              <b style={{ color: L.ink, fontWeight: 700 }}>{s.global[3]}</b>
              {s.global[4]}
            </p>
          </div>

          {/* annotated text */}
          <div
            className="mb-1.5 flex items-center gap-2 text-[0.56rem] uppercase tracking-[0.16em]"
            style={{ color: L.muted }}
          >
            {s.annotLabel}
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.56rem] font-semibold normal-case tracking-normal transition-opacity"
              style={{ backgroundColor: L.amber + "22", color: L.amberDeep, opacity: t2 ? 0 : 1 }}
            >
              <Lock className="h-2.5 w-2.5" />
              {s.lockChip}
            </span>
          </div>
          <p className="text-[0.9rem] leading-[1.85]" style={{ color: L.ink }}>
            {s.passage.map((seg, i) => (
              <span key={i}>
                {seg.t}
                <span style={markStyle(seg.c)}>{seg.h}</span>
                {seg.t2}
              </span>
            ))}
          </p>

          {/* locked hint (tier 1) */}
          <div
            className="mt-3 flex items-center gap-2 text-[0.74rem]"
            style={{
              color: L.muted,
              opacity: t2 ? 0 : 1,
              height: t2 ? 0 : "auto",
              overflow: "hidden",
              transition: "opacity 0.3s ease",
            }}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: L.amberDeep }} />
            {s.lockedNote}
          </div>

          {/* rewrite payoff (tier 2) */}
          <div
            className="mt-3 overflow-hidden rounded-2xl"
            style={{
              border: `1px solid ${L.line}`,
              opacity: t2 ? 1 : 0,
              maxHeight: t2 ? 360 : 0,
              transition: "opacity 0.4s ease, max-height 0.5s ease",
            }}
            aria-hidden={!t2}
          >
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: `1px solid ${L.line}`, backgroundColor: L.bg2 }}
            >
              <span
                className="rounded-lg px-1.5 py-0.5 text-[0.62rem] font-bold"
                style={{ backgroundColor: CRIT.B + "1f", color: CRIT.B, ...fontMono }}
              >
                B
              </span>
              <span
                className="text-[0.66rem] font-semibold uppercase tracking-[0.08em]"
                style={{ color: L.muted }}
              >
                {s.rwTitle}
              </span>
            </div>
            <div className="px-3 py-2.5">
              <div
                className="text-[0.55rem] uppercase tracking-[0.13em]"
                style={{ color: L.muted }}
              >
                {s.rwFromLabel}
              </div>
              <div
                className="mt-0.5 pl-2 text-[0.8rem] leading-relaxed"
                style={{ color: L.muted, borderLeft: `2px solid ${L.line}` }}
              >
                {s.rwFrom}
              </div>
              <div
                className="mt-2 rounded-xl px-2 py-1.5"
                style={{ borderLeft: `2px solid ${L.ok}`, backgroundColor: "rgba(22,163,74,0.08)" }}
              >
                <div className="text-[0.55rem] uppercase tracking-[0.13em]" style={{ color: L.ok }}>
                  {s.rwToLabel}
                </div>
                <p className="mt-0.5 text-[0.81rem] leading-relaxed" style={{ color: L.ink }}>
                  {s.rwTo}
                </p>
              </div>
            </div>
            <div className="px-3 pb-2.5 text-[0.72rem]" style={{ color: L.muted }}>
              <b style={{ color: L.ink }}>{s.rwWhyLabel}</b> {s.rwWhy}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-[30rem] text-[0.72rem]" style={{ color: L.muted }}>
        {s.footnote}
      </p>
    </div>
  );
}

// ── Section eyebrow ────────────────────────────────────────────────────────────

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

type AnnotMark = {
  c: "A" | "B" | "C" | "D";
  text: string;
  name: string;
  problem: string;
  from: string;
  improved: string;
  why: string;
};

function AnnotatedCorrection({ c }: { c: typeof COPY.es }) {
  const segs = c.annotSegments as ReadonlyArray<{ t?: string } & Partial<AnnotMark>>;
  const marks = segs.filter((s) => s.text !== undefined) as unknown as AnnotMark[];
  const [active, setActive] = useState(0);
  const current = marks[active];
  const col = CRIT[current.c];
  const reduce = useReducedMotion();

  let markIdx = -1;

  return (
    <section
      className="px-6 py-20 sm:px-8 sm:py-28"
      style={{
        backgroundColor: L.bg,
        borderTop: `1px solid ${L.line}`,
        borderBottom: `1px solid ${L.line}`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Eyebrow>{c.annotKicker}</Eyebrow>
          <h2
            className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]"
            style={{ ...fontSans, letterSpacing: "-0.025em" }}
          >
            {c.annotTitle}
          </h2>
          <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed" style={{ color: L.muted }}>
            {c.annotSub}
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            {/* the marked-up document */}
            <div
              className="rounded-[20px] p-7 sm:p-9"
              style={{
                backgroundColor: L.surface,
                border: `1px solid ${L.line}`,
                boxShadow: cardShadow,
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span
                  className="text-[0.6rem] font-bold uppercase tracking-[0.18em]"
                  style={{ color: L.muted }}
                >
                  {c.sheet.annotLabel}
                </span>
                <span className="text-[0.62rem]" style={{ color: L.muted }}>
                  {c.annotHint}
                </span>
              </div>
              <p className="text-[1.12rem] leading-[2]" style={{ color: L.ink }}>
                {segs.map((seg, i) => {
                  if (seg.text === undefined || seg.c === undefined)
                    return <span key={i}>{seg.t}</span>;
                  markIdx += 1;
                  const idx = markIdx;
                  const mc = CRIT[seg.c];
                  const on = idx === active;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActive(idx)}
                      className="lib-press rounded-[4px] px-0.5 transition"
                      style={{
                        backgroundColor: mc + (on ? "33" : "1a"),
                        borderBottom: `2px solid ${mc}`,
                        boxShadow: on ? `0 0 0 2px ${mc}55` : "none",
                        color: L.ink,
                      }}
                    >
                      {seg.text}
                    </button>
                  );
                })}
              </p>

              {/* legend */}
              <div
                className="mt-6 flex flex-wrap items-center gap-2 border-t pt-5"
                style={{ borderColor: L.line }}
              >
                <span
                  className="mr-1 text-[0.58rem] font-bold uppercase tracking-[0.16em]"
                  style={{ color: L.muted }}
                >
                  {c.annotLegend}
                </span>
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <span
                    key={letter}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.66rem] font-bold"
                    style={{ backgroundColor: CRIT[letter] + "14", color: CRIT[letter] }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CRIT[letter] }}
                    />
                    {letter}
                  </span>
                ))}
              </div>
            </div>

            {/* the annotation card for the active mark */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="flex flex-col rounded-[20px] p-7 sm:p-9"
                style={{
                  backgroundColor: L.surface,
                  border: `1px solid ${col}44`,
                  boxShadow: cardShadow,
                }}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-extrabold text-white"
                    style={{ backgroundColor: col, ...fontMono }}
                  >
                    {current.c}
                  </span>
                  <div>
                    <div
                      className="text-[0.58rem] font-bold uppercase tracking-[0.16em]"
                      style={{ color: col }}
                    >
                      {c.annotCriterion} {current.c}
                    </div>
                    <div
                      className="text-[0.95rem] font-bold leading-tight"
                      style={{ color: L.ink }}
                    >
                      {current.name}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div
                    className="text-[0.56rem] font-bold uppercase tracking-[0.15em]"
                    style={{ color: L.muted }}
                  >
                    {c.annotCardProblem}
                  </div>
                  <p className="mt-1 text-[0.92rem] leading-relaxed" style={{ color: L.ink }}>
                    {current.problem}
                  </p>
                </div>

                <div className="mt-4 rounded-xl px-3 py-2.5" style={{ backgroundColor: L.bg2 }}>
                  <div
                    className="text-[0.54rem] font-bold uppercase tracking-[0.14em]"
                    style={{ color: L.muted }}
                  >
                    {c.annotCardFrom}
                  </div>
                  <p
                    className="mt-0.5 text-[0.88rem] italic leading-relaxed"
                    style={{ color: L.muted }}
                  >
                    “{current.from}”
                  </p>
                </div>

                <div
                  className="mt-2 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: "rgba(22,163,74,0.08)",
                    borderLeft: `3px solid ${L.ok}`,
                  }}
                >
                  <div
                    className="text-[0.54rem] font-bold uppercase tracking-[0.14em]"
                    style={{ color: L.ok }}
                  >
                    {c.annotCardImproved}
                  </div>
                  <p className="mt-0.5 text-[0.9rem] leading-relaxed" style={{ color: L.ink }}>
                    “{current.improved}”
                  </p>
                </div>

                <div
                  className="mt-4 flex items-start gap-2 text-[0.85rem]"
                  style={{ color: L.ink }}
                >
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: col }} />
                  <span>
                    <b style={{ color: col }}>{c.annotCardWhy}:</b> {current.why}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Subtle pointer-tilt (premium signature; desktop + reduced-motion safe) ────

function Tilt({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });

  if (reduce) return <>{children}</>;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 7);
    rx.set(-py * 7);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Criteria tabs (interactive; criteria vary by component) ───────────────────

function CriteriaTabs({ c, reduce }: { c: typeof COPY.es; reduce: boolean | null }) {
  const tabs = c.critTabs;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const t = tabs[active];
  const titleStyle = { ...fontSans, letterSpacing: "-0.02em" } as CSSProperties;

  const selectTab = (i: number) => {
    setActive(i);
    setOpen(0);
  };

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: reduce ? 0 : 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="mt-10">
      {/* tab pills */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={c.critTitle}>
        {tabs.map((tab, i) => {
          const on = i === active;
          return (
            <button
              key={tab.tab}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => selectTab(i)}
              className="lib-press rounded-full px-4 py-2 text-[0.74rem] font-semibold transition-colors"
              style={{
                backgroundColor: on ? L.primary : L.surface,
                color: on ? "#fff" : L.muted,
                border: `1px solid ${on ? L.primary : L.line}`,
                boxShadow: on ? "0 10px 22px -12px rgba(79,70,229,0.6)" : "none",
              }}
            >
              {tab.tab}
            </button>
          );
        })}
      </div>

      {/* panel */}
      <div
        className="mt-6 rounded-[20px] p-7 sm:p-9"
        style={{ backgroundColor: L.surface, border: `1px solid ${L.line}`, boxShadow: cardShadow }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: reduce ? 0 : -8, transition: { duration: reduce ? 0 : 0.18 } }}
          >
            <motion.div
              variants={item}
              className="mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div
                  className="text-[0.62rem] font-bold uppercase tracking-[0.18em]"
                  style={{ color: L.primary }}
                >
                  {t.subject}
                </div>
                <div className="mt-0.5 text-xl font-bold" style={{ ...titleStyle, color: L.ink }}>
                  {t.paper}
                </div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.1em]"
                style={{ backgroundColor: L.primary + "14", color: L.primary, ...fontMono }}
              >
                {t.scale}
              </span>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2">
              {t.items.map((it, idx) => {
                const col = CRIT[it.c as "A" | "B" | "C" | "D"];
                const isOpen = open === idx;
                return (
                  <motion.div
                    key={it.l}
                    variants={item}
                    className="overflow-hidden rounded-xl"
                    style={{
                      backgroundColor: L.bg2,
                      border: `1px solid ${isOpen ? col + "66" : L.line}`,
                      transition: "border-color 0.25s ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start gap-3 p-3.5 text-left"
                    >
                      <span
                        className="flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-lg px-2 text-[0.82rem] font-extrabold"
                        style={{ backgroundColor: col + "1f", color: col, ...fontMono }}
                      >
                        {it.l}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[0.9rem] font-bold leading-tight"
                          style={{ color: L.ink }}
                        >
                          {it.n}
                        </span>
                        <span
                          className="mt-0.5 block text-[0.8rem] leading-snug"
                          style={{ color: L.muted }}
                        >
                          {it.f}
                        </span>
                      </span>
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: isOpen ? col : col + "1a",
                          color: isOpen ? "#fff" : col,
                        }}
                      >
                        {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </span>
                    </button>
                    <div
                      className="overflow-hidden"
                      style={{
                        maxHeight: isOpen ? 220 : 0,
                        transition: reduce
                          ? "none"
                          : "max-height 0.34s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    >
                      <div
                        className="mx-3.5 mb-3.5 rounded-lg px-3 py-2.5"
                        style={{ backgroundColor: col + "12" }}
                      >
                        <div
                          className="text-[0.56rem] font-bold uppercase tracking-[0.14em]"
                          style={{ color: col }}
                        >
                          {c.critExample}
                        </div>
                        <p className="mt-1 text-[0.83rem] leading-snug" style={{ color: L.ink }}>
                          {it.ex}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
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
    { id: "how", label: c.nav.how },
    { id: "pricing", label: c.nav.pricing },
    { id: "courses", label: c.nav.courses },
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
    const ids = ["how", "pricing", "courses", "faq"];
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
            <div
              className="flex gap-2 text-[0.7rem] font-semibold tracking-widest"
              style={{ color: L.muted }}
            >
              <button
                type="button"
                onClick={() => changeLang("es")}
                aria-label="Español"
                aria-pressed={lang === "es"}
                className="transition-colors hover:text-[#0F172A]"
                style={lang === "es" ? { color: L.primary } : undefined}
              >
                ES
              </button>
              <span className="opacity-30" aria-hidden>
                /
              </span>
              <button
                type="button"
                onClick={() => changeLang("en")}
                aria-label="English"
                aria-pressed={lang === "en"}
                className="transition-colors hover:text-[#0F172A]"
                style={lang === "en" ? { color: L.primary } : undefined}
              >
                EN
              </button>
            </div>
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
              <motion.div
                variants={heroItem}
                className="mb-6 inline-flex items-center gap-2.5 rounded-full px-3 py-1.5"
                style={{
                  border: `1px solid ${L.line}`,
                  backgroundColor: L.surface,
                  boxShadow: cardShadow,
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: L.amberDeep }} />
                <span
                  className="text-[0.64rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: L.ink }}
                >
                  {c.badge}
                </span>
              </motion.div>

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

            {/* right: examiner readout */}
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, x: reduce ? 0 : 30, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <Tilt>
                <ExaminerSheet c={c} />
              </Tilt>
            </motion.div>
          </div>
        </section>

        {/* ANNOTATED CORRECTION */}
        <AnnotatedCorrection c={c} />

        {/* MID CTA */}
        <section className="px-6 py-14 text-center" style={{ backgroundColor: L.bg }}>
          <Link
            to="/login"
            className="lib-press group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold uppercase tracking-[0.07em]"
            style={ctaPrimary}
          >
            {c.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

        {/* AUTHORITY — deep indigo band */}
        <section
          className="px-6 py-20 sm:px-8 sm:py-28"
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
                <div className="grid grid-cols-2 gap-3">
                  {c.stats.map((stat, i) => {
                    const accent = [L.amber, "#A5B4FC", "#C4B5FD", "#FDA4AF"][i] ?? L.amber;
                    return (
                      <div
                        key={stat.l}
                        className="lib-card rounded-2xl p-6 sm:p-7"
                        style={{
                          backgroundColor: DEEP.surface,
                          border: `1px solid ${DEEP.border}`,
                        }}
                      >
                        <div
                          className="text-4xl font-extrabold leading-none sm:text-5xl"
                          style={{ ...heading, ...fontMono, color: accent }}
                        >
                          {stat.v}
                        </div>
                        <div
                          className="mt-2 text-[0.66rem] uppercase tracking-[0.16em]"
                          style={{ color: DEEP.muted }}
                        >
                          {stat.l}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: L.bg }}
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>{c.howKicker}</Eyebrow>
              <h2
                className="mb-14 max-w-2xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]"
                style={heading}
              >
                {c.howTitle}
              </h2>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {c.how.map((step, i) => {
                const accent = [L.amberDeep, "#4F46E5", "#6D28D9"][i] ?? L.primary;
                return (
                  <Reveal key={step.t} delay={i * 110}>
                    <div
                      className="lib-card group relative h-full overflow-hidden rounded-[20px] p-8 sm:p-10"
                      style={{
                        backgroundColor: L.surface,
                        border: `1px solid ${L.line}`,
                        boxShadow: cardShadow,
                      }}
                    >
                      <div
                        className="absolute right-5 top-4 text-7xl font-extrabold leading-none sm:text-8xl"
                        style={{ ...heading, ...fontMono, color: accent + "1a" }}
                        aria-hidden
                      >
                        {i + 1}
                      </div>
                      <div className="relative">
                        <div
                          className="mb-5 inline-flex rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em]"
                          style={{ backgroundColor: accent + "18", color: accent }}
                        >
                          {lang === "es" ? "Paso" : "Step"} 0{i + 1}
                        </div>
                        <h3
                          className="mb-3 text-2xl font-bold leading-tight"
                          style={{ ...heading, color: L.ink }}
                        >
                          {step.t}
                        </h3>
                        <p className="text-[0.9rem] leading-relaxed" style={{ color: L.muted }}>
                          {step.d}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          className="scroll-mt-20 px-6 py-20 sm:px-8 sm:py-28"
          style={{ backgroundColor: L.bg2 }}
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <Eyebrow>{c.priceKicker}</Eyebrow>
              <h2
                className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]"
                style={heading}
              >
                {c.priceTitle}
              </h2>
              <p
                className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed"
                style={{ color: L.muted }}
              >
                {c.priceLead}
              </p>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-12 grid gap-5 md:grid-cols-2">
                <div
                  className="lib-card rounded-[20px] p-8 sm:p-10"
                  style={{
                    backgroundColor: L.surface,
                    border: `1px solid ${L.ok}44`,
                    boxShadow: cardShadow,
                  }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span
                      className="text-[0.62rem] font-bold uppercase tracking-[0.2em]"
                      style={{ color: L.ok }}
                    >
                      {c.usTag}
                    </span>
                    <Sparkles className="h-4 w-4" style={{ color: L.ok }} />
                  </div>
                  <ul className="space-y-3">
                    {c.us.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-[0.92rem]">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: L.ok + "1f" }}
                        >
                          <Check className="h-3 w-3" style={{ color: L.ok }} />
                        </span>
                        <span style={{ color: L.ink }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="rounded-[20px] p-8 sm:p-10"
                  style={{ backgroundColor: L.bg, border: `1px solid ${L.line}` }}
                >
                  <div
                    className="mb-6 text-[0.62rem] font-bold uppercase tracking-[0.2em]"
                    style={{ color: L.muted }}
                  >
                    {c.themTag}
                  </div>
                  <ul className="space-y-3">
                    {c.them.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-[0.92rem]">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: "rgba(15,23,42,0.05)" }}
                        >
                          <X className="h-3 w-3" style={{ color: L.muted }} />
                        </span>
                        <span style={{ color: L.muted }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {c.tiers.map((tier, i) => (
                <Reveal key={tier.label} delay={i * 100}>
                  <div
                    className="lib-card flex h-full flex-col rounded-[20px] p-8 sm:p-10"
                    style={{
                      backgroundColor: L.surface,
                      border: `1px solid ${tier.feat ? L.primary : L.line}`,
                      boxShadow: tier.feat ? "0 18px 40px -20px rgba(79,70,229,0.5)" : cardShadow,
                    }}
                  >
                    <div
                      className="text-3xl font-extrabold"
                      style={{ ...heading, ...fontMono, color: L.ink }}
                    >
                      {tier.price}
                    </div>
                    <div
                      className="mt-2 text-[0.7rem] font-bold uppercase tracking-[0.16em]"
                      style={{ color: tier.feat ? L.primary : L.muted }}
                    >
                      {tier.label}
                    </div>
                    <p
                      className="mt-5 flex-1 text-[0.9rem] leading-relaxed"
                      style={{ color: L.muted }}
                    >
                      {tier.desc}
                    </p>
                    <Link
                      to="/login"
                      className="lib-press mt-8 block w-full rounded-xl py-3.5 text-center text-[0.72rem] font-bold uppercase tracking-widest"
                      style={ctaPrimary}
                    >
                      {c.cta_short}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
            <p
              className="mt-8 text-center text-[0.72rem] uppercase tracking-[0.16em]"
              style={{ color: L.muted }}
            >
              {c.tiersNote}
            </p>
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
                const accent = ["#4F46E5", "#6D28D9", "#4338CA"][i] ?? L.primary;
                return (
                  <Reveal key={course.tag} delay={i * 90}>
                    <div
                      className="lib-card flex h-full flex-col gap-4 overflow-hidden rounded-[20px] p-7 sm:p-8"
                      style={{
                        backgroundColor: L.surface,
                        border: `1px solid ${L.line}`,
                        boxShadow: cardShadow,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex w-fit rounded-full px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]"
                          style={{ backgroundColor: accent + "18", color: accent }}
                        >
                          {course.tag}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.08em]"
                          style={{ backgroundColor: L.bg2, color: L.muted, ...fontMono }}
                        >
                          {course.level}
                        </span>
                      </div>
                      <h3
                        className="text-xl font-bold leading-tight"
                        style={{ ...heading, color: L.ink }}
                      >
                        {course.title}
                      </h3>
                      <p className="text-[0.9rem] leading-relaxed" style={{ color: L.muted }}>
                        {course.desc}
                      </p>
                      <ul className="mt-auto space-y-2.5 pt-2">
                        {course.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2.5 text-[0.86rem]">
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              style={{ color: accent }}
                            />
                            <span style={{ color: L.ink }}>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ORAL PREVIEW (Spanish B) */}
        <OralPreview c={c} reduce={reduce} />

        {/* CRITERIA — vary by paper and subject */}
        <section className="px-6 py-20 sm:px-8 sm:py-28" style={{ backgroundColor: L.bg2 }}>
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <Eyebrow>{c.critKicker}</Eyebrow>
              <h2
                className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-[2.6rem]"
                style={heading}
              >
                {c.critTitle}
              </h2>
              <p
                className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed"
                style={{ color: L.muted }}
              >
                {c.critSub}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <CriteriaTabs c={c} reduce={reduce} />
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-8 text-center text-[0.8rem]" style={{ color: L.muted }}>
                {c.critNote}
              </p>
            </Reveal>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="px-6 py-20 sm:px-8 sm:py-28" style={{ backgroundColor: L.bg }}>
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
