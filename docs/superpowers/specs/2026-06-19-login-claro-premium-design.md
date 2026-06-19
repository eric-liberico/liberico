# Login "Claro premium" — alineación con la landing

**Fecha:** 2026-06-19
**Rama:** demo/hero-sim-correccion (o rama dedicada `feat/login-claro-premium`)
**Alcance:** Restyle de `src/routes/login.tsx` para que use la misma paleta, caligrafía y formato que la landing actual (`src/components/LandingPage.tsx`). No cambia ninguna lógica de autenticación.

## Problema

El login (`/login`) usa el tema **NAVY legacy** (fondos azul-marino oscuros) y la serif **Libre Baskerville**. La landing fue rediseñada al sistema **"Claro premium"**: lienzo cálido claro, índigo como única acción, ámbar de marca, banda índigo profundo de autoridad, y caligrafía **IBM Plex Sans** (titulares con tracking negativo) + **IBM Plex Mono** (cifras/etiquetas/chips de criterio), **sin serif**. Resultado: el login se siente de otra app y rompe la continuidad desde el CTA de la landing (que enlaza a `/login`).

## Objetivo

Reconstruir `/login` sobre el sistema "Claro premium" manteniendo intacta la lógica (login / signup / reset, redirecciones por rol, i18n ES/EN), de modo que sea una continuación visual natural de la landing.

## Sistema de diseño de referencia (extraído de LandingPage.tsx)

Paleta clara `L`:
- `bg #F6F5F2` (lienzo cálido), `bg2 #EFEDE7`, `surface #FFFFFF`
- `ink #0F172A`, `muted #5A6B86`, `line #E6E3DC`, `lineSoft #EFEDE7`
- `primary #4F46E5` (índigo — única acción), `amber #E8A13A` (solo marca/decoración), `amberDeep #9A5E10` (texto pequeño AA), `ok #15803D`

Banda profunda `DEEP`:
- `bg #1E1B4B`, `bgAlt #171544`, `text #ECEAFB`, `muted rgba(236,234,251,0.66)`, `border rgba(236,234,251,0.14)`, `surface rgba(255,255,255,0.05)`

Acentos por criterio `CRIT`: A `#2563EB` · B `#7C3AED` · C `#B45309` · D `#E11D48`.

`cardShadow = "0 14px 30px -20px rgba(15,23,42,0.28), 0 2px 6px -3px rgba(15,23,42,0.08)"`.

CTA primario (`ctaPrimary` de la landing): `backgroundColor L.primary`, `color #fff`, `boxShadow "0 16px 30px -12px rgba(79,70,229,0.55)"`, clase `lib-press rounded-2xl px-8 py-4 text-sm font-bold uppercase tracking-[0.07em]`, con `ArrowRight` que hace `group-hover:translate-x-1`.

Eyebrow-chip: `rounded-full px-3 py-1`, bg `color + "14"`, punto `h-1.5 w-1.5` + `text-[0.66rem] font-semibold uppercase tracking-[0.18em]`.

Fuentes (`@/lib/landing-theme`): `landingFontSans` = IBM Plex Sans, `landingFontMono` = IBM Plex Mono. `LANDING_FONT_LINK` ya carga ambas; el login ya incluye ese link → **no cambia la carga de fuentes**. Titulares usan `{ ...fontSans, letterSpacing: "-0.02em" }` (tracking negativo).

## Decisión de arquitectura: tokens como fuente única

`L`, `DEEP`, `CRIT`, `cardShadow` hoy son consts **locales** en `LandingPage.tsx` (líneas ~41-73), no exportadas. Para evitar que login y landing diverjan:

1. Promover esos cuatro a `src/lib/landing-theme.ts` como exports con los **mismos valores exactos**:
   - `export const LANDING = { ... }` (= la actual `L`)
   - `export const DEEP = { ... }`
   - `export const CRIT = { ... }`
   - `export const cardShadow = "..."`
2. `LandingPage.tsx` importa `LANDING as L`, `DEEP`, `CRIT`, `cardShadow` y **elimina** sus definiciones locales. Cambio mecánico; el render de la landing debe quedar idéntico (verificar valores carácter a carácter).
3. `login.tsx` importa los mismos tokens.

El tema `NAVY` legacy se **conserva** (lo usa `SiteHeader.tsx`); el login deja de importarlo. No se toca `SALTO` (código muerto, fuera de alcance).

## Layout: split índigo (autoridad) + claro (acción)

Se mantiene la rejilla de dos paneles actual (`grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]`), recoloreada.

### Panel izquierdo — banda de autoridad (oculto en móvil, `lg:flex`)

- Fondo `DEEP.bg` (admite gradiente sutil hacia `DEEP.bgAlt`), texto `DEEP.text`. Borde derecho `DEEP.border`.
- **Logo** (link a `/`): `BookOpen` en cuadro "frosted" (`DEEP.surface` + borde `DEEP.border`), nombre "LIBerico" en `fontSans` (tracking negativo, **no italic serif**) + sub-eyebrow en `fontMono` mayúsculas tracking ancho ("Preparación IB · feedback por criterios").
- **Eyebrow-chip ámbar** (`color = L.amber`, patrón Eyebrow de la landing) con la copy real del badge de la landing: ES *"Examinadores y estandarizadores de notas de corte del IB"* / EN *"IB examiners and grade-boundary standardisers"*.
- **Titular** en `fontSans` grande: ES *"Practica, recibe feedback y mide tu progreso."* / EN equivalente. Subcopy en `DEEP.muted`.
- **Motivo examinador** (reemplaza el grid genérico A-D / 3 / ES-EN): cuatro micro-bandas de criterio A/B/C/D, cada una con nombre corto y puntuación en `fontMono`, usando chips `CRIT[x] + "1f"` de fondo y `CRIT[x]` de texto (eco del ExaminerSheet). Datos estáticos ilustrativos (p. ej. A4 · B4 · C4 · D3), marcados como ejemplo.
- **"7" gigante difuminado** decorativo (motivo nota IB máxima): se conserva, retonificado a la nueva paleta (baja opacidad sobre índigo, `fontSans` bold).

### Panel derecho — formulario (`L.bg`, gradiente sutil hacia `L.bg2` permitido)

- **Tarjeta** `Card`: `backgroundColor L.surface`, `border 1px L.line`, `boxShadow cardShadow`, `rounded-2xl`, texto `L.ink`, `max-w-md`.
- **Back-link** "Volver al inicio / Back to home" (a `/`): micro-link `fontMono` mayúsculas, `color L.muted`, con `ArrowLeft`. Bilingüe.
- **Logo solo-móvil** (`lg:hidden`): lockup compacto (BookOpen en índigo + "LIBerico" en `fontSans`).
- **Título** `fontSans` tracking negativo: Inicia sesión / Crea tu cuenta / Restablecer contraseña (con variantes EN ya existentes). Subcopy `L.muted`.
- **Campos** (sin cambios de lógica): `Label` `color L.ink`; `Input` fondo blanco, borde `L.line`, texto `L.ink`, **focus-ring índigo** (`focus-visible` ring `L.primary`). Estructura: nombre (solo signup), correo, contraseña (con link "¿olvidaste?" en `L.muted`, oculto en reset).
- **CTA primario**: estilo `ctaPrimary` (índigo + glow), `rounded-2xl`, mayúsculas tracking, clase `lib-press`, con `ArrowRight` (`group-hover:translate-x-1`). Texto según modo: Entrar / Crear cuenta / Enviar enlace (+ "Procesando…" en busy) con variantes EN. `disabled` en busy.
- **Toggles** (Regístrate / volver a login) como botones-link `color L.primary`.
- **Aviso Términos/Privacidad** (solo signup): pasa a **bilingüe** (hoy está en inglés fijo incluso en ES). Links subrayados a `/terms` y `/privacy`.

## Transversal

- **Caligrafía:** se elimina toda referencia a `landingFontSerif` / Libre Baskerville en el login. Titulares `fontSans` con `letterSpacing: "-0.02em"`; etiquetas, eyebrows, sub-labels y cifras en `fontMono`.
- **Movimiento:** entrada sutil (fade + ligero translate) del contenido del panel y de la tarjeta, respetando `prefers-reduced-motion` (patrón de la landing). Mínimo. Las clases `lib-press`/`lib-card` y el outline de focus están definidas en un `<style>` **local** dentro de LandingPage (scopeado a `#top`), no son globales; el login replica en su propio `<style>` (scopeado a `#login-root`) solo lo que use: `.lib-press` (`:active{transform:scale(0.97)}`) y `a/button/input:focus-visible{outline:2px solid índigo}`. No introducir librerías nuevas; framer-motion ya está disponible si hiciera falta, pero se prefiere CSS/transición ligera.
- **Accesibilidad:**
  - Ámbar solo como decoración/marca; ningún texto pequeño informativo depende del ámbar puro (usar `amberDeep`/`ok` si se necesita texto coloreado).
  - Focus-ring índigo visible en inputs, botones y links.
  - Contraste AA: `L.ink` sobre `L.surface`/`L.bg`; `DEEP.text` sobre `DEEP.bg`; back-link y muted ≥ AA.
  - Labels asociadas (`htmlFor`/`id`) — ya presentes, se conservan.
- **i18n:** se mantiene `useUiLang()` / `isEN`. Toda cadena nueva del panel izquierdo y el aviso legal con variante ES/EN.

## Archivos afectados

1. `src/lib/landing-theme.ts` — añadir exports `LANDING`, `DEEP`, `CRIT`, `cardShadow` (NAVY/SALTO sin tocar).
2. `src/routes/login.tsx` — restyle completo (lógica intacta).
3. `src/components/LandingPage.tsx` — sustituir consts locales `L`/`DEEP`/`CRIT`/`cardShadow` por imports del tema (cambio mecánico; render idéntico). No interfiere con el cambio de copy sin commitear (líneas ~119+).

## Fuera de alcance

- `SiteHeader.tsx` y otras pantallas que aún usan NAVY (migración aparte si se desea).
- Cambios de lógica de auth, rutas o redirecciones.
- Nuevos proveedores de login (OAuth, magic link) — no se añaden.

## Verificación

- `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde.
- Revisión visual en `/login` (desktop y móvil): paleta, fuentes (Plex Sans/Mono, sin serif), CTA índigo con glow, focus-rings, los tres modos (login/signup/reset) y ES/EN.
- Confirmar que la landing (`/`) se renderiza idéntica tras la migración de tokens.

## Calibración de calidad

Durante la implementación se invocarán las skills **frontend-design** y **ui-ux-pro-max** para validar dirección estética, tipografía, jerarquía y estados de interacción antes de cerrar.
