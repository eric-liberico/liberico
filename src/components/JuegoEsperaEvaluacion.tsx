import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type ModoJuegoEspera = "prueba1" | "prueba2";

// --- Contenido pedagógico por modo ---

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

const MENSAJES_PRUEBA1 = [
  "Claude está leyendo tu análisis…",
  "Revisando criterios A-D…",
  "Buscando oportunidades de reescritura…",
  "Preparando tu feedback anotado…",
  "Detectando fortalezas y áreas de mejora…",
];

const MENSAJES_PRUEBA2 = [
  "Claude está leyendo tu ensayo comparativo…",
  "Revisando conocimiento de las obras…",
  "Detectando si comparas o solo yuxtapones…",
  "Analizando equilibrio entre las dos obras…",
  "Preparando feedback de Prueba 2…",
];

const TITULOS: Record<ModoJuegoEspera, string> = {
  prueba1: "Don Quijote contra la descripción",
  prueba2: "Don Quijote contra los dos miniensayos",
};

const SUBTITULOS: Record<ModoJuegoEspera, string> = {
  prueba1: "Salta los errores que bajan banda en la Prueba 1.",
  prueba2: "Salta los errores que rompen una comparación literaria.",
};

// --- Constantes de juego ---

const GAME_H = 128;
const CHAR_X = 72; // px desde la izquierda del contenedor
const CHAR_W = 22;
const CHAR_H = 44;
const GROUND_Y = GAME_H - CHAR_H - 10; // y-top del personaje en reposo
const JUMP_PEAK_Y = 8; // y-top en el punto más alto del salto
const JUMP_MS = 560;
const OBS_H = 28;
const OBS_GROUND_Y = GAME_H - OBS_H - 10; // y-top del obstáculo
const SPAWN_X = 860; // fuera de la pantalla por la derecha
const SPEED_PX_MS = 0.2; // píxeles por milisegundo (~3.2px por frame a 60fps)
const SPAWN_MIN_MS = 1800;
const SPAWN_MAX_MS = 3200;
const MENSAJE_INTERVAL_MS = 4000;
const HIT_FLASH_MS = 320;

type Obs = {
  id: number;
  label: string;
  tipo: "malo" | "bonus";
  x: number;
  w: number;
  scored: boolean;
};

function estimateW(label: string): number {
  return Math.max(72, label.length * 8 + 24);
}

function randomSpawnDelay(): number {
  return SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Silueta simplificada de Don Quijote (yelmo, lanza, cuerpo, piernas)
function DonQuijoteSVG({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="44"
      viewBox="0 0 22 44"
      fill={color}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* yelmo */}
      <ellipse cx="11" cy="6" rx="5.5" ry="5" />
      {/* visera */}
      <rect x="5" y="10" width="12" height="2" rx="1" opacity="0.75" />
      {/* torso */}
      <rect x="7" y="12" width="8" height="13" rx="2" />
      {/* lanza */}
      <line x1="13" y1="14" x2="22" y2="8" stroke={color} strokeWidth="1.5" fill="none" />
      {/* brazo escudo */}
      <line x1="7" y1="17" x2="1" y2="22" stroke={color} strokeWidth="2" fill="none" />
      {/* pierna izquierda */}
      <line
        x1="9"
        y1="25"
        x2="6"
        y2="40"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* pierna derecha */}
      <line
        x1="13"
        y1="25"
        x2="16"
        y2="40"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function JuegoEsperaEvaluacion({ modo = "prueba1" }: { modo?: ModoJuegoEspera }) {
  // Estado mutable del juego en refs (sin re-render en cada mutación)
  const jumping = useRef(false);
  const jumpStart = useRef(0);
  const obsRef = useRef<Obs[]>([]);
  const nextId = useRef(0);
  const lastSpawn = useRef<number | null>(null);
  const nextSpawnDelay = useRef(randomSpawnDelay());
  const mensajeIdx = useRef(0);
  const lastMensaje = useRef<number | null>(null);
  const hitFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef(0);
  const prevTime = useRef<number | null>(null);

  // Estado React para el render (batched en React 18 dentro de rAF)
  const [charY, setCharY] = useState(GROUND_Y);
  const [obsState, setObsState] = useState<Obs[]>([]);
  const [score, setScore] = useState(0);
  const [mensaje, setMensaje] = useState(
    modo === "prueba1" ? MENSAJES_PRUEBA1[0] : MENSAJES_PRUEBA2[0],
  );
  const [hitFlash, setHitFlash] = useState(false);

  const saltar = useCallback(() => {
    if (jumping.current) return;
    jumping.current = true;
    jumpStart.current = performance.now();
  }, []);

  // Loop principal del juego
  useEffect(() => {
    const obstaculosPool = modo === "prueba1" ? OBSTACULOS_PRUEBA1 : OBSTACULOS_PRUEBA2;
    const bonusPool = modo === "prueba1" ? BONUS_PRUEBA1 : BONUS_PRUEBA2;
    const mensajesPool = modo === "prueba1" ? MENSAJES_PRUEBA1 : MENSAJES_PRUEBA2;

    const tick = (now: number) => {
      const dt = prevTime.current !== null ? Math.min(now - prevTime.current, 50) : 16;
      prevTime.current = now;

      // — Rotar mensaje de carga —
      if (lastMensaje.current === null) {
        lastMensaje.current = now;
      } else if (now - lastMensaje.current > MENSAJE_INTERVAL_MS) {
        mensajeIdx.current = (mensajeIdx.current + 1) % mensajesPool.length;
        setMensaje(mensajesPool[mensajeIdx.current]);
        lastMensaje.current = now;
      }

      // — Spawn de obstáculos —
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
          w: estimateW(label),
          scored: false,
        });
        lastSpawn.current = now;
        nextSpawnDelay.current = randomSpawnDelay();
      }

      // — Mover obstáculos —
      const dx = SPEED_PX_MS * dt;
      obsRef.current = obsRef.current.map((o) => ({ ...o, x: o.x - dx }));

      // — Calcular y actual del personaje (para colisión) —
      let currentCharY = GROUND_Y;
      if (jumping.current) {
        const progress = Math.min(1, (now - jumpStart.current) / JUMP_MS);
        currentCharY = GROUND_Y - Math.sin(Math.PI * progress) * (GROUND_Y - JUMP_PEAK_Y);
      }

      // — Detectar colisión con obstáculos malos —
      let hitId: number | null = null;
      for (const o of obsRef.current) {
        if (o.tipo !== "malo" || o.scored) continue;
        // Solo comprobar si el obstáculo está en zona de solapamiento horizontal
        if (o.x + o.w < CHAR_X - CHAR_W / 2) continue; // ya pasó

        const charL = CHAR_X - CHAR_W / 2 + 4;
        const charR = CHAR_X + CHAR_W / 2 - 4;
        const charT = currentCharY + 8;
        const charB = currentCharY + CHAR_H - 4;
        const obsL = o.x + 5;
        const obsR = o.x + o.w - 5;
        const obsT = OBS_GROUND_Y + 2;
        const obsB = OBS_GROUND_Y + OBS_H - 2;

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

      // — Puntuar los que pasan sin colisionar + limpiar fuera de pantalla —
      let gained = 0;
      const surviving: Obs[] = [];
      for (const o of obsRef.current) {
        if (o.x + o.w < -30) continue; // descartar fuera de pantalla
        if (!o.scored && o.x + o.w < CHAR_X - CHAR_W / 2) {
          // El obstáculo pasó al personaje sin colisionar
          if (o.tipo === "malo") gained++;
          surviving.push({ ...o, scored: true });
        } else {
          surviving.push(o);
        }
      }
      obsRef.current = surviving;
      if (gained > 0) setScore((s) => s + gained);

      // — Actualizar posición del personaje —
      if (jumping.current) {
        const progress = (now - jumpStart.current) / JUMP_MS;
        if (progress >= 1) {
          jumping.current = false;
          setCharY(GROUND_Y);
        } else {
          setCharY(Math.round(currentCharY));
        }
      }

      // — Sincronizar obstáculos al estado React —
      setObsState([...obsRef.current]);

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId.current);
      if (hitFlashTimer.current) clearTimeout(hitFlashTimer.current);
    };
  }, [modo]);

  // Teclado global
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

  const charColor = hitFlash ? "#ef4444" : "var(--color-ink, #1a1a1a)";

  return (
    <div className="rounded-lg border border-border bg-card p-4 select-none">
      {/* Cabecera */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
          {TITULOS[modo]}
        </div>
        <p className="text-xs text-foreground/60">{SUBTITULOS[modo]}</p>
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
        aria-label="Área de juego — toca o pulsa espacio para saltar"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            saltar();
          }
        }}
      >
        {/* Línea de suelo */}
        <div
          className="absolute left-0 right-0 border-t border-border/60"
          style={{ top: GAME_H - 10 }}
          aria-hidden="true"
        />

        {/* Puntuación */}
        <div
          className="absolute top-2 right-3 text-[11px] font-mono text-muted-foreground"
          aria-label={`Puntuación: ${score}`}
        >
          {score}
        </div>

        {/* Personaje */}
        <div
          className="absolute"
          style={{
            left: CHAR_X - CHAR_W / 2,
            top: charY,
            width: CHAR_W,
            height: CHAR_H,
          }}
          aria-hidden="true"
        >
          <DonQuijoteSVG color={charColor} />
        </div>

        {/* Obstáculos */}
        {obsState.map((o) => (
          <div
            key={o.id}
            className={`absolute flex items-center justify-center rounded-full border px-2.5 text-[10px] font-medium leading-none whitespace-nowrap pointer-events-none ${
              o.tipo === "malo"
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
            style={{
              left: Math.round(o.x),
              top: OBS_GROUND_Y,
              height: OBS_H,
              minWidth: o.w,
            }}
            aria-hidden="true"
          >
            {o.label}
          </div>
        ))}
      </div>

      {/* Pie: mensaje + botón */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground truncate" aria-live="polite">
          {mensaje}
        </p>
        <Button size="sm" variant="outline" onClick={saltar} className="shrink-0 text-xs h-7 px-3">
          Saltar
        </Button>
      </div>
    </div>
  );
}
