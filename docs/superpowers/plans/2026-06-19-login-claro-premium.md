# Login "Claro premium" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir la página `/login` para que use la misma paleta, caligrafía y formato que la landing ("Claro premium"), sin cambiar la lógica de autenticación.

**Architecture:** Se promueven los tokens de la landing (`L`/`DEEP`/`CRIT`/`cardShadow`) desde consts locales en `LandingPage.tsx` a exports en `landing-theme.ts` (fuente única). Luego se reescribe `login.tsx` sobre un layout de dos paneles: banda índigo profundo de autoridad (izquierda) + tarjeta de formulario sobre lienzo cálido (derecha), con tipografía IBM Plex Sans/Mono y CTA índigo. Sin tocar el tema `NAVY` legacy.

**Tech Stack:** React + TypeScript, TanStack Router, Tailwind, shadcn/ui (`Button`/`Input`/`Label`/`Card`), Supabase Auth, lucide-react.

## Global Constraints

- **Sin cambios de lógica de auth:** `onSubmit`, `useEffect` de redirección por rol, modos `login`/`signup`/`reset`, `enviarResetContrasena`, y los toasts deben quedar funcionalmente idénticos al original.
- **i18n:** mantener `useUiLang()`; toda cadena visible con variante ES/EN (`isEN`).
- **Caligrafía:** prohibido `landingFontSerif`/Libre Baskerville en el login. Titulares `fontSans` con `letterSpacing:"-0.02em"`; cifras/etiquetas/chips en `fontMono`.
- **Color:** ámbar (`L.amber`) solo decoración/marca. Acción primaria únicamente índigo (`L.primary #4F46E5`).
- **No tocar** el tema `NAVY` ni `SALTO` en `landing-theme.ts`. `SiteHeader.tsx` sigue usando `NAVY`.
- **Tokens verbatim:** los valores promovidos deben ser idénticos carácter a carácter a los actuales de `LandingPage.tsx` (la landing debe renderizar igual).
- **Verificación por tarea:** `npx tsc --noEmit` y `npm run lint` en verde; `npm run build` al final.
- **Commits:** nunca a `main`; ya estás en rama de trabajo.

---

## File Structure

- `src/lib/landing-theme.ts` — añade exports `LANDING`, `DEEP`, `CRIT`, `cardShadow`. Responsabilidad: fuente única de tokens de diseño.
- `src/components/LandingPage.tsx` — consume los tokens del tema en vez de definirlos localmente (cambio mecánico).
- `src/routes/login.tsx` — restyle completo "Claro premium".

---

### Task 1: Promover tokens de la landing a `landing-theme.ts`

**Files:**
- Modify: `src/lib/landing-theme.ts` (añadir exports tras el bloque `SALTO`/antes o después de `NAVY`, sin tocarlos)
- Modify: `src/components/LandingPage.tsx:24` (import) y `src/components/LandingPage.tsx:40-73` (eliminar consts locales)

**Interfaces:**
- Produces: `LANDING`, `DEEP`, `CRIT`, `cardShadow` exportados desde `@/lib/landing-theme`.

- [ ] **Step 1: Añadir los exports a `landing-theme.ts`**

Añade al final de `src/lib/landing-theme.ts` (valores copiados verbatim de `LandingPage.tsx`):

```ts
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
```

- [ ] **Step 2: Actualizar el import en `LandingPage.tsx`**

Reemplaza la línea 24:

```ts
import { landingFontMono as fontMono, landingFontSans as fontSans } from "@/lib/landing-theme";
```

por:

```ts
import {
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
```

- [ ] **Step 3: Eliminar las consts locales en `LandingPage.tsx`**

Borra el bloque de definiciones locales (actualmente líneas ~40-73): el comentario `// Paleta clara …`, `const L = {…} as const;`, el comentario `// Banda índigo profundo…`, `const DEEP = {…} as const;`, el comentario `// Acentos por criterio…`, `const CRIT = {…} as const;` y `const cardShadow = "…";`. NO borrar nada más (el resto del archivo, incluido el cambio de copy sin commitear en líneas ~119+, queda intacto).

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores. (Si lint marca `LANDING`/`DEEP`/`CRIT`/`cardShadow` sin usar en el theme, es esperado que solo se usen vía import; no hay regla que lo prohíba para exports.)

- [ ] **Step 5: Verificar que la landing renderiza idéntica**

Run: `npm run build`
Expected: build OK. Revisión visual rápida de `/`: misma apariencia que antes (los valores son verbatim).

- [ ] **Step 6: Commit**

```bash
git add src/lib/landing-theme.ts src/components/LandingPage.tsx
git commit -m "refactor(theme): exportar tokens Claro premium (LANDING/DEEP/CRIT/cardShadow) como fuente única

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Restyle completo de `login.tsx`

**Files:**
- Modify: `src/routes/login.tsx` (reescritura del componente; lógica intacta)

**Interfaces:**
- Consumes: `LANDING as L`, `DEEP`, `CRIT`, `cardShadow`, `landingFontSans`, `landingFontMono`, `LANDING_FONT_LINK` de `@/lib/landing-theme`.

- [ ] **Step 1: Reemplazar el contenido completo de `src/routes/login.tsx`**

Sustituye TODO el archivo por:

```tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";

async function enviarResetContrasena(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/cuenta`,
  });
  if (error) throw error;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — LIBerico" },
      {
        name: "description",
        content:
          "Accede a LIBerico para preparar el IB con práctica guiada y feedback por criterios.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: LoginPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

// botón primario reutilizable (índigo + glow), igual que la landing
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

// Motivo examinador (ilustrativo) — eco del ExaminerSheet de la landing
const CRITERIA = [
  { l: "A", es: "Comprensión", en: "Understanding", s: 4, c: CRIT.A },
  { l: "B", es: "Análisis", en: "Analysis", s: 4, c: CRIT.B },
  { l: "C", es: "Organización", en: "Organisation", s: 4, c: CRIT.C },
  { l: "D", es: "Lengua", en: "Language", s: 3, c: CRIT.D },
] as const;

function LoginPage() {
  const { user, loading, rol } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Tras signup redirigir a onboarding; tras login usar la entrada propia de cada rol.
  const destinoRef = useRef<string>("/asignaturas");

  useEffect(() => {
    if (loading || !user) return;
    if (destinoRef.current === "/onboarding") {
      navigate({ to: "/onboarding" });
      return;
    }
    if (rol === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
      return;
    }
    navigate({ to: "/asignaturas" });
  }, [user, loading, rol, navigate]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        await enviarResetContrasena(email);
        toast.success(
          isEN
            ? "Check your email to reset your password."
            : "Revisa tu correo para restablecer la contraseña.",
        );
        setMode("login");
        setBusy(false);
        return;
      }
      if (mode === "signup") {
        destinoRef.current = "/onboarding";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) {
          destinoRef.current = "/asignaturas";
          throw error;
        }
        toast.success(
          isEN
            ? "Account created. Check your email if confirmation is required."
            : "Cuenta creada. Revisa tu correo si se requiere confirmación.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(isEN ? "Welcome back" : "Bienvenido/a");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  };

  const t = isEN
    ? {
        back: "Back to home",
        eyebrowSub: "IB prep · criteria-based feedback",
        badge: "IB examiners and grade-boundary standardisers",
        headline: "Practise, get feedback and track your progress.",
        sub: "A support platform for IB students. Guided exercises, criteria-based assessment and progress tracking — all in one place.",
        sampleLabel: "Sample correction · criteria A–D",
        grade: "Grade",
        titleLogin: "Sign in",
        titleSignup: "Create your account",
        titleReset: "Reset password",
        subLogin: "Keep preparing for your IB.",
        subSignup: "Start with guided practice and personalised feedback.",
        subReset: "We'll email you a reset link.",
        name: "Name",
        namePh: "Your name",
        email: "Email",
        password: "Password",
        forgot: "Forgot your password?",
        submitLogin: "Sign in",
        submitSignup: "Create account",
        submitReset: "Send link",
        busy: "Processing…",
        noAccount: "Don't have an account?",
        signupCta: "Sign up",
        backToLogin: "← Back to sign in",
        terms1: "By creating an account you agree to our ",
        termsTerms: "Terms",
        terms2: " and acknowledge our ",
        termsPrivacy: "Privacy Policy",
      }
    : {
        back: "Volver al inicio",
        eyebrowSub: "Preparación IB · feedback por criterios",
        badge: "Examinadores y estandarizadores de notas de corte del IB",
        headline: "Practica, recibe feedback y mide tu progreso.",
        sub: "Una plataforma de apoyo para estudiantes IB. Ejercicios guiados, evaluación por criterios y seguimiento de avances, en un mismo espacio.",
        sampleLabel: "Corrección de ejemplo · criterios A–D",
        grade: "Nota",
        titleLogin: "Inicia sesión",
        titleSignup: "Crea tu cuenta",
        titleReset: "Restablecer contraseña",
        subLogin: "Continúa preparando tu IB.",
        subSignup: "Empieza con práctica guiada y feedback personalizado.",
        subReset: "Te enviaremos un enlace a tu correo.",
        name: "Nombre",
        namePh: "Tu nombre",
        email: "Correo electrónico",
        password: "Contraseña",
        forgot: "¿Olvidaste la contraseña?",
        submitLogin: "Entrar",
        submitSignup: "Crear cuenta",
        submitReset: "Enviar enlace",
        busy: "Procesando…",
        noAccount: "¿No tienes cuenta?",
        signupCta: "Regístrate",
        backToLogin: "← Volver al inicio de sesión",
        terms1: "Al crear una cuenta aceptas nuestros ",
        termsTerms: "Términos",
        terms2: " y reconoces nuestra ",
        termsPrivacy: "Política de privacidad",
      };

  const title =
    mode === "login" ? t.titleLogin : mode === "signup" ? t.titleSignup : t.titleReset;
  const subtitle =
    mode === "login" ? t.subLogin : mode === "signup" ? t.subSignup : t.subReset;
  const submitLabel = busy
    ? t.busy
    : mode === "login"
      ? t.submitLogin
      : mode === "signup"
        ? t.submitSignup
        : t.submitReset;

  return (
    <div
      id="login-root"
      className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #login-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #login-root .lib-press:active{transform:scale(0.97);}
        #login-root a:focus-visible,#login-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #login-root input:focus-visible{outline:2px solid ${L.primary};outline-offset:2px;}
        @media (prefers-reduced-motion: reduce){
          #login-root .lib-reveal{animation:none !important;}
        }
        #login-root .lib-reveal{animation:loginReveal 0.55s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes loginReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* ── Panel izquierdo: banda de autoridad índigo ───────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex"
        style={{
          background: `linear-gradient(155deg, ${DEEP.bg} 0%, ${DEEP.bgAlt} 100%)`,
          borderColor: DEEP.border,
          color: DEEP.text,
        }}
      >
        <Link to="/" className="lib-press relative z-10 flex items-center gap-3 hover:opacity-90">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ backgroundColor: DEEP.surface, borderColor: DEEP.border }}
          >
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-semibold" style={headingStyle}>
              LIBerico
            </div>
            <div
              className="text-[0.6rem] uppercase tracking-[0.18em]"
              style={{ ...fontMono, color: DEEP.muted }}
            >
              {t.eyebrowSub}
            </div>
          </div>
        </Link>

        <div className="lib-reveal relative z-10 max-w-md">
          {/* eyebrow-chip ámbar (marca/autoridad) */}
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: L.amber + "1f" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: L.amber }} />
            <span
              className="text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
              style={{ color: L.amber }}
            >
              {t.badge}
            </span>
          </div>

          <p className="text-4xl leading-[1.1]" style={headingStyle}>
            {t.headline}
          </p>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: DEEP.muted }}>
            {t.sub}
          </p>

          {/* motivo examinador — micro-bandas de criterio */}
          <div
            className="mt-9 overflow-hidden rounded-2xl border"
            style={{ backgroundColor: DEEP.surface, borderColor: DEEP.border }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: DEEP.border }}
            >
              <span
                className="text-[0.55rem] uppercase tracking-[0.16em]"
                style={{ ...fontMono, color: DEEP.muted }}
              >
                {t.sampleLabel}
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-[0.62rem] font-bold"
                style={{ ...fontMono, backgroundColor: L.amber + "22", color: L.amber }}
              >
                15/20 · {t.grade} 6
              </span>
            </div>
            <div className="space-y-2.5 px-4 py-3.5">
              {CRITERIA.map((cr) => (
                <div key={cr.l} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[0.72rem] font-extrabold text-white"
                    style={{ ...fontMono, backgroundColor: cr.c }}
                  >
                    {cr.l}
                  </span>
                  <span
                    className="flex-1 truncate text-[0.82rem]"
                    style={{ color: "rgba(236,234,251,0.86)" }}
                  >
                    {isEN ? cr.en : cr.es}
                  </span>
                  <div
                    className="h-[3px] w-16 overflow-hidden rounded-full"
                    style={{ backgroundColor: "rgba(236,234,251,0.14)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(cr.s / 5) * 100}%`, backgroundColor: cr.c }}
                    />
                  </div>
                  <span
                    className="w-8 text-right text-[0.78rem] font-semibold"
                    style={{ ...fontMono, color: DEEP.text }}
                  >
                    {cr.s}/5
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* "7" decorativo (nota IB máxima) */}
        <div
          className="pointer-events-none absolute -right-16 -top-24 select-none text-[28rem] font-bold leading-none"
          style={{ ...headingStyle, color: "rgba(236,234,251,0.045)" }}
          aria-hidden
        >
          7
        </div>
      </div>

      {/* ── Panel derecho: formulario sobre lienzo cálido ────────────────── */}
      <div
        className="flex min-h-screen items-center justify-center p-6 sm:p-12"
        style={{ background: `linear-gradient(160deg, ${L.bg} 0%, ${L.bg2} 100%)` }}
      >
        <Card
          className="lib-reveal w-full max-w-md rounded-2xl border p-7 sm:p-8"
          style={{
            backgroundColor: L.surface,
            borderColor: L.line,
            color: L.ink,
            boxShadow: cardShadow,
          }}
        >
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] hover:opacity-80"
            style={{ ...fontMono, color: L.muted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.back}
          </Link>

          {/* logo solo-móvil (el panel izquierdo se oculta en <lg) */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: L.primary, color: "#fff" }}
            >
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="text-lg font-semibold" style={headingStyle}>
              LIBerico
            </div>
          </div>

          <h1 className="text-[1.7rem] font-semibold leading-tight" style={headingStyle}>
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: L.muted }}>
            {subtitle}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" style={{ color: L.ink }}>
                  {t.name}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePh}
                  className="h-11"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: L.ink }}>
                {t.email}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" style={{ color: L.ink }}>
                    {t.password}
                  </Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs hover:underline"
                      style={{ color: L.muted }}
                    >
                      {t.forgot}
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="lib-press group flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] hover:opacity-95"
              style={ctaPrimary}
            >
              {submitLabel}
              {!busy && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>

            {mode === "signup" && (
              <p className="text-center text-[11px] leading-relaxed" style={{ color: L.muted }}>
                {t.terms1}
                <Link to="/terms" className="underline hover:opacity-80">
                  {t.termsTerms}
                </Link>
                {t.terms2}
                <Link to="/privacy" className="underline hover:opacity-80">
                  {t.termsPrivacy}
                </Link>
                .
              </p>
            )}
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: L.muted }}>
            {mode === "login" ? (
              <>
                {t.noAccount}{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold hover:underline"
                  style={{ color: L.primary }}
                >
                  {t.signupCta}
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode("login")}
                className="font-semibold hover:underline"
                style={{ color: L.primary }}
              >
                {t.backToLogin}
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Verificación visual manual**

Levanta la app (`npm run dev`, ya suele correr en `http://localhost:8080`) y revisa `/login`:
- Desktop: panel índigo a la izquierda (logo, eyebrow ámbar, titular Plex Sans, micro-bandas A–D, "7" difuminado) + tarjeta blanca a la derecha.
- Móvil (panel izq. oculto): logo índigo, tarjeta centrada.
- Los tres modos: clic en "Regístrate" (aparece campo Nombre + aviso legal), "¿Olvidaste la contraseña?" (modo reset, sin contraseña), y volver.
- Cambia idioma ES/EN y confirma que todas las cadenas cambian.
- CTA índigo con flecha que se desplaza en hover; focus-ring índigo al tabular inputs/botones; sin serif por ningún lado.

- [ ] **Step 4: Commit**

```bash
git add src/routes/login.tsx
git commit -m "feat(login): restyle Claro premium alineado con la landing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Calibración de calidad (frontend-design + ui-ux-pro-max) y verificación final

**Files:**
- Modify (si procede tras la revisión): `src/routes/login.tsx`

- [ ] **Step 1: Invocar la skill `frontend-design`**

Úsala para revisar dirección estética del login (jerarquía tipográfica, peso/escala del titular, ritmo de espaciado del panel índigo, equilibrio del motivo de criterios, que no quede "templated"). Aplica ajustes puntuales si los recomienda, manteniendo los tokens y la lógica.

- [ ] **Step 2: Invocar la skill `ui-ux-pro-max`**

Úsala (action: review/improve; element: form/login; style: minimalism + dark-mode panel) para revisar estados de interacción (hover/focus/active/disabled del CTA e inputs), contraste AA (especialmente texto sobre el panel índigo y el back-link muted), y usabilidad móvil. Aplica los ajustes accionables.

- [ ] **Step 3: Chequeo de accesibilidad rápido**

Verifica manualmente o con la skill `accesslint:scan` sobre `/login`:
- Labels asociadas a inputs (ya con `htmlFor`/`id`).
- Focus visible en todos los interactivos.
- Contraste: `L.ink` sobre blanco, `DEEP.text`/`DEEP.muted` sobre índigo, back-link `L.muted` ≥ AA.
Corrige lo que aparezca.

- [ ] **Step 4: Verificación final**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit (si hubo ajustes)**

```bash
git add src/routes/login.tsx
git commit -m "polish(login): ajustes de jerarquía, estados e accesibilidad tras revisión de diseño

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (completado al escribir el plan)

**Cobertura del spec:**
- Tokens fuente única → Task 1. ✓
- Panel izq. autoridad (logo, eyebrow ámbar, titular, motivo criterios, "7") → Task 2 Step 1. ✓
- Panel der. (back-link mono, logo móvil, título, campos, CTA `ctaPrimary`, toggles índigo, legal bilingüe) → Task 2 Step 1. ✓
- Caligrafía sin serif, fontSans/fontMono → Task 2 (imports + `headingStyle`). ✓
- Movimiento sutil + reduced-motion + `lib-press`/focus scopeados a `#login-root` → Task 2 `<style>`. ✓
- Accesibilidad (focus índigo, AA, ámbar solo decorativo) → Task 2 `<style>` + Task 3 Step 3. ✓
- i18n ES/EN → objeto `t` en Task 2. ✓
- Calidad con frontend-design + ui-ux-pro-max → Task 3. ✓
- Verificación tsc/lint/build → cada tarea. ✓

**Placeholders:** ninguno; todo el código del login va completo en Task 2.

**Consistencia de tipos/nombres:** `LANDING as L`, `DEEP`, `CRIT`, `cardShadow` definidos en Task 1 y consumidos con esos nombres en Task 2. `headingStyle`, `ctaPrimary`, `CRITERIA`, `t` consistentes dentro de `login.tsx`. Clase `lib-press` definida en el `<style>` de `#login-root` y usada en los elementos correspondientes.
