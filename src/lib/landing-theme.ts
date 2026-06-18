export const LANDING_FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap";

// ─────────────────────────────────────────────────────────────────────────────
// SALTO DE BANDA — tema landing
// Pergamino cálido + azul lectivo (ADN de la app) + un único ámbar de examinador.
// Tensión deliberada: serif literario (texto humano) ↔ mono (nota/evaluación).
// ─────────────────────────────────────────────────────────────────────────────

export const SALTO = {
  paper: "#FAF8F3", // fondo (cálido, no crema-amarillo)
  panel: "#F2ECE1", // bloques sutiles sobre pergamino
  ink: "#14213D", // texto principal (azul-tinta)
  inkSoft: "#5A6275", // texto secundario
  blue: "#1E3A5F", // azul lectivo — paneles de confianza
  blueDeep: "#0F2440", // panel profundo
  amber: "#E8A13A", // LA marca: resaltado de la pluma del examinador
  amberDeep: "#C9821F", // hover del ámbar
  rule: "#E7E1D6", // líneas finas / bordes sobre pergamino
} as const;

// Colores de criterio IB (coherentes con el resto de la app) — solo como datos.
export const CRITERION = {
  A: "#16a34a",
  B: "#3b6fa0",
  C: "#d97706",
  D: "#e11d48",
} as const;

// Fraunces: serif de display con carácter (titulares + texto del alumno).
export const landingFontDisplay = {
  fontFamily: "'Fraunces', 'Libre Baskerville', Georgia, serif",
} as const;

// IBM Plex Mono: cifras de notas y bandas — sensación de estimación precisa.
export const landingFontMono = {
  fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// NAVY — tema anterior (en uso por secciones aún no migradas)
// ─────────────────────────────────────────────────────────────────────────────

export const NAVY = {
  bg: "#0f1b3d",
  bgDeep: "#0a1229",
  mid: "#1e3a5f",
  blue: "#3b6fa0",
  paper: "#e8edf3",
} as const;

export const landingFontSerif = {
  fontFamily: "'Libre Baskerville', Georgia, serif",
} as const;

export const landingFontSans = {
  fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
} as const;
