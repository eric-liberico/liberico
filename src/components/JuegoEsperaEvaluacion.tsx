import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

export type ModoJuegoEspera = "prueba1" | "prueba2" | "oral";

const OBSTACULOS_PRUEBA1 = [
  "Resumen",
  "Sin tesis",
  "Sin efecto",
  "Cita larga",
  "Verbo débil",
  "Línea por línea",
  "Solo identifica",
  "Sin pregunta",
];

const OBSTACULOS_PRUEBA2 = [
  "Dos miniensayos",
  "Sin comparar",
  "Obra olvidada",
  "Tema genérico",
  "Sin pregunta",
  "Solo resumen",
  "Sin forma",
  "Desequilibrio",
];

const BONUS_PRUEBA1 = [
  "Tesis clara",
  "Efecto",
  "Cita breve",
  "Verbo preciso",
  "Interpretación",
  "Cierre fuerte",
];

const BONUS_PRUEBA2 = [
  "Tesis comparativa",
  "Contraste",
  "Obras equilibradas",
  "Decisión autoral",
  "Evidencia precisa",
  "Síntesis",
];

const OBSTACULOS_ORAL = [
  "Sin asunto global",
  "Solo resumen",
  "Sin extracto",
  "P2 hablada",
  "Sin forma",
  "Desequilibrio",
  "Sin cierre",
  "Tema genérico",
];

const BONUS_ORAL = [
  "Asunto global",
  "Forma analizada",
  "Extracto citado",
  "Obras equilibradas",
  "Tesis oral",
  "Síntesis",
];

const CITAS_DON_QUIJOTE = [
  "¡Non fuyades, cobardes versos esticomíticos! ¡Que no sois gigantes sino encabalgamientos mal resueltos!",
  "¡Yo sé quién soy, Sancho! Soy el que distingue el narrador homodiegético del heterodiegético.",
  "¡Muévete, Rocinante! ¡Que el in medias res no espera y el narratario ya bosteza!",
  "¡En el nombre de Dulcinea del Toboso, abjura de la hamartía y persigue la catarsis!",
  "La verdad puede adelgazarse, mas no quebrarse… como el encabalgamiento suave que no rompe el verso.",
  "¡Ahí están los bárbaros! ¡Confunden la prosopografía con la etopeya y llaman a eso análisis!",
  "¡Santiago y cierra, España! ¡Que el hablante lírico no es el autor y hay que decirlo de una vez!",
  "Sancho, la focalización cero nos observa a los dos… y no le gusta lo que ve en tu tesis.",
  "¡Deteneos, bellacos! ¿Acaso ignoráis que el monólogo interior no es lo mismo que la corriente de conciencia?",
  "Con la hipotaxis del sabio y la parataxis del guerrero, tal vez —¡solo tal vez!— lleguéis a banda 5.",
];

// English A: Literature version — Shakespeare / Hamlet theme
const OBSTACULOS_PAPER1_EN = [
  "Plot summary",
  "No thesis",
  "No effect",
  "Long quote",
  "Weak verb",
  "Line by line",
  "Mere listing",
  "No question",
];
const OBSTACULOS_PAPER2_EN = [
  "Two mini-essays",
  "No comparison",
  "Forgotten work",
  "Generic theme",
  "No question",
  "Pure summary",
  "No form",
  "Imbalance",
];
const OBSTACULOS_ORAL_EN = [
  "No global issue",
  "Pure summary",
  "No extract",
  "Just P2 spoken",
  "No form",
  "Imbalance",
  "No closure",
  "Generic theme",
];
const BONUS_PAPER1_EN = [
  "Clear thesis",
  "Effect",
  "Brief quote",
  "Precise verb",
  "Interpretation",
  "Strong close",
];
const BONUS_PAPER2_EN = [
  "Comparative thesis",
  "Contrast",
  "Balanced works",
  "Authorial choice",
  "Precise evidence",
  "Synthesis",
];
const BONUS_ORAL_EN = [
  "Global issue",
  "Form analysed",
  "Extract cited",
  "Balanced works",
  "Oral thesis",
  "Synthesis",
];

const CITAS_SHAKESPEARE = [
  "To analyse, or to summarise — that is the question!",
  "The lady doth protest too much… and her thesis is still too vague.",
  "There are more authorial choices in heaven and earth, Horatio, than are dreamt of in your plot summary.",
  "All the world's a text, and all the men and women merely readers — but some forget to analyse form.",
  "Something is rotten in the state of your essay — thou hast confused theme with argument.",
  "Brevity is the soul of the perfect IB quotation: cite briefly, analyse deeply.",
  "Now is the winter of our discontent made glorious by a well-structured comparative thesis.",
  "Friends, examiners, IB students — lend me your analytical frameworks!",
  "The quality of analysis is not strained — it droppeth as the gentle rain of authorial choices.",
  "What's in a name? That which we call an effect by any other word would score just as high — if justified.",
];

const TITULOS_ES: Record<ModoJuegoEspera, string> = {
  prueba1: "Don Quijote contra la descripción",
  prueba2: "Don Quijote contra los dos miniensayos",
  oral: "Don Quijote y el asunto global",
};

const TITULOS_EN: Record<ModoJuegoEspera, string> = {
  prueba1: "Shakespeare vs. the plot summary",
  prueba2: "Shakespeare vs. the two mini-essays",
  oral: "Shakespeare and the global issue",
};

const SUBTITULO_ES = "Salta los molinos rojos (+1). Choca con los verdes (+5). ¡No caigas!";
const SUBTITULO_EN = "Jump the red windmills (+1). Collect the green ones (+5). Don't fall!";

// Constantes del juego
const GAME_H = 160;
const CHAR_H = 60;
const CHAR_W = 38;
const CHAR_X = 92;
const GROUND_Y = GAME_H - CHAR_H - 8; // = 92
const JUMP_PEAK_Y = 4;
const JUMP_MS = 720;
const OBS_H = 28;
const OBS_GROUND_Y = GAME_H - OBS_H - 8; // = 124
const WINDMILL_W = 56;
const WINDMILL_H = 80;
const WINDMILL_TOP = GAME_H - 8 - WINDMILL_H; // = 72
const SPAWN_X = 900;
const SPEED_PX_MS = 0.19;
const SPAWN_MIN_MS = 2600;
const SPAWN_MAX_MS = 4000;
const CITA_INTERVAL_MS = 5000;
const MAX_JUMPS = 2;
const GAME_OVER_DELAY_MS = 2400;

type Obs = {
  id: number;
  label: string;
  tipo: "malo" | "bonus";
  x: number;
  w: number;
  scored: boolean;
};

type FloatingScore = {
  id: number;
  value: number;
  tipo: "puntos" | "bonus";
  x: number;
  y: number;
};

type Dust = { id: number; x: number };

function randomSpawnDelay(): number {
  return SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function arcY(progress: number, fromY: number): number {
  return fromY - Math.pow(Math.sin(Math.PI * progress), 0.6) * (fromY - JUMP_PEAK_Y);
}

// ── Fondo de La Mancha ────────────────────────────────────────────────────────
function FondoLaMancha({ bgId }: { bgId: string }) {
  const skyId = `${bgId}-sky`;
  const groundId = `${bgId}-ground`;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 900 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b3d7a" />
          <stop offset="65%" stopColor="#2471a3" />
          <stop offset="100%" stopColor="#7fc4e8" />
        </linearGradient>
        <linearGradient id={groundId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b43a" />
          <stop offset="55%" stopColor="#bf7a20" />
          <stop offset="100%" stopColor="#8b4c1a" />
        </linearGradient>
      </defs>
      {/* Cielo */}
      <rect width="900" height="160" fill={`url(#${skyId})`} />
      {/* Sol candente — núcleo + halo que late (jqSun) */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "jqSun 5s ease-in-out infinite",
        }}
      >
        <circle cx="818" cy="30" r="36" fill="#ffd700" opacity="0.12" />
        <circle cx="818" cy="30" r="24" fill="#ffe566" opacity="0.5" />
      </g>
      <circle cx="818" cy="30" r="18" fill="#ffd700" />
      <circle cx="818" cy="30" r="13" fill="#fff8a0" />
      {/* Cirros */}
      <path
        d="M30 22 Q90 18 160 24"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M370 16 Q450 13 530 18"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M600 28 Q655 25 710 30"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Llanura */}
      <path
        d="M0 103 Q180 99 360 104 Q540 109 720 102 Q810 99 900 103 L900 160 L0 160 Z"
        fill={`url(#${groundId})`}
      />
      {/* Surcos de trigo (estáticos del SVG; los animados van en el DOM) */}
      <path
        d="M0 114 Q300 110 600 115 Q750 117 900 113"
        fill="none"
        stroke="#f0c040"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M0 123 Q400 119 900 124"
        fill="none"
        stroke="#e8a820"
        strokeWidth="1"
        opacity="0.3"
      />
      <path
        d="M0 134 Q300 130 600 135 Q800 137 900 133"
        fill="none"
        stroke="#d07820"
        strokeWidth="1"
        opacity="0.25"
      />
      {/* Molinos lejanos — Consuegra en el horizonte, aspas girando (jqFarSpin) */}
      <g transform="translate(175, 100)" opacity="0.65">
        <rect x="-2.5" y="0" width="5" height="14" fill="white" />
        <circle cx="0" cy="0" r="3" fill="white" />
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "jqFarSpin 12s linear infinite",
          }}
        >
          <line x1="-10" y1="-5" x2="10" y2="5" stroke="white" strokeWidth="1.8" />
          <line x1="-10" y1="5" x2="10" y2="-5" stroke="white" strokeWidth="1.8" />
        </g>
      </g>
      <g transform="translate(420, 97)" opacity="0.55">
        <rect x="-2" y="0" width="4" height="15" fill="white" />
        <circle cx="0" cy="0" r="2.5" fill="white" />
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "jqFarSpin 15s linear infinite",
          }}
        >
          <line x1="-11" y1="0" x2="11" y2="0" stroke="white" strokeWidth="1.5" />
          <line x1="0" y1="-11" x2="0" y2="11" stroke="white" strokeWidth="1.5" />
        </g>
      </g>
      <g transform="translate(650, 101)" opacity="0.45">
        <rect x="-1.5" y="0" width="3" height="11" fill="white" />
        <circle cx="0" cy="0" r="2" fill="white" />
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "jqFarSpin 17s linear infinite",
          }}
        >
          <line x1="-8" y1="-4" x2="8" y2="4" stroke="white" strokeWidth="1.3" />
          <line x1="-8" y1="4" x2="8" y2="-4" stroke="white" strokeWidth="1.3" />
        </g>
      </g>
      {/* Castillo lejano */}
      <g transform="translate(748, 86)" opacity="0.5" fill="#c8a47a">
        <rect x="0" y="0" width="13" height="20" />
        <rect x="1" y="-5" width="3.5" height="6" />
        <rect x="7" y="-5" width="3.5" height="6" />
        <rect x="13" y="9" width="30" height="11" />
        <rect x="43" y="2" width="12" height="18" />
        <rect x="44" y="-3" width="3.5" height="6" />
        <rect x="50" y="-3" width="3.5" height="6" />
      </g>
      {/* Olivos */}
      <ellipse cx="75" cy="106" rx="10" ry="5" fill="#3d5c2a" opacity="0.7" />
      <ellipse cx="77" cy="103" rx="6" ry="4" fill="#4a6f35" opacity="0.65" />
      <ellipse cx="310" cy="108" rx="9" ry="4.5" fill="#3d5c2a" opacity="0.6" />
      <ellipse cx="312" cy="105" rx="5" ry="3.5" fill="#4a6f35" opacity="0.55" />
      <ellipse cx="555" cy="106" rx="8" ry="4" fill="#3d5c2a" opacity="0.6" />
      <ellipse cx="557" cy="103" rx="5" ry="3" fill="#4a6f35" opacity="0.55" />
      <ellipse cx="855" cy="108" rx="9" ry="4.5" fill="#3d5c2a" opacity="0.55" />
    </svg>
  );
}

// ── Molino de Viento ──────────────────────────────────────────────────────────
function MolinoDeViento({ label, tipo }: { label: string; tipo: "malo" | "bonus" }) {
  const towerFill = tipo === "malo" ? "#881337" : "#064e3b";
  const bladeFill = tipo === "malo" ? "#e11d48" : "#10b981";
  const shortLabel = label.length > 12 ? label.slice(0, 11) + "…" : label;
  return (
    <svg
      width={WINDMILL_W}
      height={WINDMILL_H}
      viewBox="0 0 56 80"
      overflow="visible"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M22 80 L24 34 L32 34 L34 80 Z" fill={towerFill} />
      <path d="M25 80 Q28 73 31 80 Z" fill="rgba(0,0,0,0.18)" />
      <rect x="25" y="54" width="6" height="6" rx="1" fill="rgba(255,255,255,0.15)" />
      <text
        x="28"
        y="48"
        textAnchor="middle"
        fontSize="5.5"
        fill="rgba(255,255,255,0.85)"
        fontFamily="system-ui,sans-serif"
      >
        {shortLabel}
      </text>
      <circle cx="28" cy="34" r="4.5" fill={towerFill} stroke={bladeFill} strokeWidth="1.5" />
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "spin 2.8s linear infinite",
        }}
      >
        <path d="M25 34 L23 8 L28 6 L33 8 L31 34 Z" fill={bladeFill} opacity="0.92" />
        <path d="M28 31 L54 28 L56 34 L54 40 L28 37 Z" fill={bladeFill} opacity="0.92" />
        <path d="M25 34 L23 60 L28 62 L33 60 L31 34 Z" fill={bladeFill} opacity="0.92" />
        <path d="M28 31 L2 28 L0 34 L2 40 L28 37 Z" fill={bladeFill} opacity="0.92" />
      </g>
    </svg>
  );
}

// ── Don Quijote a lomos de Rocinante ─────────────────────────────────────────
// El <svg> raíz cabecea al galope (jqBob); cola, crin, capa y banderín ondean.
function DonQuijoteEnRocinante({ color }: { color: string }) {
  return (
    <svg
      width="68"
      height="60"
      viewBox="0 0 100 75"
      fill={color}
      overflow="visible"
      aria-hidden="true"
      style={{ display: "block", animation: "jqBob 0.45s ease-in-out infinite" }}
    >
      <path d="M14 54 Q18 42 40 42 Q62 42 66 52 Q58 62 40 63 Q22 63 14 54 Z" />
      <path d="M28 46 Q30 52 28 58" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <path d="M35 44 Q37 51 35 60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <path d="M42 44 Q44 51 42 61" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <path
        d="M60 46 Q66 38 70 30"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse cx="73" cy="27" rx="9" ry="7" />
      <path d="M80 25 Q92 26 90 32 Q82 34 78 30" />
      <ellipse cx="88" cy="30" rx="1.5" ry="1" fill="rgba(0,0,0,0.35)" />
      <circle cx="77" cy="24" r="2" fill="rgba(255,255,255,0.6)" />
      <circle cx="77" cy="24" r="1" fill={color} />
      <polygon points="68,22 70,14 74,21" />
      {/* Crin al viento */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 0%",
          animation: "jqMane 0.45s ease-in-out infinite",
        }}
      >
        <path
          d="M68 26 Q66 31 64 36 Q62 40 60 44"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
      {/* Cola al viento */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "100% 100%",
          animation: "jqTail 0.5s ease-in-out infinite",
        }}
      >
        <path d="M16 54 L3 40" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Patas — galope: fase A (del.der + tras.izq.), fase B (del.izq. + tras.der.) */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 0%",
          animation: "legRun 0.45s ease-in-out infinite",
        }}
      >
        <line
          x1="62"
          y1="61"
          x2="70"
          y2="74"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 0%",
          animation: "legRun 0.45s ease-in-out 0.225s infinite",
        }}
      >
        <line
          x1="57"
          y1="62"
          x2="60"
          y2="72"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "100% 0%",
          animation: "legRun 0.45s ease-in-out 0.225s infinite",
        }}
      >
        <line
          x1="18"
          y1="62"
          x2="10"
          y2="74"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "100% 0%",
          animation: "legRun 0.45s ease-in-out infinite",
        }}
      >
        <line
          x1="24"
          y1="63"
          x2="22"
          y2="74"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>
      <path d="M34 42 Q32 30 30 20 Q38 17 46 20 Q46 32 44 42 Z" />
      <line x1="38" y1="20" x2="38" y2="42" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <rect x="32" y="35" width="12" height="2" rx="1" opacity="0.4" />
      <rect x="35" y="18" width="6" height="4" rx="1" />
      <ellipse cx="38" cy="14" rx="5.5" ry="6" />
      <path d="M32 13 Q32 4 38 4 Q44 4 44 13" />
      <ellipse cx="38" cy="13" rx="10" ry="3" />
      <rect x="33" y="15" width="10" height="1.5" rx="0.5" opacity="0.35" />
      <path d="M34 19 L38 26 L42 19" />
      <path
        d="M34 18 Q38 20 42 18"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="45"
        y1="24"
        x2="50"
        y2="30"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="50" y1="30" x2="106" y2="1" stroke={color} strokeWidth="2.5" />
      {/* Banderín de la lanza ondeando */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 100%",
          animation: "jqFlag 0.9s ease-in-out infinite",
        }}
      >
        <polygon points="106,0 101,0 103,5" />
        <path d="M100 4 L95 2 L97 8 Z" opacity="0.7" />
      </g>
      <line
        x1="32"
        y1="26"
        x2="25"
        y2="32"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="23" cy="34" r="6" fill="none" stroke={color} strokeWidth="2" />
      <line x1="23" y1="28" x2="23" y2="40" stroke={color} strokeWidth="0.8" opacity="0.5" />
      <line x1="17" y1="34" x2="29" y2="34" stroke={color} strokeWidth="0.8" opacity="0.5" />
      {/* Capa ondeando */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 100%",
          animation: "jqCape 0.55s ease-in-out infinite",
        }}
      >
        <path
          d="M44 21 C54 28 54 40 48 48"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function JuegoEsperaEvaluacion({ modo = "prueba1" }: { modo?: ModoJuegoEspera }) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const bgId = useId();

  // Refs de juego
  const jumping = useRef(false);
  const jumpCount = useRef(0);
  const jumpStart = useRef(0);
  const jumpFromY = useRef(GROUND_Y);
  const charYRef = useRef(GROUND_Y);
  const obsRef = useRef<Obs[]>([]);
  const nextId = useRef(0);
  const lastSpawn = useRef<number | null>(null);
  const nextSpawnDelay = useRef(randomSpawnDelay());
  const citaIdx = useRef(0); // se aleatoriza en useEffect para evitar hydration mismatch
  const lastCita = useRef<number | null>(null);
  const gameOverRef = useRef(false);
  const floatingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const floatingId = useRef(0);
  const rafId = useRef(0);
  const prevTime = useRef<number | null>(null);
  // Refs de animación (no fuerzan re-render)
  const dustId = useRef(0);
  const lastDust = useRef(0);

  // Estado de UI
  const [charY, setCharY] = useState(GROUND_Y);
  const [obsState, setObsState] = useState<Obs[]>([]);
  const [score, setScore] = useState(0);
  const CITAS = isEN ? CITAS_SHAKESPEARE : CITAS_DON_QUIJOTE;
  const [cita, setCita] = useState(CITAS[citaIdx.current]);
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0); // cambia para reiniciar el loop
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

  // Estado de animación: squash&stretch, polvo, latido del marcador, fundido de cita, entrada
  const [charScale, setCharScale] = useState({ sx: 1, sy: 1 });
  const [dust, setDust] = useState<Dust[]>([]);
  const [scoreScale, setScoreScale] = useState(1);
  const [citaOp, setCitaOp] = useState(1);
  const [entered, setEntered] = useState(false);

  // Entrada en pantalla: la tarjeta sube y el Quijote galopa desde la izquierda
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const squash = useCallback((sx: number, sy: number, ms: number) => {
    setCharScale({ sx, sy });
    const t = setTimeout(() => setCharScale({ sx: 1, sy: 1 }), ms);
    floatingTimers.current.push(t);
  }, []);

  const addDust = useCallback((x: number) => {
    const id = dustId.current++;
    setDust((prev) => [...prev, { id, x: Math.round(x) }]);
    const t = setTimeout(() => setDust((prev) => prev.filter((d) => d.id !== id)), 520);
    floatingTimers.current.push(t);
  }, []);

  const bumpScore = useCallback(() => {
    setScoreScale(1.34);
    const t = setTimeout(() => setScoreScale(1), 150);
    floatingTimers.current.push(t);
  }, []);

  const saltar = useCallback(() => {
    if (jumpCount.current >= MAX_JUMPS || gameOverRef.current) return;
    jumpCount.current += 1;
    jumping.current = true;
    jumpStart.current = performance.now();
    jumpFromY.current = jumpCount.current === 1 ? GROUND_Y : charYRef.current;
    squash(0.9, 1.16, 130); // estirón de despegue
  }, [squash]);

  const addFloatingScore = useCallback(
    (value: number, tipo: "puntos" | "bonus", x: number, y: number) => {
      const id = floatingId.current++;
      setFloatingScores((prev) => [...prev, { id, value, tipo, x, y }]);
      const t = setTimeout(
        () => setFloatingScores((prev) => prev.filter((s) => s.id !== id)),
        1300,
      );
      floatingTimers.current.push(t);
    },
    [],
  );

  const triggerGameOver = useCallback(() => {
    gameOverRef.current = true;
    obsRef.current = [];
    setObsState([]);
    setFloatingScores([]);
    setGameOver(true);
    const t = setTimeout(() => {
      // Reiniciar
      gameOverRef.current = false;
      setGameOver(false);
      setScore(0);
      setGameKey((k) => k + 1);
    }, GAME_OVER_DELAY_MS);
    floatingTimers.current.push(t);
  }, []);

  useEffect(() => {
    // Aleatorizar cita inicial solo en el cliente (evita hydration mismatch)
    const idx = Math.floor(Math.random() * CITAS_DON_QUIJOTE.length);
    citaIdx.current = idx;
    setCita(CITAS_DON_QUIJOTE[idx]);
  }, []);

  useEffect(() => {
    // Resetear estado mutable al iniciar (o reiniciar) la partida
    obsRef.current = [];
    charYRef.current = GROUND_Y;
    jumping.current = false;
    jumpCount.current = 0;
    lastSpawn.current = null;
    nextSpawnDelay.current = randomSpawnDelay();
    prevTime.current = null;
    setCharY(GROUND_Y);
    setObsState([]);
    setFloatingScores([]);

    const obstaculosPool = isEN
      ? modo === "prueba1"
        ? OBSTACULOS_PAPER1_EN
        : modo === "oral"
          ? OBSTACULOS_ORAL_EN
          : OBSTACULOS_PAPER2_EN
      : modo === "prueba1"
        ? OBSTACULOS_PRUEBA1
        : modo === "oral"
          ? OBSTACULOS_ORAL
          : OBSTACULOS_PRUEBA2;
    const bonusPool = isEN
      ? modo === "prueba1"
        ? BONUS_PAPER1_EN
        : modo === "oral"
          ? BONUS_ORAL_EN
          : BONUS_PAPER2_EN
      : modo === "prueba1"
        ? BONUS_PRUEBA1
        : modo === "oral"
          ? BONUS_ORAL
          : BONUS_PRUEBA2;
    const CITAS_POOL = isEN ? CITAS_SHAKESPEARE : CITAS_DON_QUIJOTE;

    const tick = (now: number) => {
      // Detener el loop si hay game over
      if (gameOverRef.current) return;

      const dt = prevTime.current !== null ? Math.min(now - prevTime.current, 50) : 16;
      prevTime.current = now;

      // Rotar citas con fundido cruzado
      if (lastCita.current === null) {
        lastCita.current = now;
      } else if (now - lastCita.current > CITA_INTERVAL_MS) {
        citaIdx.current = (citaIdx.current + 1) % CITAS_POOL.length;
        lastCita.current = now;
        setCitaOp(0);
        const idx = citaIdx.current;
        const t = setTimeout(() => {
          setCita(CITAS_POOL[idx]);
          setCitaOp(1);
        }, 220);
        floatingTimers.current.push(t);
      }

      // Spawn de molinos
      if (lastSpawn.current === null) {
        lastSpawn.current = now;
      } else if (now - lastSpawn.current > nextSpawnDelay.current) {
        const isBonus = Math.random() < 0.22;
        const label = isBonus ? pickRandom(bonusPool) : pickRandom(obstaculosPool);
        obsRef.current.push({
          id: nextId.current++,
          label,
          tipo: isBonus ? "bonus" : "malo",
          x: SPAWN_X,
          w: WINDMILL_W,
          scored: false,
        });
        lastSpawn.current = now;
        nextSpawnDelay.current = randomSpawnDelay();
      }

      // Mover molinos
      const dx = SPEED_PX_MS * dt;
      obsRef.current = obsRef.current.map((o) => ({ ...o, x: o.x - dx }));

      // Posición del personaje
      let currentCharY = GROUND_Y;
      if (jumping.current) {
        const progress = Math.min(1, (now - jumpStart.current) / JUMP_MS);
        const y = arcY(progress, jumpFromY.current);
        if (y >= GROUND_Y || progress >= 1) {
          jumping.current = false;
          jumpCount.current = 0;
          jumpFromY.current = GROUND_Y;
          charYRef.current = GROUND_Y;
          currentCharY = GROUND_Y;
          setCharY(GROUND_Y);
          // Aterrizaje: aplastón + nube de polvo
          squash(1.18, 0.8, 140);
          addDust(CHAR_X - 26);
          addDust(CHAR_X - 6);
        } else {
          const rounded = Math.round(y);
          charYRef.current = rounded;
          currentCharY = rounded;
          setCharY(rounded);
        }
      }

      // Polvo de carrera (cuando corre por el suelo)
      if (!jumping.current && now - lastDust.current > 200) {
        lastDust.current = now;
        addDust(CHAR_X - 30);
      }

      // Detección de colisiones
      const charL = CHAR_X - CHAR_W / 2 + 6;
      const charR = CHAR_X + CHAR_W / 2 - 6;
      const charT = currentCharY + 12;
      const charB = currentCharY + CHAR_H - 4;
      const obsT = OBS_GROUND_Y + 3;
      const obsB = OBS_GROUND_Y + OBS_H - 3;

      let maloHitId: number | null = null;
      let bonusHitId: number | null = null;
      let bonusHitX = 0;

      for (const o of obsRef.current) {
        if (o.scored) continue;
        if (o.x + o.w < CHAR_X - CHAR_W / 2) continue;
        const obsL = o.x + 6;
        const obsR = o.x + o.w - 6;
        if (charR > obsL && charL < obsR && charB > obsT && charT < obsB) {
          if (o.tipo === "malo" && maloHitId === null) maloHitId = o.id;
          if (o.tipo === "bonus" && bonusHitId === null) {
            bonusHitId = o.id;
            bonusHitX = Math.round(o.x + WINDMILL_W / 2);
          }
        }
      }

      // Colisión con molino rojo → GAME OVER
      if (maloHitId !== null) {
        triggerGameOver();
        return; // detiene el loop (no re-encola RAF)
      }

      // Colisión con molino verde → +5
      if (bonusHitId !== null) {
        obsRef.current = obsRef.current.filter((o) => o.id !== bonusHitId);
        setScore((s) => s + 5);
        bumpScore();
        addFloatingScore(5, "bonus", bonusHitX, currentCharY + 10);
      }

      // Molinos rojos esquivados → +1 cada uno
      let gained = 0;
      const surviving: Obs[] = [];
      for (const o of obsRef.current) {
        if (o.x + o.w < -30) continue;
        if (!o.scored && o.x + o.w < CHAR_X - CHAR_W / 2) {
          if (o.tipo === "malo") {
            gained++;
            addFloatingScore(1, "puntos", CHAR_X, charYRef.current + 10);
          }
          surviving.push({ ...o, scored: true });
        } else {
          surviving.push(o);
        }
      }
      obsRef.current = surviving;
      if (gained > 0) {
        setScore((s) => s + gained);
        bumpScore();
      }

      setObsState([...obsRef.current]);
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId.current);
      floatingTimers.current.forEach(clearTimeout);
      floatingTimers.current = [];
    };
  }, [modo, addFloatingScore, triggerGameOver, gameKey, isEN, squash, addDust, bumpScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        saltar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saltar]);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          20%  { opacity: 1; transform: translateY(-8px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-42px) scale(0.85); }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes legRun {
          0%, 100% { transform: rotate(-20deg); }
          50%      { transform: rotate(20deg); }
        }
        /* ── Vida del galope ── */
        @keyframes jqBob  { 0%,100% { transform: translateY(0) rotate(-0.6deg); } 50% { transform: translateY(-2.6px) rotate(0.6deg); } }
        @keyframes jqTail { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(8deg); } }
        @keyframes jqCape { 0%,100% { transform: skewX(0deg) scaleX(1); } 50% { transform: skewX(-10deg) scaleX(1.06); } }
        @keyframes jqMane { 0%,100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(-0.6px) rotate(-4deg); } }
        @keyframes jqFlag { 0%,100% { transform: scaleY(1) skewX(0deg); } 50% { transform: scaleY(0.8) skewX(-14deg); } }
        /* ── Atmósfera ── */
        @keyframes jqSun     { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: .85; transform: scale(1.07); } }
        @keyframes jqFarSpin { to { transform: rotate(360deg); } }
        @keyframes jqScroll60 { to { transform: translateX(-60px); } }
        @keyframes jqScroll50 { to { transform: translateX(-50px); } }
        @keyframes jqPop  { 0% { opacity: 0; transform: scale(.55) translateY(6px); } 60% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }
        @keyframes jqDust { 0% { opacity: .5; transform: scale(.4) translateX(0); } 100% { opacity: 0; transform: scale(1.7) translateX(-18px); } }
        @media (prefers-reduced-motion: reduce) {
          .jq-anim, .jq-anim * { animation-duration: .001ms !important; transition: none !important; }
        }
      `}</style>

      <div
        className="jq-anim select-none rounded-2xl border p-4"
        style={{
          backgroundColor: L.surface,
          borderColor: L.line,
          boxShadow: cardShadow,
          opacity: entered ? 1 : 0,
          transform: `translateY(${entered ? 0 : 16}px) scale(${entered ? 1 : 0.97})`,
          transformOrigin: "50% 30%",
          transition: "opacity .55s ease, transform .65s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div className="mb-2">
          <div
            className="mb-0.5 text-[10px] uppercase tracking-[0.2em]"
            style={{ ...fontMono, color: L.muted }}
          >
            {isEN ? TITULOS_EN[modo] : TITULOS_ES[modo]}
          </div>
          <p className="text-xs" style={{ color: L.muted }}>
            {isEN ? SUBTITULO_EN : SUBTITULO_ES}
          </p>
        </div>

        {/* Bocadillo de Don Quijote */}
        <div className="relative mb-1">
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{ backgroundColor: L.bg2, borderColor: L.line }}
          >
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ ...fontMono, color: L.primary }}
            >
              {isEN ? "Shakespeare" : "Don Quijote"}
            </p>
            <p
              className="text-xs italic leading-snug"
              style={{ color: L.ink, opacity: citaOp, transition: "opacity .35s ease" }}
              aria-live="polite"
            >
              {cita}
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -8,
              left: CHAR_X - 6,
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: `8px solid ${L.line}`,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -6,
              left: CHAR_X - 5,
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `7px solid ${L.bg2}`,
            }}
          />
        </div>

        {/* Área de juego */}
        <div
          className="relative cursor-pointer overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ height: GAME_H, borderColor: L.line }}
          onClick={saltar}
          onTouchStart={(e) => {
            e.preventDefault();
            saltar();
          }}
          role="button"
          aria-label={
            isEN
              ? "Game area — tap or press space to jump (double jump available)"
              : "Área de juego — toca o pulsa espacio para saltar (doble salto disponible)"
          }
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.code === "Space" || e.code === "ArrowUp") {
              e.preventDefault();
              saltar();
            }
          }}
        >
          {/* Fondo de La Mancha */}
          <FondoLaMancha bgId={bgId} />

          {/* Surcos en scroll — parallax que mata el efecto "patinar" */}
          <div
            aria-hidden="true"
            className="absolute left-0 pointer-events-none"
            style={{
              bottom: 13,
              width: "200%",
              height: 3,
              opacity: 0.55,
              background: "repeating-linear-gradient(90deg,#f0c040 0 22px,transparent 22px 60px)",
              animation: "jqScroll60 1.05s linear infinite",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute left-0 pointer-events-none"
            style={{
              bottom: 6,
              width: "200%",
              height: 2,
              opacity: 0.45,
              background: "repeating-linear-gradient(90deg,#d07820 0 14px,transparent 14px 50px)",
              animation: "jqScroll50 0.78s linear infinite",
            }}
          />

          {/* Suelo */}
          <div
            className="absolute left-0 right-0 border-t border-white/20"
            style={{ top: GAME_H - 8 }}
            aria-hidden="true"
          />

          {/* Marcador — late al sumar */}
          <div
            className="absolute top-2 right-3 text-[13px] font-bold font-mono tabular-nums"
            style={{
              color: "#ffd700",
              textShadow: "0 1px 4px rgba(0,0,0,0.7)",
              transform: `scale(${scoreScale})`,
              transition: "transform .16s ease",
            }}
          >
            {score}
          </div>

          {/* Don Quijote — entra al galope (translateX) + squash&stretch (scale) */}
          <div
            className="absolute"
            style={{
              left: CHAR_X - 34,
              top: charY,
              width: 68,
              height: CHAR_H,
              transform: `translateX(${entered ? 0 : -170}px)`,
              transition: "transform .9s cubic-bezier(.2,.8,.2,1)",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                transform: `scale(${charScale.sx}, ${charScale.sy})`,
                transformOrigin: "50% 100%",
                transition: "transform .12s ease",
              }}
            >
              <DonQuijoteEnRocinante color="#1c1c1e" />
            </div>
          </div>

          {/* Molinos — aparecen con "pop" */}
          {obsState.map((o) => (
            <div
              key={o.id}
              className="absolute pointer-events-none"
              style={{
                left: Math.round(o.x),
                top: WINDMILL_TOP,
                animation: "jqPop .34s cubic-bezier(.2,.8,.2,1)",
              }}
              aria-hidden="true"
            >
              <MolinoDeViento label={o.label} tipo={o.tipo} />
            </div>
          ))}

          {/* Nubes de polvo */}
          {dust.map((d) => (
            <div
              key={d.id}
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                left: d.x,
                top: GAME_H - 14,
                width: 9,
                height: 9,
                borderRadius: 99,
                background: "rgba(232,180,58,.6)",
                animation: "jqDust .5s ease-out forwards",
              }}
            />
          ))}

          {/* Puntos flotantes */}
          {floatingScores.map((fs) => (
            <div
              key={fs.id}
              aria-hidden="true"
              className="absolute pointer-events-none font-bold text-sm leading-none"
              style={{
                left: fs.x - 14,
                top: fs.y,
                color: fs.tipo === "bonus" ? "#ffd700" : "#86efac",
                textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                animation: "floatUp 1.3s ease-out forwards",
              }}
            >
              {fs.tipo === "bonus" ? "+5 !" : "+1"}
            </div>
          ))}

          {/* Game over overlay */}
          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              style={{
                background: "rgba(10,20,60,0.78)",
                animation: "fadeInOverlay 0.25s ease-out",
              }}
              aria-live="assertive"
            >
              <p
                className="text-white font-bold text-base leading-tight text-center"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
              >
                {isEN ? "Windmill: 1 — Shakespeare: 0!" : "¡Molino: 1 — Quijote: 0!"}
              </p>
              <p
                className="text-white/75 text-[11px] mt-1 italic text-center px-6"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
              >
                {isEN
                  ? "Every hero falls. The great one rises."
                  : "Todo caballero cae. El grande, se levanta."}
              </p>
              <p className="text-white/50 text-[10px] mt-2">
                {isEN ? "Rearming quill…" : "Rearmando lanza…"}
              </p>
            </div>
          )}
        </div>

        {/* Botón de salto */}
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={saltar} className="text-xs h-7 px-3">
            {isEN ? "Jump" : "Saltar"}
          </Button>
        </div>
      </div>
    </>
  );
}
