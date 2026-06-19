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

// ─────────────────────────────────────────────────────────────────────────────
// CLARO PREMIUM — tema actual de la landing (fuente única; consumido por
// LandingPage y login). Lienzo cálido + índigo (acción) + ámbar (marca).
// ─────────────────────────────────────────────────────────────────────────────

// Paleta clara — lienzo cálido suave + tarjetas blancas
export const LANDING = {
  bg: "#F6F5F2",
  bg2: "#EFEDE7",
  surface: "#FFFFFF",
  ink: "#0F172A",
  muted: "#5A6B86",
  line: "#E6E3DC",
  lineSoft: "#EFEDE7",
  primary: "#4F46E5", // índigo — única acción primaria (CTAs)
  amber: "#E8A13A", // ámbar — solo marca/decoración
  amberDeep: "#9A5E10", // ámbar para TEXTO pequeño — AA sobre claro
  ok: "#15803D", // verde para TEXTO pequeño — AA sobre claro
} as const;

// Banda índigo profundo (momentos de autoridad)
export const DEEP = {
  bg: "#1E1B4B",
  bgAlt: "#171544",
  text: "#ECEAFB",
  muted: "rgba(236,234,251,0.66)",
  border: "rgba(236,234,251,0.14)",
  surface: "rgba(255,255,255,0.05)",
} as const;

// Acentos por criterio (tono AA sobre claro como texto pequeño)
export const CRIT = {
  A: "#2563EB",
  B: "#7C3AED",
  C: "#B45309",
  D: "#E11D48",
} as const;

export const cardShadow =
  "0 14px 30px -20px rgba(15,23,42,0.28), 0 2px 6px -3px rgba(15,23,42,0.08)";
