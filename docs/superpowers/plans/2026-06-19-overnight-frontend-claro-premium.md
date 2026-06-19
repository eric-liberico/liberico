# Overnight loop — migración "Claro premium" a TODO el front-end de LIBerico

**Creado:** 2026-06-19 23:30 CEST · **Rama:** `night/frontend-claro-premium-all`
**Motor:** cron durable en sesión (`CronCreate`, ~cada 15 min) · **Parada:** 08:00 CEST (sábado 2026-06-20)
**Autonomía git aprobada por el usuario:** commit por ruta + push de la rama + **draft PR** (nunca a `main`).
**Prioridad aprobada:** *student-first*, luego profesor, luego admin, luego legales.

> Este archivo es el **estado durable** del loop. Cada disparo del cron lo lee, ejecuta **UNA** unidad (una ruta + sus componentes propios), verifica, commitea/pushea y **actualiza este archivo**. Sobrevive a resets de tokens: si un disparo falla por límite, el siguiente retoma desde aquí cuando haya tokens nuevos.

---

## 0. Qué hacer en CADA disparo del cron (orden estricto)

1. **Comprobar la hora.** `date "+%H%M"`. Si es **>= 0800 y < 2000** (mañana/día del usuario) → ir a **§7 Finalizar** y parar. No empieces ruta nueva.
2. **Higiene de árbol.** `git status --short`. Si hay cambios **sin commitear** (un disparo anterior se cortó a mitad), descártalos: `git checkout -- .` (lo commiteado es la única verdad). Confirma rama: `git branch --show-current` debe ser `night/frontend-claro-premium-all`; si no, `git checkout night/frontend-claro-premium-all`.
3. **Sincronizar.** `git pull --rebase origin night/frontend-claro-premium-all 2>/dev/null || true` (por si otro proceso empujó).
4. **Elegir la siguiente unidad.** En §5, la primera fila con estado `TODO` (de arriba abajo = orden de prioridad). Márcala `WIP` en este archivo **solo en memoria** (no commitees aún).
5. **Invocar skills de diseño ANTES de tocar código** (§4). No es opcional.
6. **Migrar** esa ruta + sus componentes propios siguiendo §3 (sistema Claro premium) y la ruta de referencia `src/routes/asignaturas.tsx` + `src/routes/login.tsx`.
7. **Verificar** (§6). Si no pasa, arregla; si tras un esfuerzo razonable no compila, `git checkout -- .` esa unidad, marca la fila `BLOCKED` con una nota y pasa a §7 (no dejes el árbol roto).
8. **Commit + push** (§6). Actualiza §5 (marca `DONE`) y añade una línea a §8 (Bitácora) en el **mismo commit**.
9. **Parar el turno.** No encadenes varias rutas en un disparo: una unidad por disparo mantiene los commits revisables y el árbol siempre verde. El cron volverá a disparar.

---

## 1. Misión

Llevar **todas** las rutas y redirecciones de LIBerico al sistema visual **"Claro premium"** ya validado en landing (`src/components/LandingPage.tsx`), login (`src/routes/login.tsx`) y asignaturas (`src/routes/asignaturas.tsx`): lienzo cálido, índigo como única acción, ámbar solo de marca, IBM Plex Sans/Mono, tarjetas blancas con hairline + sombra suave, micro-animaciones sutiles con `prefers-reduced-motion`. El alumno (adolescente IB, mucho móvil) debe sentir **un único producto** en cada pantalla. Calidad > cantidad.

## 2. Restricciones duras (NUNCA)

- **NUNCA** commitear a `main` ni mergear. Todo en `night/frontend-claro-premium-all`.
- **NUNCA** cambiar lógica: carga de datos, Supabase, RLS, llamadas a Edge Functions, rate limiting, i18n (`useUiLang`, textos), `CourseKey`/`COURSES`/capabilities, navegación/redirecciones, tipos, props de datos. **Solo presentación.**
- **NUNCA** llamar a Anthropic/OpenAI desde cliente. No tocar Edge Functions.
- **NUNCA** migrar los tokens CSS globales (`src/styles.css`) ni el `SiteHeader` por defecto de forma que cascadee a las ~25 rutas. Patrón **por ruta** (igual que asignaturas): estilos inline desde `@/lib/landing-theme` + `<style>` scopeado a la raíz de la página. Si una ruta usa `SiteHeader`, pásale `claro` (la variante opt-in ya existe).
- **NUNCA** copiar rúbricas/descriptores IB verbatim ni material literario protegido. Parafrasea; cita breve y atribuida si imprescindible.
- **NUNCA** introducir secretos. **NUNCA** subir datos reales de estudiantes (los textos de ejemplo deben ser no protegidos, p. ej. el del faro en el hero).
- **NUNCA** dejar el árbol roto: si no compila, revierte la unidad antes de parar.
- **NO** añadir dependencias nuevas. Anima con CSS/Tailwind + el patrón `<style>` scopeado (reveal/lib-press) ya usado; nada de librerías de animación.
- **NO** tocar dark mode (`.dark`): Claro premium es claro; fuera de alcance salvo que la ruta ya lo soporte trivialmente.

## 3. Sistema de diseño "Claro premium" (referencia)

Importar de `@/lib/landing-theme`: `LANDING as L`, `cardShadow`, `landingFontSans as fontSans`, `landingFontMono as fontMono`, `LANDING_FONT_LINK`. (Para momentos de autoridad existe `DEEP`; criterios IB en `CRIT`.)

Tokens (`L`): `bg #F6F5F2` · `bg2 #EFEDE7` · `surface #FFFFFF` · `ink #0F172A` · `muted #5A6B86` · `line #E6E3DC` · `primary #4F46E5` (índigo, ÚNICA acción) · `amber #E8A13A` (solo marca) · `amberDeep #9A5E10` (texto pequeño AA) · `ok #15803D`. `cardShadow = "0 14px 30px -20px rgba(15,23,42,0.28), 0 2px 6px -3px rgba(15,23,42,0.08)"`.

Convenciones (idénticas a login/asignaturas — **cópialas de ahí**, no reinventes):
- Raíz de página `<div id="<ruta>-root">` con `fontSans`, `backgroundColor: L.bg`, `color: L.ink`, y un `<style>` scopeado a `#<ruta>-root` con: clase `lib-press` (CTA pulsable), `lib-reveal` (aparición sutil), focus-ring índigo en `:focus-visible`, todo bajo guard `@media (prefers-reduced-motion: reduce)`.
- `head()` de la ruta añade `links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }]`.
- Titulares: `headingStyle = { ...fontSans, letterSpacing: "-0.02em" }`. **Elimina `font-serif`** del cuerpo (la serif Libre Baskerville no es Claro premium).
- Cifras/etiquetas/notas: `fontMono`, `tabular-nums`, mayúsculas con `tracking` amplio para micro-etiquetas.
- CTA primario: `ctaPrimary = { backgroundColor: L.primary, color:"#fff", boxShadow:"0 16px 30px -12px rgba(79,70,229,0.55)" }`, `rounded-2xl`, clase `lib-press`, `font-bold uppercase tracking-[0.07em]`.
- Botón secundario/outline: `bg L.surface`, borde `L.line`, texto `L.ink`, hover sutil.
- Tarjetas: `L.surface`, borde `L.line`, `boxShadow: cardShadow`, `rounded-2xl`, `p-6`, `lib-reveal`. Estado activo/seleccionado: borde/ring `L.primary` + tinte `L.primary + "08"`.
- Wordmark de marca: `L`**`IB`**`erico` con `IB` en `L.amber`, `fontSans` extrabold `tracking-tight`. Si la ruta usa `SiteHeader`, pásale `claro`.
- Color: **ámbar solo marca/decoración**; **índigo única acción** (CTA, ring activo, pills, focus). Cero navy legacy.
- Accesibilidad: contraste AA (`L.ink`/`L.muted` sobre claro; usa `amberDeep`/`ok` para texto pequeño), focus-rings visibles, conserva labels/aria, `tabular-nums` en cifras, targets táctiles ≥ 40px.
- Animación: sutil y con propósito (reveal en entrada, press en CTAs, transiciones de hover/estado 150–250ms). Respeta `prefers-reduced-motion`. Móvil primero en lo táctil, pero el usuario priorizó **desktop-first** en composición.

**Para cada ruta, abre `src/routes/asignaturas.tsx` y `src/routes/login.tsx` y replica el patrón exacto** (head, `<style>`, root id, ctaPrimary, headingStyle). Adáptalo, no lo copies a ciegas: cada ruta tiene su contenido.

## 4. Skills a invocar en cada iteración (obligatorio)

Antes de tocar código de una ruta, invoca y aplica:
- `frontend-design` — dirección estética, tipografía, evitar look "plantilla".
- `ui-ux-pro-max` — jerarquía, estados de interacción, layout, color, animación.
- `web-design-guidelines` — revisión de accesibilidad/UX al cerrar la ruta.
- Cuando haya animaciones no triviales o pulido de detalle: `emil-design-eng` y/o `vercel-react-view-transitions`.
- Antes de marcar `DONE`: pasar `web-design-guidelines` (y `accesslint:scan`/`audit` si el dev server está sano) sobre la ruta migrada.

## 5. Inventario de rutas (estado) — orden = prioridad

Leyenda: `TODO` pendiente · `WIP` en curso · `DONE` migrada+verificada+commiteada · `BLOCKED` (ver nota) · `SKIP` fuera de alcance.

### Ya migradas (referencia, NO tocar salvo bug)
- [DONE] `src/components/LandingPage.tsx` (landing / `index`)
- [DONE] `src/routes/login.tsx`
- [DONE] `src/routes/asignaturas.tsx` (+ `SiteHeader` variante `claro`)

### A — Student-facing (prioridad máxima)
- [TODO] `src/routes/onboarding.tsx`
- [TODO] `src/routes/cuenta.tsx`
- [TODO] `src/routes/comprar-creditos.tsx`
- [TODO] `src/routes/biblioteca.tsx`
- [TODO] `src/routes/prueba-1.tsx` (+ componentes propios: AnalisisAnotado, EvaluacionPanel, TextoAnotado/TextoLectura, EnsayoBanda5, etc. — migra los que renderice)
- [TODO] `src/routes/prueba-2.tsx` (+ EvaluacionPrueba2Panel, EnsayoAnotadoPrueba2, EnsayoBanda5Prueba2, SelectorPreguntaP2)
- [TODO] `src/routes/oral.tsx` (+ GuionAnotadoOral, EvaluacionOralPanel, GuiaOral, SugeridorOral, PanelApuntesOral)
- [TODO] `src/routes/simular-oral.tsx`
- [TODO] `src/routes/oral-b-sesion.tsx` (+ `src/components/oral-b/*`, GuiaOralB, AvatarProfesor*)
- [TODO] `src/routes/ejercicios.tsx` (grande: 2257 líneas; revisa los componentes de `gamificacion/` y JuegoEsperaEvaluacion)
- [TODO] `src/routes/teoria.tsx` (muy grande: 4829 líneas — puede requerir 2 disparos; si es así marca `WIP` con nota de progreso y commitea avance verde por secciones)
- [TODO] `src/routes/historial.tsx`
- [TODO] `src/routes/historial-prueba-2.tsx`
- [TODO] `src/routes/historial-oral.tsx`
- [TODO] `src/routes/reservar-sesion.tsx`
- [TODO] `src/routes/juego-preview.tsx` (pequeña)
- [TODO] `src/components/SpanishB*` y vistas SL (SpanishBPaper1View, SpanishBPaper2View, SpanishBOralView, SpanishB*HistoryView) — migrar cuando se toque su ruta contenedora; si quedan huérfanas, hazlas como unidad propia.

### B — Profesor
- [TODO] `src/routes/profesor.tsx`
- [TODO] `src/routes/profesor-alumnos.tsx`
- [TODO] `src/routes/profesor-alumno.$alumnoId.tsx`
- [TODO] `src/routes/profesor-chat.tsx`
- [TODO] `src/routes/profesor-sesiones.tsx`

### C — Admin
- [TODO] `src/routes/admin.tsx` (2577 líneas — puede requerir 2 disparos)
- [TODO] `src/routes/admin-bookings.tsx`
- [TODO] `src/routes/admin-usuarios.tsx`

### D — Legales / estáticas (último, toque ligero: tipografía + lienzo + header claro)
- [TODO] `src/routes/cookies.tsx`
- [TODO] `src/routes/privacy.tsx`
- [TODO] `src/routes/terms.tsx`
- [SKIP] `src/routes/privacidad.tsx` (8 líneas: probable redirect — verifica; si solo redirige, marca DONE sin cambios)
- [SKIP] `src/routes/__root.tsx` (shell global — no migrar; cascada de riesgo)

### Transversal (oportunista, no bloqueante)
- [TODO] `src/components/SiteHeader.tsx` — la variante `claro` ya existe para `minimal`; si una ruta necesita el header `claro` completo (nav), **extiende** la variante `claro` a esa parte SIN romper el comportamiento por defecto (NAVY) de las rutas no migradas. Cambio quirúrgico y verificado.

## 6. Verificación y git (por unidad)

```
npx tsc --noEmit          # debe pasar (o sin errores nuevos en los archivos tocados)
npm run lint              # sin errores nuevos
npm run build             # verde
```
Screenshots (**best-effort**, NO bloqueante — la caché de Vite peta con iCloud): si quieres validar visualmente, levanta el dev server en background y usa la skill `playwright-skill` para capturar la ruta a 1280px y 390px; guarda en `docs/superpowers/screenshots/` (no las commitees si son pesadas; o súbelas si ayudan a la revisión matinal). Si el server da 504/Outdated Optimize Dep, limpia `.vite` y reintenta una vez; si sigue, **omite screenshots** y confía en el build.

Commit (Conventional Commits, en español, como el repo):
```
git add -A
git commit -m "feat(<area>): restyle Claro premium de <ruta>

<1-2 líneas de qué cambió visualmente>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin night/frontend-claro-premium-all
```
El draft PR ya existe (ver §7); cada push lo actualiza solo.

## 7. Finalizar (a las 08:00, o cuando todo esté DONE/BLOCKED)

1. Asegura que el último trabajo verde está commiteado y pusheado.
2. Actualiza este archivo y la Bitácora §8 con el resumen final.
3. Deja el PR como **draft** (no lo marques ready; lo revisa el usuario). Actualiza el cuerpo del PR con: rutas migradas, bloqueadas (y por qué), pendientes, y cómo revisar.
4. **Borra el cron recurrente**: `CronList` → `CronDelete` del job de este loop. Borra también el cron de parada si existe.
5. `PushNotification` con un resumen de una línea (qué verá al despertar).
6. **No** sigas trabajando después de las 08:00.

## 8. Bitácora (append-only; una línea por iteración)

- 2026-06-19 23:30 CEST · Setup: rama creada, WIP del hero commiteado, plan file creado, cron armado, draft PR #18 (base demo/hero-sim-correccion). Inicio del loop.
- 2026-06-19 23:37 CEST · Baseline verde verificado: `tsc --noEmit` OK, `lint` OK, `build` ✓ 13.5s. El gate arranca limpio.
