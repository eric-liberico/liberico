# Landing: héroe animado + sección "dos partes" — Diseño

**Fecha:** 2026-06-21
**Rama:** `night/frontend-claro-premium-all`
**Origen:** mockup `Hero.dc.html` (+ `support.js`, `README.md`) entregado como handoff.

## Objetivo

Llevar a producción dos piezas del nuevo mockup de landing, integrándolas en el
`LandingPage.tsx` real (React + framer-motion + tokens `landing-theme.ts`):

1. **La tarjeta animada del héroe** (la "pieza estrella"): un recorrido en bucle
   del producto — pegar análisis → evaluar → nota por criterios A–D → feedback →
   solución anotada → reescritura de banda alta.
2. **La sección "Cada corrección, en dos partes"**: dos tarjetas que nombran el
   modelo de tramos (Corrección 1,50 € / Feedback completo +2,00 €).

El resto del mockup **no** se porta (ya existe equivalente o queda fuera de alcance).

## Contexto del código existente

- `src/components/LandingPage.tsx` (~2687 líneas) es la landing real, **bilingüe**
  vía `COPY` (es) y `COPY_EN` (en), seleccionadas con `const c = lang === "en" ? …`.
- Tokens en `src/lib/landing-theme.ts`: `LANDING (L)`, `DEEP`, `CRIT`, `cardShadow`,
  `landingFontSans (fontSans)`, `landingFontMono (fontMono)`. **Ya coinciden** con
  los colores/fuentes del mockup (índigo `#4F46E5`, ámbar `#E8A13A`, criterios).
- El héroe actual renderiza una tarjeta **estática** `ExaminerSheet` (con toggle de
  tramo y revelado en 2 pasos) envuelta en `Tilt`. Ambas funciones (`ExaminerSheet`
  línea 1050, `Tilt` línea 1604) se usan **solo una vez**, en el héroe (línea 2129–2130).
- `AnnotatedCorrection` (línea 1392) es una sección aparte, posterior al héroe.
- Sub-componentes ya extraídos a `src/components/landing/`: `OralPreview`, `Reveal`.
- El ejemplo literario de toda la landing es **faro/Marta** (original, limpio de
  copyright), ya bilingüe:
  - ES: "IB Español A: Literatura NM · Prueba 1" — faro, duelo de Marta, "un campo gris que respiraba".
  - EN: "IB English A: Literature SL · Paper 1" — lighthouse, Marta's grief, "a grey field that breathed".

## Decisiones tomadas (con el usuario)

1. **Reemplazar** la tarjeta estática `ExaminerSheet` por la animada.
2. **Traducir todo a EN**, incluido un ejemplo literario en inglés para el card
   (se reutiliza el ejemplo del faro que ya existe en EN — no se inventa uno nuevo).
3. La **ubicación** de la sección "dos partes" la decide el diseño: **tras el héroe,
   antes de `AnnotatedCorrection`**.
4. **No** se usa el poema de la acacia del mockup: es un ejemplo distinto al resto
   de la landing (incoherencia) y parece **poema real con copyright**. Se reutiliza
   el ejemplo faro/Marta, en **banda media (12/20, nota 5)** para que el feedback
   "muestra cómo subir cada criterio" tenga sentido narrativo.

## Arquitectura de componentes

Dos componentes nuevos en `src/components/landing/` (patrón existente):

### `HeroLoop.tsx`
- Props: `{ c, reduce }` donde `c` es el slice de copy (`c.heroLoop`) y `reduce: boolean`.
- Autocontenido. Refs internas (no `getElementById`): card, cursor, body,
  los dos botones falsos (`evalBtn`, `fbBtn`), `anaInner`/`anaBox`, lock, pop, y
  colecciones `.ac-hl` / `.ac-fillbar` consultadas dentro del subárbol de la card ref.
- Markup: las dos pantallas (input / result) en JSX, conservando los `id`/anclas que
  usa la máquina de estados para hacer scroll (`secCrit`, `crit2`, `secGlobal`,
  `secCTA`, `secAnnot`, `annot3`, `secLang`, `secEssay`, `essay2`, `essay3`).
- Estilos: portados desde el `<style>` del mockup. Las clases puramente visuales
  (`.ac-*`, `.caret`) van a una hoja CSS de landing existente o a un bloque
  `<style>`/`styled` coherente con cómo la landing ya define `.lib-*`. (Decidir en el
  plan: si la landing usa CSS global `lib-*`, añadir ahí las `ac-*`.)

### `CorrectionTiers.tsx`
- Props: `{ c }` usando `c.tiers2`.
- Dos tarjetas con `Reveal`:
  - **Corrección** (verde `L.ok`, 1,50 €): puntuación/20 + nota IB, nota+comentario
    A·B·C·D, comentario global + fortalezas/áreas, se guarda en historial.
  - **Feedback completo** (índigo `L.primary`, +2,00 €, badge "Lo que de verdad
    enseña"): solución anotada por frase, diagnóstico de lenguaje, ensayo elevado a
    banda alta con tu voz, qué se conserva/transforma/sube.
- Tokens existentes (`L`, `CRIT`, `cardShadow`); bilingüe.

### Cambios en `LandingPage.tsx`
- Sustituir `<Tilt><ExaminerSheet c={c} /></Tilt>` (héroe, ~línea 2129) por
  `<HeroLoop c={c} reduce={!!reduce} />`.
- Insertar `<CorrectionTiers c={c} />` tras el `</section>` del héroe, antes de
  `<AnnotatedCorrection c={c} />` (~línea 2137).
- **Eliminar** `ExaminerSheet` (func.) y `Tilt` (func.) — quedan sin referencias.
- **Eliminar** el bloque de copy `sheet` de `COPY.es` y `COPY_EN` (queda sin uso).

## Motor de animación

Portar el array `steps[]` del mockup (tiempos en ms, `LOOP = 24000`) a un
`useEffect` con un único `requestAnimationFrame` sobre `performance.now() % LOOP`.
Tres mejoras sobre el original:

- **Pausa fuera de pantalla:** `IntersectionObserver` cancela el rAF cuando la card
  no es visible y lo reanuda al volver. Además, pausa con `document.hidden`
  (listener `visibilitychange`). (El mockup anima eternamente.)
- **`prefers-reduced-motion`:** si `reduce`, no arranca el loop; pinta el resultado
  **completo y estático** (lock abierto, barras al 100%, marcas `.on`).
- **Móvil (< lg):** se comporta como reduced-motion (resultado estático), evitando
  autoplay de una card de 600px en el teléfono. Desktop-first; funcional en móvil.
- **Cleanup:** `cancelAnimationFrame` + `disconnect()` de observers en unmount.

El posicionamiento del cursor conserva el enfoque del mockup (`getBoundingClientRect`
relativo a la card) pero solo mientras anima y es visible.

## Ubicación de la sección "dos partes"

`HERO → CorrectionTiers (dos partes) → AnnotatedCorrection → Mid CTA → Authority → …`

Razón: la card animada *demuestra* los dos tramos; "dos partes" los *nombra*;
`AnnotatedCorrection` entra al detalle del tramo 2. Distinta de la sección de
pricing posterior (pago-por-uso vs. suscripción).

## Copy / i18n

- Nuevo bloque **`heroLoop`** en `COPY.es` y `COPY_EN` con TODOS los textos del card:
  `deskLabel`, pasaje literario, pregunta de orientación, análisis del alumno
  (párrafos), `score`/`grade` (banda media: 12/20, nota 5), comentarios por criterio
  A–D, comentario global, fortalezas/áreas, labels de los dos botones falsos, solución
  anotada (segmentos), diagnóstico de lenguaje (verbos débiles / interferencias),
  ensayo de banda alta (párrafos), chips "criterio ↑".
- **Un solo ejemplo** en toda la landing: faro/Marta (ES) / lighthouse/Marta (EN).
- El contenido literario ampliado (comentarios por criterio, diagnóstico, ensayo de
  banda alta) se genera **limpio de copyright** con la skill `exportar-correccion-p1`
  (simula una corrección no protegida) en ES, y se traduce a EN con el encuadre
  English A (como ya hace el `sheet` EN).
- Nuevo bloque **`tiers2`** en ambas COPY para la sección "dos partes".
- El tipo de `c` sigue siendo `typeof COPY.es`; `COPY_EN: typeof COPY.es` garantiza
  paridad de claves en compilación.

## Accesibilidad

- La card animada es **demo decorativa**: subárbol con `aria-hidden`. Cursor
  `aria-hidden`. Los dos "botones" falsos son `<span>` no enfocables (no engañan a
  teclado/lector). El CTA real es "Corregir mi texto" del héroe.
- El mensaje accesible lo transmiten el copy del héroe + la sección "dos partes".
- Verificación con **accesslint** sobre el héroe renderizado.

## Verificación

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Capturas (desktop / móvil / `prefers-reduced-motion`) con la skill `run`/playwright.
- Auditoría accesslint del héroe.

## Fuera de alcance

- El resto de secciones del mockup (autoridad, asignaturas, progreso, pricing, CTA
  final): ya existen equivalentes en la landing o no se piden.
- Cambios de pricing/tarifas reales o de copy fuera de las dos piezas.
- El runtime `support.js` / `<x-dc>` del mockup: no se usa (es para el preview del
  handoff; en producción es React).
