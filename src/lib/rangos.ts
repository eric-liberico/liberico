// ─────────────────────────────────────────────────────────────────────────────
// RANGOS — "El ascenso al Oro"
// Los niveles de gamificación son figuras del Siglo de Oro. El ramp de color
// asciende del polvo picaresco (piedra fría) al pan de oro luminoso: la calidez
// y la luminancia crecen monótonamente, así la "subida" se lee de un vistazo.
// Doble candado: subes de nivel solo si tienes XP Y nota media suficiente —
// la gamificación empuja hacia la corrección (el foco del producto).
// Fuente única consumida por RangoChip (header).
// ─────────────────────────────────────────────────────────────────────────────

import { NOMBRES_EN } from "@/lib/gamificacion-en";
export { NOMBRES_EN };

// Umbrales de XP acumulado y nota media mínima por nivel (índice = nivel 0..7).
export const NIVELES_XP = [0, 100, 300, 600, 1000, 1500, 2200, 3000];
export const NIVELES_NOTA = [0, 1, 2, 3, 4, 5, 6, 7];

export const NOMBRES_ES = [
  "Lazarillo",
  "Juglar",
  "Galán",
  "Hidalgo",
  "Gongorino",
  "Quevedesco",
  "El Fénix",
  "Cervantes",
];

export type RangoAnim = "ember" | "leaf";

export type RangoTier = {
  /** Acento del tier (anillo, texto, punto del riel). */
  color: string;
  /** Gradiente de la insignia: claro → oscuro. */
  from: string;
  to: string;
  /** Material que da nombre al tono (ES / EN). */
  material: string;
  materialEN: string;
  /** Animación especial — solo en las dos cumbres. */
  anim?: RangoAnim;
};

// Ramp metálico cálido. Las dos cumbres rompen el patrón con identidad propia:
// El Fénix = ascua viva (parpadeo), Cervantes = pan de oro (destello + glow).
export const RANGOS: RangoTier[] = [
  { color: "#6E7079", from: "#8A8E97", to: "#585B63", material: "piedra", materialEN: "stone" },
  { color: "#8A7A66", from: "#A8957C", to: "#6B5C4A", material: "arcilla", materialEN: "clay" },
  { color: "#A0743F", from: "#C28A4E", to: "#7C5930", material: "bronce", materialEN: "bronze" },
  { color: "#B5823A", from: "#D49E49", to: "#8C652B", material: "latón", materialEN: "brass" },
  {
    color: "#C89A2E",
    from: "#E4B43F",
    to: "#9C7820",
    material: "oro viejo",
    materialEN: "old gold",
  },
  { color: "#DCAE1E", from: "#F4C838", to: "#AE8815", material: "oro", materialEN: "gold" },
  {
    color: "#E07B2C",
    from: "#F79B3D",
    to: "#C25917",
    material: "ascua",
    materialEN: "ember",
    anim: "ember",
  }, // El Fénix
  {
    color: "#E0A92E",
    from: "#FFD75E",
    to: "#C68A1C",
    material: "pan de oro",
    materialEN: "gold leaf",
    anim: "leaf",
  }, // Cervantes
];

export type NivelInfo = {
  nivel: number;
  nombre: string;
  tier: RangoTier;
  /** Progreso 0–100 hacia el siguiente nivel. */
  progreso: number;
  xp: number;
  xpNivel: number;
  xpSiguiente: number;
  esFinal: boolean;
  /** True si la nota media (no el XP) es lo que frena la subida. */
  notaBloqueando: boolean;
  notaMedia: number;
  notaNecesaria: number | null;
  siguienteNombre: string | null;
};

export function calcularNivel(xp: number, notaMedia: number, isEN = false): NivelInfo {
  const NOMBRES = isEN ? NOMBRES_EN : NOMBRES_ES;

  let nivelPorXP = 0;
  for (let i = NIVELES_XP.length - 1; i >= 0; i--) {
    if (xp >= NIVELES_XP[i]) {
      nivelPorXP = i;
      break;
    }
  }
  const nivelPorNota = Math.min(7, Math.floor(notaMedia));
  const nivel = Math.min(nivelPorXP, nivelPorNota);

  const esFinal = nivel >= NIVELES_XP.length - 1;
  const xpNivel = NIVELES_XP[nivel];
  const xpSiguiente = esFinal ? NIVELES_XP[NIVELES_XP.length - 1] : NIVELES_XP[nivel + 1];

  let progreso: number;
  if (esFinal || nivelPorXP > nivel) progreso = 100;
  else progreso = Math.round(((xp - xpNivel) / (xpSiguiente - xpNivel)) * 100);

  const notaBloqueando = !esFinal && nivelPorXP > nivelPorNota;
  const notaNecesaria = esFinal ? null : NIVELES_NOTA[nivel + 1];

  return {
    nivel,
    nombre: NOMBRES[nivel] ?? NOMBRES[NOMBRES.length - 1],
    tier: RANGOS[nivel] ?? RANGOS[RANGOS.length - 1],
    progreso,
    xp,
    xpNivel,
    xpSiguiente,
    esFinal,
    notaBloqueando,
    notaMedia,
    notaNecesaria,
    siguienteNombre: esFinal ? null : (NOMBRES[nivel + 1] ?? null),
  };
}
