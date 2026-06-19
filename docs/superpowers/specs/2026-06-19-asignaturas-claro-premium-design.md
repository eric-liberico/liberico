# /asignaturas "Claro premium" — alineación con la landing

**Fecha:** 2026-06-19
**Rama:** demo/hero-sim-correccion (o rama dedicada)
**Alcance:** Restyle de `src/routes/asignaturas.tsx` al sistema "Claro premium" de la landing, más una variante `claro` (prop) en `src/components/SiteHeader.tsx` activada solo en esta página. No cambia ninguna lógica (carga de stats, cambio de asignatura, redirecciones, i18n).

## Problema

`/asignaturas` usa el sistema de diseño legacy de la app: tokens CSS de Tailwind v4 (`bg-background`, `text-ink`, `text-primary` = navy `oklch(0.34 0.07 250)`, `border-border`) y la serif **Libre Baskerville** (`font-serif`) en titulares. El `SiteHeader` (compartido por ~25 rutas) usa el tema **NAVY** legacy. La landing usa "Claro premium": lienzo cálido `#F6F5F2`, índigo `#4F46E5` como única acción, ámbar `#E8A13A` solo de marca, **IBM Plex Sans** (titulares con tracking negativo) + **IBM Plex Mono** (cifras/etiquetas), tarjetas blancas con hairline y sombra suave. Resultado: la página no se siente parte del mismo producto que la landing y el login ya migrado.

## Objetivo

Que `/asignaturas` (cabecera + cuerpo) sea fiel a la landing, manteniendo intacta toda la lógica y la i18n, sin cascada a las otras ~24 rutas que comparten `SiteHeader`.

## Sistema de diseño de referencia (tokens Claro premium)

Importados desde `@/lib/landing-theme` (ya exportados durante el trabajo del login):
- `LANDING as L`: `bg #F6F5F2`, `bg2 #EFEDE7`, `surface #FFFFFF`, `ink #0F172A`, `muted #5A6B86`, `line #E6E3DC`, `primary #4F46E5`, `amber #E8A13A`, `amberDeep #9A5E10`, `ok #15803D`.
- `cardShadow = "0 14px 30px -20px rgba(15,23,42,0.28), 0 2px 6px -3px rgba(15,23,42,0.08)"`.
- `landingFontSans` (IBM Plex Sans), `landingFontMono` (IBM Plex Mono), `LANDING_FONT_LINK`.

Convenciones (idénticas al login):
- `headingStyle = { ...fontSans, letterSpacing: "-0.02em" }` para titulares.
- CTA primario `ctaPrimary = { backgroundColor: L.primary, color: "#fff", boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)" }`, clase `lib-press`, `rounded-2xl`.
- Wordmark de marca: `L<span color=amber>IB</span>erico`, `fontSans` extrabold `tracking-tight`.
- Estilos `lib-press`/reveal/focus en un `<style>` scopeado a la raíz de la página (`#asignaturas-root`), con guard `prefers-reduced-motion`.

`CRIT` NO se usa: P1/P2/Oral son componentes, no criterios A–D.

## SiteHeader — variante `claro`

Añadir prop `claro?: boolean` a `SiteHeaderProps`. Por defecto `false` → comportamiento actual intacto para las ~24 rutas restantes. Cuando `claro === true`:

- **Wrapper:** en vez de `bg-background` + `boxShadow NAVY`, usar fondo translúcido cálido `rgba(246,245,242,0.92)` con `backdrop-blur`, borde inferior hairline `L.line` y sombra suave (`0 1px 0 rgba(15,23,42,0.04), 0 10px 30px -18px rgba(15,23,42,0.25)`), replicando la nav de la landing.
- **Logo:** wordmark `L`**`IB`**`erico` (IB en `L.amber`, `fontSans` extrabold `tracking-tight`, color `L.ink`) en lugar del cuadro `bg-primary` + `BookOpen` + `font-serif`. Aplica tanto al branch `minimal` como al normal del logo.
- **Botones de idioma/cuenta:** focus-ring índigo (vía `<style>` scopeado en la página que ya cubre `button:focus-visible`, o clases utilitarias). Los `DropdownMenu` de shadcn se mantienen.

Solo `/asignaturas` pasará `claro`. Como `/asignaturas` usa `minimal`, basta con que el camino `minimal + claro` quede correcto; el resto de la cabecera (nav completa) no se renderiza aquí. No se construye la variante claro para partes no usadas (YAGNI): solo wrapper + logo, que son los elementos visibles en esta página.

## Cuerpo de la página

Raíz `<div id="asignaturas-root">` con `fontSans`, `backgroundColor: L.bg`, `color: L.ink`. Incluye el `<style>` scopeado (lib-press, reveal, focus índigo, reduced-motion).

- **head():** añadir `links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }]`.
- **Título:** `h1` en `headingStyle` (Plex Sans tracking negativo), tamaño `text-2xl sm:text-3xl`, `L.ink`. Subtítulo en `L.muted`.
- **Grid:** `grid sm:grid-cols-2 gap-6` (se conserva).
- **Tarjeta de curso** (`L.surface`, borde `L.line`, `boxShadow cardShadow`, `rounded-2xl`, `p-6`, `lib-reveal`):
  - *Estado activo:* borde `L.primary`, ring índigo (`boxShadow` con `0 0 0 1px L.primary` o ring + `cardShadow`) y tinte de fondo muy tenue (`L.primary + "08"`).
  - *Cabecera:* nombre del curso en `headingStyle` (`text-xl font-semibold`, `L.ink`); sub "IB · NM/NS" en `fontMono`, `text-[0.62rem]` mayúsculas `tracking-[0.15em]`, `L.muted`.
  - *Pill "Asignatura activa":* chip `backgroundColor: L.primary + "14"`, `color: L.primary`, `rounded-full`, con `CheckCircle2`.
- **Stats (3 tiles P1/P2/Oral):** cada tile `rounded-xl` con `backgroundColor: L.bg2` o `L.surface` + hairline `L.line`; icono (`BookOpen`/`PenLine`/`Mic`) `color: L.muted`; número en `fontMono` `text-2xl` `L.ink` `tabular-nums`; etiqueta en `fontMono` mayúsculas + descripción en `L.muted`.
  - *Cargando:* `Loader2` animado + texto `L.muted`.
  - *Fallo:* texto `L.muted` itálico (`statsUnavailable`).
  - *Sin evals (total 0):* texto `L.muted` itálico (`sinEvals`).
- **Nota media P1:** línea con etiqueta en `L.muted` y valor `x/7` en `fontMono` `font-semibold` `L.ink`.
- **Acciones:**
  - *Activa:* botón outline (fondo `L.surface`, borde `L.line`, texto `L.ink`, hover sutil) "Ir al inicio" → `navigate({ to: "/" })`.
  - *Inactiva:* CTA índigo (`ctaPrimary`, `lib-press`, `rounded-2xl`, `font-bold uppercase tracking-[0.07em]`) "Cambiar a esta asignatura"; en `isSwitching`, `Loader2` + disabled.

## Transversal

- **Caligrafía:** se elimina `font-serif` del cuerpo y del header claro; titulares Plex Sans tracking negativo, cifras/etiquetas en mono.
- **Color:** ámbar solo marca (wordmark); índigo única acción (CTA, ring activo, pill, focus). Sin tokens navy legacy.
- **Accesibilidad:** focus-ring índigo en interactivos; labels/aria existentes se conservan; contraste AA (`L.ink` sobre blanco/canvas, `L.muted` ≥ AA); `tabular-nums` en cifras.
- **Movimiento:** reveal sutil + `prefers-reduced-motion` (patrón del login).
- **i18n:** se conserva `PAGE_TEXTS`/`COURSE_TEXTS` y `pageLang`; no se añaden cadenas nuevas.

## Archivos afectados

1. `src/components/SiteHeader.tsx` — añadir prop `claro` + render claro de wrapper y logo (imports de `LANDING`/fuentes según haga falta).
2. `src/routes/asignaturas.tsx` — restyle completo del cuerpo, `claro` al `SiteHeader`, font link en `head()`, `<style>` scopeado.

## Fuera de alcance

- Migrar `SiteHeader` global ni las otras ~24 rutas.
- Cambios en la lógica de stats, Supabase, `handleSwitch`, redirecciones o tipos.
- Migrar los tokens CSS globales (`--primary`, etc.).

## Verificación

- `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde.
- Revisión visual de `/asignaturas` (desktop y móvil): cabecera claro (wordmark), tarjetas blancas con hairline/sombra, tarjeta activa con ring índigo + pill, tiles con cifras mono, CTA índigo, estados (cargando/fallo/sin evals), ES/EN, focus-rings, sin serif.
- Confirmar que las otras rutas con `SiteHeader` (sin `claro`) se renderizan idénticas.

## Calibración de calidad

Durante la implementación se invocan **frontend-design** y **ui-ux-pro-max** para validar jerarquía, estados de interacción y accesibilidad antes de cerrar.
