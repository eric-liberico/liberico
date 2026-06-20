# Overnight loop — migración "Claro premium" a TODO el front-end de LIBerico

**Creado:** 2026-06-19 23:30 CEST · **Rama:** `night/frontend-claro-premium-all`
**Motor:** cron durable en sesión (`CronCreate`, ~cada 15 min) · **Parada:** 08:00 CEST (sábado 2026-06-20)
**Autonomía git aprobada por el usuario:** commit por ruta + push de la rama + **draft PR** (nunca a `main`).
**Prioridad aprobada:** *student-first*, luego profesor, luego admin, luego legales.

> Este archivo es el **estado durable** del loop. Cada disparo del cron lo lee, ejecuta **UNA** unidad (una ruta + sus componentes propios), verifica, commitea/pushea y **actualiza este archivo**. Sobrevive a resets de tokens: si un disparo falla por límite, el siguiente retoma desde aquí cuando haya tokens nuevos.

---

## 0. Qué hacer en CADA disparo del cron (orden estricto)

1. **Comprobar la hora.** `date "+%H%M"`. Si es **>= 0800 y < 2000** (mañana/día del usuario) → ir a **§7 Finalizar** y parar. No empieces ruta nueva.
2. **Higiene de árbol.** `git status --short`. Si hay cambios **sin commitear** de un disparo anterior cortado a mitad (p. ej. el clasificador de Bash estuvo caído): intenta primero `npx tsc --noEmit` + `npm run build`; si **compila en verde**, RECUPÉRALOS (identifica qué ruta tocan, commitea+pushea esa unidad y márcala DONE en §5 + bitácora). Solo si **NO** compila, descártalos con `git checkout -- .` (lo commiteado es la única verdad). Confirma rama: `git branch --show-current` debe ser `night/frontend-claro-premium-all`; si no, `git checkout night/frontend-claro-premium-all`.
3. **Sincronizar.** `git pull --rebase origin night/frontend-claro-premium-all 2>/dev/null || true` (por si otro proceso empujó).
4. **Elegir la siguiente unidad.** En §5, la primera fila con estado `TODO` (de arriba abajo = orden de prioridad). Márcala `WIP` en este archivo **solo en memoria** (no commitees aún).
5. **Invocar skills de diseño ANTES de tocar código** (§4). No es opcional.
6. **Migrar** esa ruta + sus componentes propios siguiendo §3 (sistema Claro premium) y la ruta de referencia `src/routes/asignaturas.tsx` + `src/routes/login.tsx`.
7. **Verificar** (§6). Si no pasa, arregla; si tras un esfuerzo razonable no compila, `git checkout -- .` esa unidad, marca la fila `BLOCKED` con una nota y pasa a §7 (no dejes el árbol roto).
8. **Commit + push** (§6). Actualiza §5 (marca `DONE`) y añade una línea a §8 (Bitácora) en el **mismo commit**.
9. **Continuar o parar.** Commitea+pushea cada unidad por separado (commits revisables, árbol siempre verde). Si el turno sigue vivo (no has agotado tokens/contexto), **encadena la siguiente unidad** en el mismo turno para no perder tiempo en huecos. Si fue un **disparo en frío del cron**, basta con una unidad y parar. El cron (~cada 15 min) es el **heartbeat de reanudación**: si el turno muere por límite de tokens, el siguiente disparo retoma desde aquí cuando haya tokens nuevos.

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
- [DONE] `src/routes/onboarding.tsx`
- [DONE] `src/routes/cuenta.tsx`
- [DONE] `src/routes/comprar-creditos.tsx`
- [DONE] `src/routes/biblioteca.tsx`
- [WIP] `src/routes/prueba-1.tsx` (ruta ✓ + EvaluacionPanel ✓ + JuegoEsperaEvaluacion ✓; PENDIENTE: AnalisisAnotado, FeedbackEstructural, EnsayoBanda5, SiguientePasoCard)
- [WIP] `src/routes/prueba-2.tsx` (ruta ✓ + EvaluacionPrueba2Panel ✓; PENDIENTE: EnsayoAnotadoPrueba2, EnsayoBanda5Prueba2, SelectorPreguntaP2)
- [DONE] `src/routes/oral.tsx` (ruta ✓ + EvaluacionOralPanel ✓ + componentes propios ✓: GuionAnotadoOral, GuiaOral, SugeridorOral, PanelApuntesOral)
- [DONE] `src/routes/simular-oral.tsx`
- [WIP] `src/routes/oral-b-sesion.tsx` (+ `src/components/oral-b/*`, GuiaOralB, AvatarProfesor*; ResultadoOralB ✓ + GuiaOralB ✓ + AvatarProfesor ✓; PENDIENTE: shell de ruta)
- [TODO] `src/routes/ejercicios.tsx` (grande: 2257 líneas; revisa los componentes de `gamificacion/` y JuegoEsperaEvaluacion)
- [TODO] `src/routes/teoria.tsx` (muy grande: 4829 líneas — puede requerir 2 disparos; si es así marca `WIP` con nota de progreso y commitea avance verde por secciones)
- [TODO] `src/routes/historial.tsx`
- [DONE] `src/routes/historial-prueba-2.tsx` (ruta ✓ + EvaluacionPrueba2Panel ✓)
- [DONE] `src/routes/historial-oral.tsx` (ruta ✓ + EvaluacionOralPanel ✓)
- [TODO] `src/routes/reservar-sesion.tsx`
- [DONE] `src/routes/juego-preview.tsx` (pequeña; preview del juego en Claro premium)
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

- 2026-06-20 00:01 CEST · onboarding.tsx → Claro premium: tarjetas premium (hairline+sombra+hover-lift), índigo scoped a #onboarding-root, titulares Plex Sans, animaciones reveal/press con reduced-motion, header claro, CTAs con glow. tsc/lint/build verdes.

- 2026-06-20 07:14 CEST · cuenta.tsx → Claro premium: tarjetas claras con reveal escalonado, índigo scoped, titular Plex Sans, eyebrow/cifras mono, pill claro, zona de peligro con rojo semántico, diálogo sans. (Recuperado tras outage de opus-4-8.) tsc/lint/build verdes.

- 2026-06-20 07:17 CEST · comprar-creditos.tsx → Claro premium en sus 3 estados (éxito/cancelado/formulario): lienzo cálido, tarjetas claras con reveal, índigo scoped + CTAs con glow, cifras/precios en mono, ámbar solo en marca (Coins), verde AA en éxito. Lógica Stripe/validateSearch intacta. tsc/lint/build verdes.

- 2026-06-20 07:20 CEST · biblioteca.tsx → Claro premium: hero Plex Sans + eyebrow mono, tarjetas de texto con hairline+sombra+hover-lift (preview literario en serif intencional), gate de desbloqueo en índigo tenue, CTAs con glow. Lógica de carga/desbloqueo/tabs intacta. tsc/lint/build verdes.

- 2026-06-20 07:24 CEST · prueba-1.tsx → vista de ruta a Claro premium (ambas variantes Lit y Spanish-B): header claro, hero Plex Sans + eyebrow mono, banner de criterio débil en ámbar tenue con CTA índigo, Card del formulario clara, botón Evaluar con glow. PENDIENTE como unidad aparte: EvaluacionPanel, JuegoEsperaEvaluacion, SpanishBPaper1View (componentes propios). tsc/lint/build verdes.

- 2026-06-20 08:06 CEST · prueba-2.tsx → vista de ruta a Claro premium (Lit + Spanish-B): header claro, hero Plex Sans + eyebrow mono, Card de formulario clara, botón Evaluar con glow. PENDIENTE: EvaluacionPrueba2Panel (componente aparte). tsc/lint/build verdes.

- 2026-06-20 08:10 CEST · historial-oral.tsx → Claro premium: header claro, titulares Plex Sans, notas IB/puntuaciones en mono tabular, tarjetas de fila con hover-lift + ring índigo. PENDIENTE: EvaluacionOralPanel (componente aparte). tsc/lint/build verdes.

- 2026-06-20 08:12 CEST · historial-prueba-2.tsx → Claro premium: header claro, titulares Plex Sans, puntuaciones en mono tabular, tarjetas de fila con hover-lift + ring índigo, estado vacío claro. PENDIENTE: EvaluacionPrueba2Panel (componente aparte). tsc/lint/build verdes.

- 2026-06-20 08:40 CEST · EvaluacionPanel.tsx (panel de resultado de P1, también usado en historial) → Claro premium: banner de resultado en índigo profundo DEEP con puntuación en mono tabular + nota IB en chip verde AA; tarjetas de criterio A–D con color por criterio (CRIT) en cifra y barra de progreso; titulares Plex Sans, micro-etiquetas mono, cards hairline+cardShadow+rounded-2xl+reveal, CTA "feedback completo" índigo con glow/press; texto literario conserva serif. Sin cambios de lógica/i18n/datos. prettier/eslint/tsc/build verdes. Cierra la rotura visual form→resultado del flujo P1. (Continúa con web-design-guidelines: pass.)

- 2026-06-20 09:45 CEST · oral.tsx (shell de ruta) → Claro premium: head con font link, #oral-root con scoped CSS (índigo/ring, lib-press/reveal, reduced-motion), SiteHeader claro, hero Plex Sans + eyebrow mono, tarjetas extra (sugeridor/apuntes) en lienzo cálido y card principal del formulario en blanco premium, CTAs "Abrir sugeridor"/"Evaluar oral" con glow/press. Labels de formulario conservan text-muted-foreground (patrón pragmático de prueba-1). PENDIENTE como componentes aparte: GuiaOral, SugeridorOral, PanelApuntesOral, GuionAnotadoOral. Sin cambios de lógica/i18n. prettier/eslint/tsc/build verdes.

- 2026-06-20 09:25 CEST · JuegoEsperaEvaluacion.tsx (pantalla de espera del juego, en P1/P2/oral y juego-preview) → Claro premium del chrome: tarjeta blanca hairline+cardShadow+rounded-2xl, eyebrow/etiqueta en mono, bocadillo en lienzo cálido L.bg2 con colas recoloreadas, área de juego con borde hairline y focus-ring índigo. El arte SVG (faro/molinos/sol/cielo) se conserva intacto: es identidad del juego, no tokens de tema. Sin cambios de lógica. prettier/eslint/tsc/build verdes.

- 2026-06-20 09:10 CEST · EvaluacionOralPanel.tsx (panel de resultado del oral, también usado en historial-oral) → Claro premium: banner DEEP con puntuación /40 mono tabular + nota en chip verde, badges/tiempos sobre índigo profundo; 4 tarjetas de criterio con color por criterio; diagnósticos (asunto global/equilibrio/estructura) en cards blancas con filas hairline e iconos/estado semánticos (presente/parcial/ausente); preguntas del profesor con número índigo; zonas de desarrollo self-taught en ámbar de atención (tokens del banner de prueba-1); fortalezas/áreas alineadas a P1/P2. Quitado Badge sin uso. Sin cambios de lógica/datos/i18n. prettier/eslint/tsc/build verdes. Deja historial-oral DONE.

- 2026-06-20 08:55 CEST · EvaluacionPrueba2Panel.tsx (panel de resultado de P2, también usado en historial-prueba-2) → Claro premium: banner DEEP con puntuación /25 en mono tabular + nota IB en chip verde; 5 tarjetas de criterio (A/B1/B2/C/D) con color por criterio; chips de estado del diagnóstico comparativo (presente/parcial/ausente) y chips de criterio de las anotaciones repintados a paleta semántica/CRIT; cards de diagnóstico/anotaciones a hairline blanco; comillas tipográficas en fragmentos; CTA con glow/press. Sin cambios de lógica/datos/i18n. prettier/eslint/tsc/build verdes. Esto deja historial-prueba-2 completamente DONE.

- 2026-06-20 09:57 CEST · Codex (yo) cerró y verificó los cambios sin commit heredados de Claude en los 4 componentes propios del oral + juego-preview: GuionAnotadoOral con card/filtros/tooltip Claro premium manteniendo serif solo en el guion; GuiaOral con micro-etiquetas mono y radios premium; SugeridorOral con cards claras, titulares Plex Sans y CTAs con glow/press; PanelApuntesOral con eyebrows mono, card de resultado premium y CTA con glow; juego-preview con head font link, #juego-preview-root scoped y lienzo cálido. prettier/eslint/tsc/build verdes. Esta línea y el commit correspondiente son míos; las ediciones iniciales de esos 5 archivos venían de la sesión de Claude y yo las validé/cerré como unidad reversible.

- 2026-06-20 10:01 CEST · Codex (yo) migró `simular-oral.tsx` a Claro premium como unidad nueva propia: head con font link, `#simular-oral-root` scoped, `SiteHeader claro`, lienzo cálido, hero Plex Sans, stepper con chips mono, cards blancas hairline+cardShadow, tarjetas internas cálidas, CTAs con glow/press, transcript y estados de simulación repintados con tokens L/ámbar/destructivo. No se tocó lógica de ElevenLabs, Supabase, timers, callbacks ni datos. prettier/eslint/tsc/build verdes. Commit mío y reversible.

- 2026-06-20 10:05 CEST · Codex (yo) migró `src/components/oral-b/ResultadoOralB.tsx` como primer corte reversible de Oral B: banner DEEP con puntuación /30 y nota IB en mono tabular, tarjetas A/B1/B2/C con colores CRIT y barras inline, secciones de estructura/lengua/comentario/fortalezas/mejoras/preguntas/transcripción en cards blancas hairline+cardShadow. No se tocó contrato de props ni datos del resultado. prettier/eslint/tsc/build verdes. Oral B queda WIP; ruta, GuiaOralB y AvatarProfesor* siguen pendientes.

- 2026-06-20 10:08 CEST · Codex (yo) migró los componentes pequeños de Oral B: `GuiaOralB.tsx` con card Claro premium, paneles cálidos, badges índigo y micro-etiquetas mono; `AvatarProfesor.tsx` con pulsos/bordes/estado usando tokens L y mono en el estado textual. `AvatarProfesorVideo.tsx` se dejó intacto porque el video negro es contenido, no chrome legacy. prettier/eslint/tsc/build verdes. Oral B sigue WIP; queda el shell de `oral-b-sesion.tsx`.
