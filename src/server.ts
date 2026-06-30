// Server entry de TanStack Start (auto-detectado como `src/server.ts`).
//
// Envuelve el handler estándar con un "muro" de Próximamente (coming soon):
// el público ve una página estática; quien trae la clave correcta entra a la
// app real. Para lanzar de verdad: var `LIBERICO_COMING_SOON=false` y redeploy
// (o borrar este archivo). Spec: docs/superpowers/specs/2026-06-26-coming-soon-gate-design.md
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const startFetch = createStartHandler(defaultStreamHandler);
// El handler de Start sólo necesita la `request`; el cast permite reenviar los
// args del runtime de Cloudflare sin pelearnos con la aridad del tipo.
const passThrough = startFetch as unknown as (
  request: Request,
  ...rest: unknown[]
) => Promise<Response>;

/** Variables de entorno del worker que consume el muro. */
interface GateEnv {
  /** El muro está activo salvo que valga exactamente "false". */
  LIBERICO_COMING_SOON?: string;
  /** Clave de acceso (secret). Si está vacía, no hay forma de entrar (failsafe). */
  LIBERICO_PREVIEW_KEY?: string;
}

const COOKIE_NAME = "liberico_preview";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export default {
  async fetch(request: Request, env: GateEnv, ...rest: unknown[]): Promise<Response> {
    let blocked: Response | null;
    try {
      blocked = gate(request, env);
    } catch {
      // Cualquier fallo del muro → asumir bloqueado (nunca abrir por error).
      return comingSoon(request);
    }
    if (blocked) return blocked;
    return passThrough(request, env, ...rest);
  },
};

/**
 * Decide qué hacer con la request.
 * @returns una `Response` cuando hay que bloquear/redirigir, o `null` para
 *          dejar pasar a la app real.
 */
function gate(request: Request, env: GateEnv): Response | null {
  // En `vite dev` el plugin de Cloudflare no se activa (es build-only), así que
  // `env`/`.dev.vars` no llegan y el muro bloquearía siempre. El muro es una
  // preocupación de producción: en desarrollo local nunca debe aplicarse.
  // `import.meta.env.DEV` lo reemplaza el build por `false`, así que en prod el
  // muro queda intacto.
  if (import.meta.env.DEV) return null;

  // Interruptor de lanzamiento: app normal.
  if (env?.LIBERICO_COMING_SOON === "false") return null;

  const key = (env.LIBERICO_PREVIEW_KEY ?? "").trim();
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");

  // Salir del modo preview.
  if (keyParam === "salir") {
    url.searchParams.delete("key");
    return redirectWithCookie(url.toString(), "", 0);
  }

  // Intento de entrar con clave.
  if (keyParam !== null) {
    if (key && safeEqual(keyParam, key)) {
      url.searchParams.delete("key");
      return redirectWithCookie(url.toString(), key, THIRTY_DAYS);
    }
    return comingSoon(request); // clave incorrecta
  }

  // Cookie de preview válida → pasa a la app.
  if (key && hasValidCookie(request, key)) return null;

  return comingSoon(request);
}

function hasValidCookie(request: Request, key: string): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  try {
    return safeEqual(decodeURIComponent(match[1]), key);
  } catch {
    return false;
  }
}

/** Comparación de tiempo (cuasi) constante para no filtrar la clave por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieHeader(value: string, maxAge: number): string {
  const v = encodeURIComponent(value);
  return `${COOKIE_NAME}=${v}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function redirectWithCookie(location: string, value: string, maxAge: number): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": cookieHeader(value, maxAge),
      "Cache-Control": "no-store",
    },
  });
}

function comingSoon(request: Request): Response {
  const lang = prefersSpanish(request) ? "es" : "en";
  return new Response(renderHtml(lang), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

function prefersSpanish(request: Request): boolean {
  const header = request.headers.get("accept-language") ?? "";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("es");
}

const COPY = {
  es: {
    htmlLang: "es",
    title: "LIBerico — Próximamente",
    eyebrow: "Próximamente",
    heading: "Estamos afinando los últimos detalles.",
    sub: "Volvemos muy pronto.",
  },
  en: {
    htmlLang: "en",
    title: "LIBerico — Coming soon",
    eyebrow: "Coming soon",
    heading: "We're putting the finishing touches in place.",
    sub: "Back very soon.",
  },
} as const;

function renderHtml(lang: "es" | "en"): string {
  const t = COPY[lang];
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500&display=swap" />
<style>
  :root{
    --bg:#F6F5F2; --bg2:#EFEDE7; --ink:#0F172A; --muted:#5A6B86;
    --line:#E6E3DC; --amber:#E8A13A;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; background:var(--bg); color:var(--ink);
    font-family:'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    background-image:radial-gradient(120% 120% at 50% 0%, var(--bg) 40%, var(--bg2) 100%);
  }
  .wrap{min-height:100%; display:flex; align-items:center; justify-content:center; padding:32px}
  .card{max-width:560px; width:100%; text-align:center}
  .mark{
    font-family:'Fraunces','Libre Baskerville',Georgia,serif;
    font-weight:600; font-size:34px; letter-spacing:-0.01em; margin:0 0 28px;
  }
  .mark .ib{color:var(--amber)}
  .eyebrow{
    font-family:'IBM Plex Mono',ui-monospace,monospace; font-weight:500;
    font-size:12px; letter-spacing:0.22em; text-transform:uppercase;
    color:var(--amber); margin:0 0 18px;
  }
  h1{
    font-family:'Fraunces','Libre Baskerville',Georgia,serif;
    font-weight:600; font-size:clamp(26px,5vw,38px); line-height:1.18;
    letter-spacing:-0.015em; margin:0 0 14px;
  }
  p.sub{font-size:16px; line-height:1.6; color:var(--muted); margin:0}
  .rule{width:48px; height:2px; background:var(--amber); border-radius:2px; margin:30px auto 0}
</style>
</head>
<body>
  <main class="wrap">
    <div class="card">
      <p class="mark">L<span class="ib">IB</span>erico</p>
      <p class="eyebrow">${t.eyebrow}</p>
      <h1>${t.heading}</h1>
      <p class="sub">${t.sub}</p>
      <div class="rule"></div>
    </div>
  </main>
</body>
</html>`;
}
