import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type ModoJuegoEspera = "prueba1" | "prueba2";

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

const TITULOS: Record<ModoJuegoEspera, string> = {
  prueba1: "Don Quijote contra la descripción",
  prueba2: "Don Quijote contra los dos miniensayos",
};

const SUBTITULOS: Record<ModoJuegoEspera, string> = {
  prueba1: "Salta los molinos — errores que bajan banda en la Prueba 1.",
  prueba2: "Salta los molinos — errores que rompen la comparación literaria.",
};

// Constantes del juego
const GAME_H = 160;
const CHAR_H = 60;
const CHAR_W = 38;
const CHAR_X = 92;
const GROUND_Y = GAME_H - CHAR_H - 8; // = 92
const JUMP_PEAK_Y = 4;
const JUMP_MS = 720;
const OBS_H = 28; // altura del hitbox de colisión
const OBS_GROUND_Y = GAME_H - OBS_H - 8; // top del hitbox = 124
const WINDMILL_W = 56; // ancho del molino y del hitbox
const WINDMILL_H = 80; // alto visual del SVG del molino
const WINDMILL_TOP = GAME_H - 8 - WINDMILL_H; // top del div del molino = 72
const SPAWN_X = 900;
const SPEED_PX_MS = 0.19;
const SPAWN_MIN_MS = 2600;
const SPAWN_MAX_MS = 4000;
const CITA_INTERVAL_MS = 5000;
const HIT_FLASH_MS = 320;
const MAX_JUMPS = 2;

type Obs = {
  id: number;
  label: string;
  tipo: "malo" | "bonus";
  x: number;
  w: number;
  scored: boolean;
};

function randomSpawnDelay(): number {
  return SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function arcY(progress: number, fromY: number): number {
  return fromY - Math.pow(Math.sin(Math.PI * progress), 0.6) * (fromY - JUMP_PEAK_Y);
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
      {/* Torre — trapecio, más estrecha en lo alto */}
      <path d="M22 80 L24 34 L32 34 L34 80 Z" fill={towerFill} />
      {/* Puerta arqueada en la base */}
      <path d="M25 80 Q28 73 31 80 Z" fill="rgba(0,0,0,0.18)" />
      {/* Ventana */}
      <rect x="25" y="54" width="6" height="6" rx="1" fill="rgba(255,255,255,0.15)" />
      {/* Etiqueta en la torre */}
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
      {/* Cubo central */}
      <circle cx="28" cy="34" r="4.5" fill={towerFill} stroke={bladeFill} strokeWidth="1.5" />
      {/* Aspas giratorias via CSS (Tailwind define @keyframes spin) */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "spin 2.8s linear infinite",
        }}
      >
        {/* Aspa arriba */}
        <path d="M25 34 L23 8 L28 6 L33 8 L31 34 Z" fill={bladeFill} opacity="0.92" />
        {/* Aspa derecha */}
        <path d="M28 31 L54 28 L56 34 L54 40 L28 37 Z" fill={bladeFill} opacity="0.92" />
        {/* Aspa abajo */}
        <path d="M25 34 L23 60 L28 62 L33 60 L31 34 Z" fill={bladeFill} opacity="0.92" />
        {/* Aspa izquierda */}
        <path d="M28 31 L2 28 L0 34 L2 40 L28 37 Z" fill={bladeFill} opacity="0.92" />
      </g>
    </svg>
  );
}

// ── Don Quijote a lomos de Rocinante ─────────────────────────────────────────
function DonQuijoteEnRocinante({ color }: { color: string }) {
  return (
    <svg
      width="68"
      height="60"
      viewBox="0 0 100 75"
      fill={color}
      overflow="visible"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* ── ROCINANTE ── */}

      {/* Cuerpo — delgado, costillas prominentes */}
      <path d="M14 54 Q18 42 40 42 Q62 42 66 52 Q58 62 40 63 Q22 63 14 54 Z" />
      {/* Costillas del pobre Rocinante */}
      <path d="M28 46 Q30 52 28 58" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <path d="M35 44 Q37 51 35 60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <path d="M42 44 Q44 51 42 61" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

      {/* Cuello — largo y nervioso */}
      <path
        d="M60 46 Q66 38 70 30"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Cabeza del caballo */}
      <ellipse cx="73" cy="27" rx="9" ry="7" />
      {/* Hocico alargado */}
      <path d="M80 25 Q92 26 90 32 Q82 34 78 30" />
      {/* Ollares */}
      <ellipse cx="88" cy="30" rx="1.5" ry="1" fill="rgba(0,0,0,0.35)" />
      {/* Ojo */}
      <circle cx="77" cy="24" r="2" fill="rgba(255,255,255,0.6)" />
      <circle cx="77" cy="24" r="1" fill={color} />
      {/* Oreja */}
      <polygon points="68,22 70,14 74,21" />
      {/* Crin sobre el cuello */}
      <path
        d="M68 26 Q66 31 64 36 Q62 40 60 44"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Cola — recta, diagonal hacia arriba-atrás */}
      <path d="M16 54 L3 40" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />

      {/* Patas — trote largo */}
      <line
        x1="62"
        y1="61"
        x2="70"
        y2="74"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1="57"
        y1="62"
        x2="60"
        y2="72"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="62"
        x2="10"
        y2="74"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="63"
        x2="22"
        y2="74"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* ── DON QUIJOTE ── */}

      {/* Torso enjuto */}
      <path d="M34 42 Q32 30 30 20 Q38 17 46 20 Q46 32 44 42 Z" />
      <line x1="38" y1="20" x2="38" y2="42" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <rect x="32" y="35" width="12" height="2" rx="1" opacity="0.4" />

      {/* Cuello */}
      <rect x="35" y="18" width="6" height="4" rx="1" />

      {/* Rostro — estrecho y enjuto */}
      <ellipse cx="38" cy="14" rx="5.5" ry="6" />

      {/* Yelmo de Mambrino */}
      <path d="M32 13 Q32 4 38 4 Q44 4 44 13" />
      <ellipse cx="38" cy="13" rx="10" ry="3" />
      <rect x="33" y="15" width="10" height="1.5" rx="0.5" opacity="0.35" />

      {/* Barba puntiaguda */}
      <path d="M34 19 L38 26 L42 19" />
      {/* Bigote */}
      <path
        d="M34 18 Q38 20 42 18"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Brazo derecho */}
      <line
        x1="45"
        y1="24"
        x2="50"
        y2="30"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Lanza — muy larga, diagonal hacia arriba-derecha */}
      <line x1="50" y1="30" x2="106" y2="1" stroke={color} strokeWidth="2.5" />
      <polygon points="106,0 101,0 103,5" />
      <path d="M100 4 L95 2 L97 8 Z" opacity="0.7" />

      {/* Brazo izquierdo + Rodela */}
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

      {/* Capa al viento */}
      <path
        d="M44 21 C54 28 54 40 48 48"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function JuegoEsperaEvaluacion({ modo = "prueba1" }: { modo?: ModoJuegoEspera }) {
  const jumping = useRef(false);
  const jumpCount = useRef(0);
  const jumpStart = useRef(0);
  const jumpFromY = useRef(GROUND_Y);
  const charYRef = useRef(GROUND_Y);
  const obsRef = useRef<Obs[]>([]);
  const nextId = useRef(0);
  const lastSpawn = useRef<number | null>(null);
  const nextSpawnDelay = useRef(randomSpawnDelay());
  const citaIdx = useRef(Math.floor(Math.random() * CITAS_DON_QUIJOTE.length));
  const lastCita = useRef<number | null>(null);
  const hitFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef(0);
  const prevTime = useRef<number | null>(null);

  const [charY, setCharY] = useState(GROUND_Y);
  const [obsState, setObsState] = useState<Obs[]>([]);
  const [score, setScore] = useState(0);
  const [cita, setCita] = useState(CITAS_DON_QUIJOTE[citaIdx.current]);
  const [hitFlash, setHitFlash] = useState(false);

  const saltar = useCallback(() => {
    if (jumpCount.current >= MAX_JUMPS) return;
    jumpCount.current += 1;
    jumping.current = true;
    jumpStart.current = performance.now();
    jumpFromY.current = jumpCount.current === 1 ? GROUND_Y : charYRef.current;
  }, []);

  useEffect(() => {
    const obstaculosPool = modo === "prueba1" ? OBSTACULOS_PRUEBA1 : OBSTACULOS_PRUEBA2;
    const bonusPool = modo === "prueba1" ? BONUS_PRUEBA1 : BONUS_PRUEBA2;

    const tick = (now: number) => {
      const dt = prevTime.current !== null ? Math.min(now - prevTime.current, 50) : 16;
      prevTime.current = now;

      // Rotar citas
      if (lastCita.current === null) {
        lastCita.current = now;
      } else if (now - lastCita.current > CITA_INTERVAL_MS) {
        citaIdx.current = (citaIdx.current + 1) % CITAS_DON_QUIJOTE.length;
        setCita(CITAS_DON_QUIJOTE[citaIdx.current]);
        lastCita.current = now;
      }

      // Spawn
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

      // Mover obstáculos
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
        } else {
          const rounded = Math.round(y);
          charYRef.current = rounded;
          currentCharY = rounded;
          setCharY(rounded);
        }
      }

      // Detección de colisión
      let hitId: number | null = null;
      for (const o of obsRef.current) {
        if (o.tipo !== "malo" || o.scored) continue;
        if (o.x + o.w < CHAR_X - CHAR_W / 2) continue;

        const charL = CHAR_X - CHAR_W / 2 + 6;
        const charR = CHAR_X + CHAR_W / 2 - 6;
        const charT = currentCharY + 12;
        const charB = currentCharY + CHAR_H - 4;
        const obsL = o.x + 6;
        const obsR = o.x + o.w - 6;
        const obsT = OBS_GROUND_Y + 3;
        const obsB = OBS_GROUND_Y + OBS_H - 3;

        if (charR > obsL && charL < obsR && charB > obsT && charT < obsB) {
          hitId = o.id;
          break;
        }
      }

      if (hitId !== null) {
        obsRef.current = obsRef.current.filter((o) => o.id !== hitId);
        if (hitFlashTimer.current) clearTimeout(hitFlashTimer.current);
        setHitFlash(true);
        hitFlashTimer.current = setTimeout(() => setHitFlash(false), HIT_FLASH_MS);
      }

      // Puntuación y limpieza
      let gained = 0;
      const surviving: Obs[] = [];
      for (const o of obsRef.current) {
        if (o.x + o.w < -30) continue;
        if (!o.scored && o.x + o.w < CHAR_X - CHAR_W / 2) {
          if (o.tipo === "malo") gained++;
          surviving.push({ ...o, scored: true });
        } else {
          surviving.push(o);
        }
      }
      obsRef.current = surviving;
      if (gained > 0) setScore((s) => s + gained);

      setObsState([...obsRef.current]);
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId.current);
      if (hitFlashTimer.current) clearTimeout(hitFlashTimer.current);
    };
  }, [modo]);

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

  const charColor = hitFlash ? "#ef4444" : "var(--color-ink, #1c1c1e)";

  return (
    <div className="rounded-lg border border-border bg-card p-4 select-none">
      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
          {TITULOS[modo]}
        </div>
        <p className="text-xs text-foreground/60">{SUBTITULOS[modo]}</p>
      </div>

      {/* Bocadillo de Don Quijote */}
      <div className="relative mb-1">
        <div className="rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            Don Quijote
          </p>
          <p className="text-xs italic text-foreground/75 leading-snug" aria-live="polite">
            {cita}
          </p>
        </div>
        {/* Cola del bocadillo — triángulo CSS apuntando hacia abajo, alineado con Quijote */}
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
            borderTop: "8px solid hsl(var(--border))",
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
            borderTop: "7px solid hsl(var(--background))",
          }}
        />
      </div>

      {/* Área de juego */}
      <div
        className="relative overflow-hidden rounded border border-border bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ height: GAME_H }}
        onClick={saltar}
        onTouchStart={(e) => {
          e.preventDefault();
          saltar();
        }}
        role="button"
        aria-label="Área de juego — toca o pulsa espacio para saltar (doble salto disponible)"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            saltar();
          }
        }}
      >
        {/* Suelo */}
        <div
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: GAME_H - 8 }}
          aria-hidden="true"
        />

        {/* Puntuación */}
        <div className="absolute top-2 right-3 text-[11px] font-mono text-muted-foreground">
          {score}
        </div>

        {/* Don Quijote a lomos de Rocinante */}
        <div
          className="absolute"
          style={{ left: CHAR_X - 34, top: charY, width: 68, height: CHAR_H }}
          aria-hidden="true"
        >
          <DonQuijoteEnRocinante color={charColor} />
        </div>

        {/* Molinos de viento */}
        {obsState.map((o) => (
          <div
            key={o.id}
            className="absolute pointer-events-none"
            style={{ left: Math.round(o.x), top: WINDMILL_TOP }}
            aria-hidden="true"
          >
            <MolinoDeViento label={o.label} tipo={o.tipo} />
          </div>
        ))}
      </div>

      {/* Botón de salto */}
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={saltar} className="text-xs h-7 px-3">
          Saltar
        </Button>
      </div>
    </div>
  );
}
