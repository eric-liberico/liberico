# /asignaturas "Claro premium" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restilizar `/asignaturas` (cuerpo + cabecera) al sistema "Claro premium" de la landing, sin cambiar lógica y sin cascada a las otras ~24 rutas que comparten `SiteHeader`.

**Architecture:** Se añade una variante `claro` (prop) a `SiteHeader` que solo `/asignaturas` activa (wrapper translúcido cálido + wordmark, en vez de `bg-background`+NAVY+serif). El cuerpo de `asignaturas.tsx` se reescribe con los tokens inline `LANDING`/`cardShadow`/`landingFontSans`/`landingFontMono` (mismo patrón que el login ya migrado), reemplazando los tokens CSS legacy y `font-serif`. La lógica (stats Supabase, cambio de asignatura, i18n) queda intacta.

**Tech Stack:** React + TypeScript, TanStack Router, Tailwind v4, shadcn/ui (`Card`), Supabase, lucide-react.

## Global Constraints

- **Sin cambios de lógica:** carga de stats (`fetchAll`/Supabase), `handleSwitch`, `useEffect` de redirección, tipos, `PAGE_TEXTS`/`COURSE_TEXTS`, `pageLang`/`setPageLang` quedan funcionalmente idénticos.
- **i18n:** se conserva el sistema ES/EN existente; no se añaden ni quitan cadenas visibles.
- **Caligrafía:** prohibido `font-serif`/Libre Baskerville. Titulares `fontSans` con `letterSpacing:"-0.02em"`; cifras/etiquetas en `fontMono`.
- **Color:** ámbar (`L.amber`) solo en el wordmark (marca). Única acción primaria índigo (`L.primary #4F46E5`). Sin tokens navy legacy (`text-primary`, `bg-primary`, `border-border`, `bg-background`) en la página ni en el header claro. `CRIT` NO se usa.
- **Sin cascada:** `SiteHeader` con `claro` por defecto `false`; las otras rutas no se tocan y deben renderizar idénticas.
- **Tokens desde** `@/lib/landing-theme`: `LANDING as L`, `cardShadow`, `landingFontSans`, `landingFontMono`, `LANDING_FONT_LINK`.
- **Verificación:** `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde (no hay framework de tests unitarios).
- **Commits:** en rama, nunca a `main`.

---

## File Structure

- `src/components/SiteHeader.tsx` — añade prop `claro` + render claro del wrapper y del logo (wordmark). Responsabilidad: cabecera compartida con variante opt-in.
- `src/routes/asignaturas.tsx` — restyle completo del cuerpo + `claro` al header + font link. Responsabilidad: página de selección de asignatura.

---

### Task 1: Variante `claro` en SiteHeader

**Files:**
- Modify: `src/components/SiteHeader.tsx`

**Interfaces:**
- Produces: `SiteHeader` acepta `claro?: boolean` (default `false`). Cuando `true`, wrapper translúcido cálido + wordmark `L`**`IB`**`erico`.

- [ ] **Step 1: Ampliar el import de landing-theme**

Reemplaza la línea (≈34):

```tsx
import { NAVY } from "@/lib/landing-theme";
```

por:

```tsx
import { NAVY, LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
```

- [ ] **Step 2: Añadir la prop `claro` al tipo**

Reemplaza:

```tsx
type SiteHeaderProps = {
  minimal?: boolean;
  languageSwitcher?: {
    lang: UiLang;
    label: string;
    labels: Record<UiLang, string>;
    onChange: (lang: UiLang) => void;
  };
};
```

por:

```tsx
type SiteHeaderProps = {
  minimal?: boolean;
  claro?: boolean;
  languageSwitcher?: {
    lang: UiLang;
    label: string;
    labels: Record<UiLang, string>;
    onChange: (lang: UiLang) => void;
  };
};
```

- [ ] **Step 3: Desestructurar `claro` con default**

Reemplaza:

```tsx
export function SiteHeader({ minimal = false, languageSwitcher }: SiteHeaderProps) {
```

por:

```tsx
export function SiteHeader({ minimal = false, claro = false, languageSwitcher }: SiteHeaderProps) {
```

- [ ] **Step 4: Definir `brandMark` antes del `return`**

Reemplaza:

```tsx
  const showPracticeMenu =
    caps.exercises || caps.practiceLibrary || caps.oralSimulator || caps.theory;

  return (
```

por:

```tsx
  const showPracticeMenu =
    caps.exercises || caps.practiceLibrary || caps.oralSimulator || caps.theory;

  // Marca: wordmark Claro premium (igual que la landing/login) o el lockup legacy.
  const brandMark = claro ? (
    <span
      className="text-xl font-extrabold tracking-tight"
      style={{ ...fontSans, letterSpacing: "-0.02em", color: L.ink }}
    >
      L<span style={{ color: L.amber }}>IB</span>erico
    </span>
  ) : (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BookOpen className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
      </div>
    </>
  );

  return (
```

- [ ] **Step 5: Wrapper `<header>` condicional a `claro`**

Reemplaza:

```tsx
    <header
      className="sticky top-0 z-30 bg-background"
      style={{ boxShadow: `0 1px 6px ${NAVY.bg}1a` }}
    >
```

por:

```tsx
    <header
      className={claro ? "sticky top-0 z-30 backdrop-blur-xl" : "sticky top-0 z-30 bg-background"}
      style={
        claro
          ? {
              backgroundColor: "rgba(246,245,242,0.92)",
              borderBottom: `1px solid ${L.line}`,
              boxShadow: "0 1px 0 rgba(15,23,42,0.04), 0 10px 30px -18px rgba(15,23,42,0.25)",
            }
          : { boxShadow: `0 1px 6px ${NAVY.bg}1a` }
      }
    >
```

- [ ] **Step 6: Logo usando `brandMark`**

Reemplaza:

```tsx
          {minimal ? (
            <div className="flex items-center gap-2" aria-current="page">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
              </div>
            </div>
          ) : (
            <Link to="/" className="flex items-center gap-2 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
              </div>
            </Link>
          )}
```

por:

```tsx
          {minimal ? (
            <div className="flex items-center gap-2" aria-current="page">
              {brandMark}
            </div>
          ) : (
            <Link to="/" className="flex items-center gap-2 group">
              {brandMark}
            </Link>
          )}
```

- [ ] **Step 7: Verificar tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores. (El default `claro=false` mantiene el render actual; `L`/`fontSans` quedan usados por `brandMark`.)

- [ ] **Step 8: Commit**

```bash
git add src/components/SiteHeader.tsx
git commit -m "feat(header): variante claro opt-in en SiteHeader (wordmark + wrapper Claro premium)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Restyle del cuerpo de asignaturas.tsx

**Files:**
- Modify: `src/routes/asignaturas.tsx`

**Interfaces:**
- Consumes: `SiteHeader` con prop `claro` (Task 1); tokens de `@/lib/landing-theme`.

- [ ] **Step 1: Actualizar imports**

Reemplaza:

```tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COURSES, type CourseKey, type UiLang } from "@/lib/ib-courses";
import { BookOpen, CheckCircle2, Loader2, Mic, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
```

por:

```tsx
import { Card } from "@/components/ui/card";
import { COURSES, type CourseKey, type UiLang } from "@/lib/ib-courses";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { BookOpen, CheckCircle2, Loader2, Mic, PenLine } from "lucide-react";
import { toast } from "sonner";
```

(Se eliminan `Button` y `cn`: ya no se usan tras el restyle.)

- [ ] **Step 2: Añadir el font link al `head()` y consts de estilo**

Reemplaza:

```tsx
export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — LIBerico" },
      { name: "description", content: "Cambia de asignatura y consulta tu progreso en cada una." },
    ],
  }),
  component: AsignaturasPage,
});
```

por:

```tsx
export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — LIBerico" },
      { name: "description", content: "Cambia de asignatura y consulta tu progreso en cada una." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: AsignaturasPage,
});

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

// CTA primario reutilizable (índigo + glow), igual que la landing/login
const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;
```

- [ ] **Step 3: Reemplazar el `return (...)` completo del componente**

Reemplaza todo el bloque `return (` … `);` final de `AsignaturasPage` (desde `return (` con `<div className="min-h-screen bg-background">` hasta el cierre del componente) por:

```tsx
  return (
    <div
      id="asignaturas-root"
      className="min-h-screen"
      style={{ ...fontSans, backgroundColor: L.bg, color: L.ink }}
    >
      <style>{`
        #asignaturas-root .lib-press{transition:transform 0.12s cubic-bezier(0.23,1,0.32,1);}
        #asignaturas-root .lib-press:active{transform:scale(0.97);}
        #asignaturas-root a:focus-visible,#asignaturas-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
        #asignaturas-root button:not([disabled]){cursor:pointer;}
        @media (prefers-reduced-motion: reduce){
          #asignaturas-root .lib-reveal{animation:none !important;}
        }
        #asignaturas-root .lib-reveal{animation:asignReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes asignReveal{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
      `}</style>

      <SiteHeader
        minimal
        claro
        languageSwitcher={{
          lang: pageLang,
          label: pageTexts.languageLabel,
          labels: pageTexts.languageNames,
          onChange: setPageLang,
        }}
      />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl" style={headingStyle}>
            {pageTexts.title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: L.muted }}>
            {pageTexts.subtitle}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {courseKeys.map((ck) => {
            const t = courseTexts[ck];
            const s = statsMap[ck];
            const isActive = ck === courseKey;
            const isSwitching = switching === ck;
            const total = (s?.p1 ?? 0) + (s?.p2 ?? 0) + (s?.oral ?? 0);

            const tiles = [
              { icon: BookOpen, n: s?.p1 ?? 0, label: t.p1Label, desc: t.p1Desc },
              { icon: PenLine, n: s?.p2 ?? 0, label: t.p2Label, desc: t.p2Desc },
              { icon: Mic, n: s?.oral ?? 0, label: t.oralLabel, desc: t.oralDesc },
            ];

            return (
              <Card
                key={ck}
                className="lib-reveal flex flex-col gap-5 rounded-2xl border p-6"
                style={{
                  backgroundColor: isActive ? L.primary + "0F" : L.surface,
                  borderColor: isActive ? L.primary : L.line,
                  color: L.ink,
                  boxShadow: isActive ? `0 0 0 1px ${L.primary}, ${cardShadow}` : cardShadow,
                }}
              >
                {/* Cabecera del curso */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold" style={headingStyle}>
                      {t.heading}
                    </div>
                    <div
                      className="mt-1 text-[0.62rem] uppercase tracking-[0.15em]"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {t.sub}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className="flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: L.primary + "14", color: L.primary }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {t.activa}
                    </span>
                  )}
                </div>

                {/* Stats */}
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: L.muted }}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{pageTexts.loading}</span>
                  </div>
                ) : statsFailed ? (
                  <p className="text-sm italic" style={{ color: L.muted }}>
                    {pageTexts.statsUnavailable}
                  </p>
                ) : total === 0 ? (
                  <p className="text-sm italic" style={{ color: L.muted }}>
                    {t.sinEvals}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {tiles.map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-xl border p-3 text-center"
                        style={{ backgroundColor: L.bg2, borderColor: L.line }}
                      >
                        <tile.icon className="mx-auto mb-1 h-4 w-4" style={{ color: L.muted }} />
                        <div
                          className="text-2xl font-semibold tabular-nums"
                          style={{ ...fontMono, color: L.ink }}
                        >
                          {tile.n}
                        </div>
                        <div
                          className="mt-0.5 text-[10px] uppercase leading-tight tracking-wider"
                          style={{ ...fontMono, color: L.muted }}
                        >
                          {tile.label}
                          <br />
                          <span className="normal-case tracking-normal" style={{ color: L.muted }}>
                            {tile.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nota media P1 si hay datos */}
                {!loadingStats && (s?.notaMediaP1 ?? null) !== null && (
                  <div className="text-sm" style={{ color: L.muted }}>
                    {t.notaLabel} (P1):{" "}
                    <span
                      className="font-semibold tabular-nums"
                      style={{ ...fontMono, color: L.ink }}
                    >
                      {s!.notaMediaP1}/7
                    </span>
                  </div>
                )}

                {/* Acción */}
                <div className="mt-auto pt-1">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/" })}
                      className="lib-press h-11 w-full rounded-2xl border text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      {pageTexts.goToDashboard}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleSwitch(ck)}
                      disabled={isSwitching}
                      className="lib-press flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold uppercase tracking-[0.07em] transition-opacity hover:opacity-95 disabled:opacity-60"
                      style={ctaPrimary}
                    >
                      {isSwitching && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.activar}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores. Si lint marca `Button` o `cn` como no usados, confirma que se eliminaron del import en Step 1.

- [ ] **Step 5: Verificación visual + build**

Run: `npm run build` (Expected: build OK). Luego revisa `/asignaturas` (`npm run dev`, suele estar en `http://localhost:8080`):
- Cabecera claro: wordmark `L`**`IB`**`erico` (IB ámbar), fondo translúcido cálido con hairline; selector de idioma y cuenta funcionan.
- Tarjetas blancas con hairline + sombra; tarjeta activa con borde/ring índigo, tinte tenue y pill "Asignatura activa".
- Tiles P1/P2/Oral con cifras en mono; estados cargando/fallo/sin-evals.
- CTA índigo "Cambiar a esta asignatura" (con spinner al cambiar) y botón outline "Ir al inicio" en la activa.
- ES/EN cambian al usar el selector; focus-rings índigo; sin serif.

- [ ] **Step 6: Commit**

```bash
git add src/routes/asignaturas.tsx
git commit -m "feat(asignaturas): restyle Claro premium del cuerpo + header claro

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Calibración de calidad y verificación final

**Files:**
- Modify (si procede): `src/routes/asignaturas.tsx`, `src/components/SiteHeader.tsx`

- [ ] **Step 1: Invocar la skill `frontend-design`**

Revisa `/asignaturas` con su lente: jerarquía del título y de las cabeceras de tarjeta, ritmo de espaciado, equilibrio de los tiles, estado activo (¿se lee claramente sin ser ruidoso?), y que no quede "templated". Aplica ajustes puntuales conservadores manteniendo tokens y lógica.

- [ ] **Step 2: Invocar la skill `ui-ux-pro-max`**

Revisa (action: review/improve; element: cards/dashboard; style: minimalism) estados de interacción (hover/focus/active/disabled de los dos botones y de la tarjeta), contraste AA (texto sobre tarjeta activa con tinte índigo, `L.muted` sobre `L.bg2`, wordmark), y usabilidad móvil (grid a 1 columna). Aplica los ajustes accionables.

- [ ] **Step 3: Chequeo de accesibilidad**

Verifica en `/asignaturas`: focus visible en header (idioma/cuenta) y en botones de tarjeta; contraste AA de `L.muted` sobre `L.bg2` en los tiles y del texto sobre el tinte índigo de la tarjeta activa; `tabular-nums` en cifras. Corrige lo que aparezca sub-AA (p. ej. subir el tinte o el peso del texto).

- [ ] **Step 4: Verificación final**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: todo en verde.

- [ ] **Step 5: Commit (si hubo ajustes)**

```bash
git add src/routes/asignaturas.tsx src/components/SiteHeader.tsx
git commit -m "polish(asignaturas): ajustes de jerarquía, estados y accesibilidad tras revisión de diseño

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (completado al escribir el plan)

**Cobertura del spec:**
- Variante `claro` en SiteHeader (wrapper + wordmark, default false) → Task 1. ✓
- Tokens inline + font link en head → Task 2 Steps 1-2. ✓
- Fondo canvas, título Plex Sans, subtítulo muted → Task 2 Step 3. ✓
- Tarjetas (surface/hairline/cardShadow/rounded-2xl), estado activo (ring índigo + tinte + pill) → Task 2 Step 3. ✓
- Cabecera de curso (Plex Sans + sub mono) → Task 2 Step 3. ✓
- Tiles P1/P2/Oral (mono, hairline, iconos muted) + estados cargando/fallo/sin-evals → Task 2 Step 3. ✓
- Nota media P1 (mono x/7) → Task 2 Step 3. ✓
- Acciones (CTA índigo / outline activa, spinner) → Task 2 Step 3. ✓
- Movimiento reveal + reduced-motion + focus índigo scopeado a #asignaturas-root → Task 2 Step 3. ✓
- Sin serif / sin navy / ámbar solo marca / índigo única acción / CRIT no usado → Tasks 1-2. ✓
- i18n y lógica intactas → no se tocan (Task 2 solo reemplaza el `return` y los imports/head). ✓
- Calidad con frontend-design + ui-ux-pro-max + a11y → Task 3. ✓
- Verificación tsc/lint/build → cada tarea. ✓

**Placeholders:** ninguno; todo el código va completo.

**Consistencia de tipos/nombres:** `claro` definido en Task 1 (tipo + destructuring + uso en `brandMark`/header) y consumido en Task 2 (`<SiteHeader minimal claro …>`). `headingStyle`/`ctaPrimary`/`L`/`fontMono`/`fontSans`/`cardShadow` consistentes en `asignaturas.tsx`. `tiles` se deriva de `t`/`s` ya existentes. Clase `lib-press`/`lib-reveal` definidas en el `<style>` de `#asignaturas-root` y usadas en las tarjetas y botones.
