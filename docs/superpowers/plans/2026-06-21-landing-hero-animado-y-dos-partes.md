# Landing: héroe animado + sección "dos partes" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la tarjeta estática del héroe por una tarjeta animada en bucle (recorrido del producto) y añadir la sección "Cada corrección, en dos partes", ambas bilingües e integradas en `LandingPage.tsx`.

**Architecture:** Dos sub-componentes nuevos en `src/components/landing/` (`HeroLoop.tsx`, `CorrectionTiers.tsx`), data-driven sobre bloques de copy `heroLoop`/`tiers2` añadidos a `COPY.es` y `COPY_EN`. `HeroLoop` corre una máquina de estados sobre `requestAnimationFrame` dentro de un `useEffect`, con pausa fuera de pantalla, respeto a `prefers-reduced-motion` y fallback estático en móvil. Se elimina la tarjeta estática (`ExaminerSheet`), su wrapper `Tilt` y el copy `sheet`.

**Tech Stack:** React + TypeScript estricto, framer-motion (ya presente), tokens de `src/lib/landing-theme.ts`. Sin librerías nuevas.

## Global Constraints

- **Sin paquetes nuevos.** Solo React + framer-motion + tokens existentes.
- **Tokens existentes únicamente:** `LANDING (L)`, `DEEP`, `CRIT`, `cardShadow`, `landingFontSans (fontSans)`, `landingFontMono (fontMono)` de `@/lib/landing-theme`. No inventar colores.
- **Bilingüe obligatorio:** todo texto nuevo va en `COPY.es` y `COPY_EN`. `COPY_EN: typeof COPY.es` debe seguir compilando (paridad de claves exacta).
- **Un solo ejemplo literario en toda la landing:** faro/Marta (ES) / lighthouse/Marta (EN). No usar el poema de la acacia del mockup (copyright + incoherencia).
- **Contenido literario original** (producto), no texto de terceros. Banda media: 12/20, nota 5.
- **Verificación del proyecto** (no hay test runner): `npx tsc --noEmit`, `npm run lint`, `npm run build`. La verificación visual es por captura (skill `run`/playwright) y accesibilidad por `accesslint`.
- **Desktop-first** pero funcional en móvil: la animación corre solo ≥ `lg` (1024px); en móvil y con reduced-motion se muestra el resultado estático completo.
- **No commitear a `main`.** Rama actual: `night/frontend-claro-premium-all`. Mensajes de commit terminan con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- **Create** `src/components/landing/HeroLoop.tsx` — tarjeta animada del héroe. Responsabilidad única: renderizar las dos pantallas (input/result) y orquestar la animación. ~270 líneas.
- **Create** `src/components/landing/CorrectionTiers.tsx` — sección "dos partes". Responsabilidad única: dos tarjetas de tramo. ~110 líneas.
- **Modify** `src/components/LandingPage.tsx`:
  - Añadir bloques `heroLoop` y `tiers2` a `COPY.es` y `COPY_EN` (Task 1).
  - Importar y usar `HeroLoop` y `CorrectionTiers`; eliminar `ExaminerSheet`, `Tilt` y el copy `sheet` (Task 4).

Los estilos `.ac-*` se co-localizan dentro de `HeroLoop.tsx` (un `<style>` que se monta una vez), siguiendo el patrón de CSS-en-TSX de la landing.

---

## Copy Appendix (contenido literal, DRY — fuente única para Task 1)

> Tipos auxiliares usados abajo: `Crit = "A" | "B" | "C" | "D"`. Segmento anotado:
> `AnnotSeg = { t: string } | { h: string; c: Crit }`. Un párrafo anotado es `AnnotSeg[]`.

### `heroLoop` — ES (añadir a `COPY.es`)

```ts
heroLoop: {
  deskLabel: "Corrector de análisis literario · IB Español A: Literatura NM · Prueba 1",
  passageLabel: "Texto literario",
  questionLabel: "Pregunta de orientación",
  analysisLabel: "Tu análisis",
  passage:
    "El faro seguía allí, alto e inútil, al final del espigón. Marta lo miraba cada tarde desde la ventana, como quien vigila algo que ya no puede salvarse. El mar era un campo gris que respiraba despacio bajo la niebla, y la luz giraba sin alumbrar a nadie. Desde que su padre faltaba, ella había aprendido a mirar el agua del mismo modo: con una espera que no sabía nombrar.",
  question:
    "¿Cómo construye el texto la relación entre el faro y el estado interior de la protagonista?",
  analysis: [
    "Este texto trata de una mujer, Marta, que mira el faro desde su ventana después de perder a su padre. El autor utiliza el faro y el mar para mostrar cómo se siente ella por dentro. En este análisis voy a explicar cómo usa estas imágenes y con qué propósito.",
    "En primer lugar, el faro representa a Marta. El autor dice que es «alto e inútil», y eso muestra que ella también se siente inútil y sola después de la muerte de su padre. El propósito es transmitir tristeza al lector.",
    "También usa el mar. Dice que es «un campo gris que respiraba», que es una metáfora muy bonita para mostrar el mar como algo vivo. Esto crea una imagen que transmite calma y a la vez pena.",
    "En conclusión, el autor utiliza el faro y el mar para transmitir el dolor de Marta. Creo que lo hace sobre todo para que el lector entienda cómo se siente ella.",
  ],
  credits: "1,5 cr",
  evalBtn: "Evaluar análisis",
  resultLabel: "Resultado",
  resultTitle: "Evaluación del examinador",
  scoreLabel: "Punt.",
  scoreVal: "12",
  scoreMax: "/20",
  gradeLabel: "Nota",
  gradeVal: "5",
  critHeading: "Calificación por criterios",
  crit: [
    { l: "A" as const, n: "Comprensión e interpretación", s: 3, max: 5,
      comment: "Comprende el sentido literal y lo apoya con citas pertinentes («alto e inútil», «un campo gris que respiraba»). La lectura se queda en la superficie: no explora por qué la luz «gira sin alumbrar a nadie» ni la espera que Marta «no sabía nombrar»." },
    { l: "B" as const, n: "Análisis y evaluación", s: 3, max: 5,
      comment: "Identifica recursos —la imagen del mar, el faro como símbolo— y los ordena. El análisis del efecto es general: llama «metáfora» a lo que es una personificación y no comenta cómo la luz inútil construye el duelo." },
    { l: "C" as const, n: "Foco y organización", s: 3, max: 5,
      comment: "Organización clara: tesis, un párrafo por imagen y conclusión. El foco se mantiene, pero la progresión es aditiva («en primer lugar», «también») más que argumentativa." },
    { l: "D" as const, n: "Lengua", s: 3, max: 5,
      comment: "Lenguaje correcto y claro, con pocos errores. A veces coloquial («una metáfora muy bonita», «creo que») y con léxico crítico limitado: se repiten «usar», «mostrar» y «transmitir»." },
  ],
  globalLabel: "Comentario global del examinador",
  global:
    "Análisis competente y bien encaminado que responde a la pregunta. Banda media (un 3 en los cuatro criterios, 12 sobre 20 y nota 5): hay comprensión sólida y orden, pero el análisis se queda en identificar y describir el efecto, sin profundizar en cómo el faro y el mar construyen el duelo de Marta.",
  strengthsLabel: "Fortalezas",
  strengths:
    "Buena comprensión literal y selección pertinente de citas. La estructura por imágenes es coherente con la pregunta y el cierre conecta el faro y el mar con un mismo sentimiento.",
  areasLabel: "Áreas de mejora",
  areas:
    "Profundiza en el efecto: nombra con precisión los recursos (personificación, no metáfora) y enlázalos con el duelo. Evita los giros coloquiales y el metadiscurso escolar («voy a explicar»).",
  ctaChip: "Feedback completo · +2 cr",
  ctaTitle: "Solución anotada, lenguaje y ensayo de banda alta",
  ctaSub: "Mantiene tu voz; muestra cómo subir cada criterio.",
  fbBtn: "Dame feedback completo",
  annotHeading: "Tu solución anotada",
  annot: [
    [
      { t: "Este texto trata de una mujer que mira el faro tras perder a su padre. " },
      { h: "El autor utiliza el faro y el mar", c: "D" as const },
      { t: " para mostrar cómo se siente. " },
      { h: "En este análisis voy a explicar cómo usa estas imágenes", c: "D" as const },
      { t: "." },
    ],
    [
      { h: "El faro representa a Marta", c: "A" as const },
      { t: ": el autor dice que es «alto e inútil». " },
      { h: "Es una metáfora muy bonita", c: "B" as const },
      { t: " del mar como algo vivo." },
    ],
  ],
  pop: {
    kicker: "D · Lenguaje · reescritura de banda alta",
    body: "Metadiscurso escolar («voy a explicar») y repetición de «usa». Rebaja el tono académico.",
    fix: "el autor enlaza el faro y el mar para encarnar el duelo de Marta",
  },
  langHeading: "Lenguaje analítico · precisión",
  lang: [
    { kind: "verb" as const, tag: "«usar» × 6", from: "el autor utiliza el faro y el mar", to: "el autor despliega / articula el faro y el mar" },
    { kind: "verb" as const, tag: "«transmitir» × 3", from: "para transmitir tristeza al lector", to: "para construir / encarnar el duelo" },
    { kind: "colo" as const, tag: "Coloquialismo", from: "«una metáfora muy bonita»", to: "una imagen que dota de vida al paisaje" },
  ],
  essayHeading: "Tu ensayo elevado a banda alta",
  essaySub: "La misma idea, desarrollada con precisión y sin perder tu voz.",
  essay: [
    "El texto da voz al duelo de Marta a través de dos imágenes que se sostienen entre sí: el faro y el mar. Desde la primera línea el faro aparece «alto e inútil», y esa inutilidad no la describe a ella, la encarna: como el faro que gira «sin alumbrar a nadie», Marta vigila algo que ya no puede salvarse.",
    "El mar prolonga ese estado. Al personificarlo como «un campo gris que respiraba», el autor lo vuelve un cuerpo vivo y lento, del mismo ritmo que la espera de Marta. No es solo una imagen bonita: la respiración del mar mide el tiempo detenido del duelo, y la niebla que lo cubre es la misma que enturbia su mirada.",
    "Por eso el faro y el agua acaban diciendo lo mismo. La luz que no alumbra y la espera que Marta «no sabía nombrar» se reflejan: el paisaje no acompaña su dolor, lo piensa por ella. El texto no explica el duelo; lo deja girar, como el haz del faro, sobre una superficie que ya no espera respuesta.",
  ],
  chips: [
    { c: "A" as const, t: "A ↑ interpretación" },
    { c: "B" as const, t: "B ↑ recursos" },
    { c: "C" as const, t: "C ↑ progresión" },
    { c: "D" as const, t: "D ↑ léxico" },
  ],
},
```

### `heroLoop` — EN (añadir a `COPY_EN`, mismas claves)

```ts
heroLoop: {
  deskLabel: "Literary analysis corrector · IB English A: Literature SL · Paper 1",
  passageLabel: "Literary text",
  questionLabel: "Guiding question",
  analysisLabel: "Your analysis",
  passage:
    "The lighthouse was still there, tall and useless, at the end of the breakwater. Marta watched it every evening from the window, like someone keeping watch over something that can no longer be saved. The sea was a grey field that breathed slowly under the fog, and the light turned without lighting anyone home. Since her father's death, she had learned to look at the water the same way: with a waiting she could not name.",
  question:
    "How does the text build the relationship between the lighthouse and the protagonist's inner state?",
  analysis: [
    "This text is about a woman, Marta, who looks at the lighthouse from her window after losing her father. The author uses the lighthouse and the sea to show how she feels inside. In this analysis I am going to explain how he uses these images and for what purpose.",
    "First, the lighthouse represents Marta. The author says it is 'tall and useless', and that shows she also feels useless and alone after her father's death. The purpose is to convey sadness to the reader.",
    "He also uses the sea. He says it is 'a grey field that breathed', which is a very beautiful metaphor to show the sea as something alive. This creates an image that conveys calm and sorrow at the same time.",
    "In conclusion, the author uses the lighthouse and the sea to convey Marta's pain. I think he does it above all so the reader understands how she feels.",
  ],
  credits: "1.5 cr",
  evalBtn: "Evaluate analysis",
  resultLabel: "Result",
  resultTitle: "Examiner's evaluation",
  scoreLabel: "Score",
  scoreVal: "12",
  scoreMax: "/20",
  gradeLabel: "Grade",
  gradeVal: "5",
  critHeading: "Criteria marking",
  crit: [
    { l: "A" as const, n: "Understanding and interpretation", s: 3, max: 5,
      comment: "Grasps the literal sense and supports it with apt quotations ('tall and useless', 'a grey field that breathed'). The reading stays on the surface: it never explores why the light 'turns without lighting anyone home' nor the waiting Marta 'could not name'." },
    { l: "B" as const, n: "Analysis and evaluation", s: 3, max: 5,
      comment: "Identifies devices —the sea image, the lighthouse as symbol— and orders them. The reading of effect is general: it calls a personification a 'metaphor' and never comments how the useless light builds the grief." },
    { l: "C" as const, n: "Focus and organisation", s: 3, max: 5,
      comment: "Clear organisation: thesis, one paragraph per image and a conclusion. Focus holds, but the progression is additive ('first', 'also') rather than argumentative." },
    { l: "D" as const, n: "Language", s: 3, max: 5,
      comment: "Correct, clear language with few errors. At times colloquial ('a very beautiful metaphor', 'I think') and with limited critical lexis: 'use', 'show' and 'convey' repeat." },
  ],
  globalLabel: "Examiner's global comment",
  global:
    "A competent, well-aimed analysis that answers the question. Mid-band (a 3 across all four criteria, 12 out of 20 and grade 5): there is solid understanding and order, but the analysis stops at identifying and describing the effect, without probing how the lighthouse and the sea build Marta's grief.",
  strengthsLabel: "Strengths",
  strengths:
    "Good literal understanding and apt choice of quotations. The image-by-image structure fits the question and the close ties the lighthouse and the sea to a single feeling.",
  areasLabel: "Areas to improve",
  areas:
    "Go deeper into the effect: name the devices precisely (personification, not metaphor) and tie them to the grief. Avoid colloquial turns and school metadiscourse ('I am going to explain').",
  ctaChip: "Full feedback · +2 cr",
  ctaTitle: "Annotated response, language and high-band essay",
  ctaSub: "Keeps your voice; shows how to raise each criterion.",
  fbBtn: "Give me full feedback",
  annotHeading: "Your annotated response",
  annot: [
    [
      { t: "This text is about a woman who watches the lighthouse after losing her father. " },
      { h: "The author uses the lighthouse and the sea", c: "D" as const },
      { t: " to show how she feels. " },
      { h: "In this analysis I am going to explain how he uses these images", c: "D" as const },
      { t: "." },
    ],
    [
      { h: "The lighthouse represents Marta", c: "A" as const },
      { t: ": the author says it is 'tall and useless'. " },
      { h: "It is a very beautiful metaphor", c: "B" as const },
      { t: " of the sea as something alive." },
    ],
  ],
  pop: {
    kicker: "D · Language · high-band rewrite",
    body: "School metadiscourse ('I am going to explain') and repeated 'use'. Lower the academic scaffolding.",
    fix: "the author ties the lighthouse and the sea to embody Marta's grief",
  },
  langHeading: "Analytical language · precision",
  lang: [
    { kind: "verb" as const, tag: "'use' × 6", from: "the author uses the lighthouse and the sea", to: "the author deploys / articulates the lighthouse and the sea" },
    { kind: "verb" as const, tag: "'convey' × 3", from: "to convey sadness to the reader", to: "to build / embody the grief" },
    { kind: "colo" as const, tag: "Colloquialism", from: "'a very beautiful metaphor'", to: "an image that gives life to the landscape" },
  ],
  essayHeading: "Your essay raised to high band",
  essaySub: "The same idea, developed with precision and without losing your voice.",
  essay: [
    "The text gives voice to Marta's grief through two images that hold each other up: the lighthouse and the sea. From the first line the lighthouse stands 'tall and useless', and that uselessness does not describe her — it embodies her: like the light that turns 'without lighting anyone home', Marta keeps watch over something that can no longer be saved.",
    "The sea extends that state. By personifying it as 'a grey field that breathed', the author makes it a living, slow body, paced like Marta's waiting. It is not just a beautiful image: the sea's breathing measures the stalled time of grief, and the fog that covers it is the same that clouds her gaze.",
    "That is why the lighthouse and the water end up saying the same thing. The light that does not illuminate and the waiting Marta 'could not name' mirror each other: the landscape does not accompany her pain, it thinks it for her. The text does not explain the grief; it lets it turn, like the lighthouse beam, over a surface that no longer expects an answer.",
  ],
  chips: [
    { c: "A" as const, t: "A ↑ interpretation" },
    { c: "B" as const, t: "B ↑ devices" },
    { c: "C" as const, t: "C ↑ progression" },
    { c: "D" as const, t: "D ↑ lexis" },
  ],
},
```

### `tiers2` — ES (añadir a `COPY.es`)

```ts
tiers2: {
  kicker: "Cada corrección, en dos partes",
  title: "Empieza por la nota. Profundiza cuando quieras.",
  sub: "La corrección base te da la evaluación del examinador. El feedback completo abre las anotaciones, el diagnóstico de lenguaje y la reescritura de banda alta.",
  base: {
    tag: "Corrección",
    price: "1,50 €",
    title: "La evaluación del examinador",
    points: [
      "Puntuación sobre 20 y nota IB estimada",
      "Nota y comentario por criterios A · B · C · D",
      "Comentario global, fortalezas y áreas de mejora",
      "Se guarda en tu historial de progreso",
    ],
  },
  full: {
    badge: "Lo que de verdad enseña",
    tag: "Feedback completo",
    price: "+2,00 €",
    title: "Diagnóstico, anotaciones y reescritura",
    points: [
      "Solución anotada: comentarios por frase",
      "Diagnóstico de lenguaje: verbos débiles e interferencias",
      "Ensayo completo elevado a banda alta, con tu voz",
      "Qué se conserva, qué se transforma y qué criterios suben",
    ],
  },
},
```

### `tiers2` — EN (añadir a `COPY_EN`)

```ts
tiers2: {
  kicker: "Every correction, in two parts",
  title: "Start with the grade. Go deeper when you want.",
  sub: "The base correction gives you the examiner's evaluation. Full feedback opens the annotations, the language diagnosis and the high-band rewrite.",
  base: {
    tag: "Correction",
    price: "€1.50",
    title: "The examiner's evaluation",
    points: [
      "Score out of 20 and estimated IB grade",
      "Grade and comment per criterion A · B · C · D",
      "Global comment, strengths and areas to improve",
      "Saved to your progress history",
    ],
  },
  full: {
    badge: "What truly teaches",
    tag: "Full feedback",
    price: "+€2.00",
    title: "Diagnosis, annotations and rewrite",
    points: [
      "Annotated response: sentence-by-sentence comments",
      "Language diagnosis: weak verbs and interference",
      "Full essay raised to high band, in your voice",
      "What is kept, what is transformed and which criteria rise",
    ],
  },
},
```

---

## Task 1: Añadir copy `heroLoop` + `tiers2` a `COPY.es` y `COPY_EN`

**Files:**
- Modify: `src/components/LandingPage.tsx` (objeto `COPY.es`, ~línea 65–558; objeto `COPY_EN`, ~línea 559–1049)

**Interfaces:**
- Produces: `COPY.es.heroLoop` y `COPY.es.tiers2` con las formas del Copy Appendix. `c.heroLoop` y `c.tiers2` quedan disponibles donde `c: typeof COPY.es`. El campo `crit[].l` y `annot[][].c` y `chips[].c` son del tipo `"A"|"B"|"C"|"D"` (via `as const`). `lang[].kind` es `"verb"|"colo"`.

- [ ] **Step 1: Insertar el bloque `heroLoop` (ES) en `COPY.es`**

Añade el objeto `heroLoop` del Copy Appendix (sección "ES") como propiedad de `COPY.es`, junto al resto de claves (p. ej. justo después de `sheet:` para minimizar el diff; el orden no importa).

- [ ] **Step 2: Insertar el bloque `tiers2` (ES) en `COPY.es`**

Añade el objeto `tiers2` del Copy Appendix (sección ES) como propiedad de `COPY.es`.

- [ ] **Step 3: Insertar `heroLoop` (EN) y `tiers2` (EN) en `COPY_EN`**

Añade los objetos `heroLoop` y `tiers2` del Copy Appendix (secciones EN) a `COPY_EN`, con las mismas claves que la versión ES.

- [ ] **Step 4: Type-check (paridad de claves ES/EN)**

Run: `npx tsc --noEmit`
Expected: PASS. Si falla con "Property 'heroLoop' is missing in type ... but required in 'typeof COPY.es'" o similar, falta una clave en `COPY_EN`; corrígela hasta que compile. (`COPY_EN: typeof COPY.es` fuerza paridad exacta.)

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: PASS (sin errores nuevos).

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): copy bilingüe heroLoop + dos partes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Crear `HeroLoop.tsx` (tarjeta animada)

**Files:**
- Create: `src/components/landing/HeroLoop.tsx`

**Interfaces:**
- Consumes: `c.heroLoop` (Task 1); tokens `L`, `DEEP`, `CRIT`, `cardShadow`, `fontSans`, `fontMono` de `@/lib/landing-theme`.
- Produces: `export function HeroLoop({ c, reduce }: { c: typeof COPY.es; reduce: boolean }): JSX.Element`. Importará el tipo de copy vía `import type { LandingCopy } from "@/components/LandingPage"`. **Prerequisito:** en Task 1 exporta el tipo. Si `typeof COPY.es` no está exportado, añade en `LandingPage.tsx`: `export type LandingCopy = typeof COPY.es;` y tipa props como `c: LandingCopy`. (Hazlo en Task 1, Step 1.)

- [ ] **Step 1: Crear el archivo con imports, tipos y CSS co-localizado**

Crea `src/components/landing/HeroLoop.tsx`:

```tsx
import { useEffect, useRef } from "react";
import {
  LANDING as L,
  DEEP,
  CRIT,
  cardShadow,
  landingFontMono as fontMono,
} from "@/lib/landing-theme";
import type { LandingCopy } from "@/components/LandingPage";

type Crit = "A" | "B" | "C" | "D";

const LOOP = 24000;

// Estilos puramente visuales de la demo (montados una vez con el componente).
const AC_CSS = `
.ac-card{position:relative;width:100%;max-width:34rem;height:600px;border-radius:22px;overflow:hidden;background:#fff;
  box-shadow:0 30px 60px -28px rgba(15,23,42,0.42),0 6px 16px -8px rgba(15,23,42,0.12);}
.ac-cursor{position:absolute;left:0;top:0;z-index:90;pointer-events:none;opacity:0;
  filter:drop-shadow(0 3px 6px rgba(15,23,42,.34));
  transition:transform .55s cubic-bezier(.45,0,.2,1),opacity .3s ease;}
.ac-stage{position:absolute;inset:0;transition:opacity .55s ease;}
.ac-body{position:relative;transition:transform .6s cubic-bezier(.5,0,.2,1);}
.ac-hl{border-radius:4px;padding:0 2px;border-bottom:2px solid transparent;background-color:transparent;
  transition:background-color .45s ease,border-color .45s ease;}
.ac-hl.on{background-color:var(--on-bg);border-bottom-color:var(--on-bd);}
.ac-fillbar{transform:scaleX(0);transform-origin:left;transition:transform .7s cubic-bezier(.5,0,.2,1);}
.ac-fillbar.on{transform:scaleX(1);}
.ac-btn{transition:transform .18s ease,box-shadow .25s ease;}
.ac-btn.pressed{animation:acRing .5s ease;}
@keyframes acRing{0%{box-shadow:0 0 0 0 rgba(79,70,229,.5)}100%{box-shadow:0 0 0 18px rgba(79,70,229,0)}}
.ac-lock{max-height:0;opacity:0;overflow:hidden;
  transition:max-height .6s cubic-bezier(.5,0,.2,1),opacity .4s ease;}
.ac-pop{transition:opacity .3s ease,transform .3s ease;opacity:0;}
.ac-pop.show{opacity:1;}
@media (prefers-reduced-motion: reduce){
  .ac-stage,.ac-body,.ac-hl,.ac-fillbar,.ac-btn,.ac-lock,.ac-pop,.ac-cursor{transition:none;}
}
`;

const critTint = (k: Crit) => CRIT[k] + "1f";
```

- [ ] **Step 2: Añadir el cuerpo del componente — refs, JSX de las dos pantallas**

Dentro de `HeroLoop`, declara `const cardRef = useRef<HTMLDivElement>(null);` y devuelve el markup. El JSX usa **data-attributes** (no `id`) para que la máquina de estados localice nodos sin colisiones globales. Es data-driven: mapea sobre `c.heroLoop`.

```tsx
export function HeroLoop({ c, reduce }: { c: LandingCopy; reduce: boolean }) {
  const h = c.heroLoop;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => runHeroLoop(cardRef.current, reduce), [reduce]);

  return (
    <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <style>{AC_CSS}</style>
      <div ref={cardRef} className="ac-card">
        {/* cursor */}
        <div className="ac-cursor" data-ac="cursor">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 2.5 L19.5 12.5 L12.6 13.2 L9.6 20 Z" fill="#0F172A" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>

        {/* SCREEN 1 · INPUT */}
        <div className="ac-stage" data-ac="input" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px 8px", borderBottom: `1px solid ${L.lineSoft}` }}>
            <div style={{ ...fontMono, fontSize: "0.54rem", textTransform: "uppercase", letterSpacing: "0.16em", color: L.primary }}>
              {h.deskLabel}
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "14px 18px", minHeight: 0 }}>
            <Panel label={h.passageLabel}>
              <p style={serif(0.58, 1.68)}>{h.passage}</p>
            </Panel>
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 10 }}>
              <div>
                <Mono>{h.questionLabel}</Mono>
                <div style={{ border: `1px solid ${L.line}`, borderRadius: 11, background: "#fff", padding: "9px 11px", fontSize: "0.64rem", lineHeight: 1.4, color: L.ink }}>
                  {h.question}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
                <Mono>{h.analysisLabel}</Mono>
                <div data-ac="anaBox" style={{ flex: 1, border: `1px solid ${L.line}`, borderRadius: 11, background: "#FBFAF7", padding: "11px 12px", overflow: "hidden" }}>
                  <div data-ac="anaInner" className="ac-body">
                    {h.analysis.map((p, i) => (
                      <p key={i} style={{ ...serif(0.58, 1.62), margin: i ? "8px 0 0" : 0 }}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 16px", borderTop: `1px solid ${L.lineSoft}` }}>
            <span style={{ ...fontMono, fontSize: "0.72rem", fontWeight: 600, color: L.amberDeep }}>{h.credits}</span>
            <span className="ac-btn" data-ac="evalBtn" style={pillBtn()}>✦ {h.evalBtn}</span>
          </div>
        </div>

        {/* SCREEN 2 · RESULT */}
        <div className="ac-stage" data-ac="result" style={{ opacity: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "15px 18px", background: DEEP.bg, color: "#fff", flexShrink: 0 }}>
            <div>
              <div style={{ ...fontMono, fontSize: "0.54rem", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.62 }}>{h.resultLabel}</div>
              <div style={{ marginTop: 2, fontSize: "0.98rem", fontWeight: 700 }}>{h.resultTitle}</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, textAlign: "right", flexShrink: 0 }}>
              <ScoreCell label={h.scoreLabel}><span style={{ ...fontMono, fontSize: "1.4rem", fontWeight: 700 }}>{h.scoreVal}<span style={{ fontSize: "0.66rem", opacity: 0.6 }}>{h.scoreMax}</span></span></ScoreCell>
              <ScoreCell label={h.gradeLabel}><span style={{ ...fontMono, display: "inline-block", borderRadius: 8, padding: "0 8px", fontSize: "1.28rem", fontWeight: 700, background: L.ok, color: "#fff" }}>{h.gradeVal}</span></ScoreCell>
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <div className="ac-body" data-ac="body" style={{ padding: "0 18px" }}>
              {/* criterios */}
              <div data-ac-anchor="secCrit" style={{ padding: "16px 0 6px" }}>
                <SectionHead>{h.critHeading}</SectionHead>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {h.crit.map((cr, i) => (
                    <div key={cr.l}>
                      {i === 2 && <span data-ac-anchor="crit2" />}
                      <CritCard cr={cr} />
                    </div>
                  ))}
                </div>
              </div>

              {/* global + fortalezas/áreas */}
              <div data-ac-anchor="secGlobal" style={{ padding: "8px 0" }}>
                <div style={{ borderRadius: 13, padding: "13px 14px", background: L.bg2, marginBottom: 10 }}>
                  <Mono>{h.globalLabel}</Mono>
                  <p style={{ margin: 0, fontSize: "0.73rem", lineHeight: 1.6, color: L.ink }}>{h.global}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <SideCard accent={L.ok} label={h.strengthsLabel} body={h.strengths} />
                  <SideCard accent={L.primary} label={h.areasLabel} body={h.areas} />
                </div>
              </div>

              {/* CTA feedback completo */}
              <div data-ac-anchor="secCTA" style={{ padding: "14px 0" }}>
                <div style={{ border: `1px dashed ${L.primary}`, borderRadius: 14, background: L.primary + "0a", padding: 16, textAlign: "center" }}>
                  <div style={{ ...fontMono, fontSize: "0.52rem", textTransform: "uppercase", letterSpacing: "0.16em", color: L.primary, marginBottom: 7 }}>{h.ctaChip}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: L.ink, marginBottom: 4 }}>{h.ctaTitle}</div>
                  <div style={{ fontSize: "0.66rem", color: L.muted, marginBottom: 13 }}>{h.ctaSub}</div>
                  <span className="ac-btn" data-ac="fbBtn" style={pillBtn(0.78)}>✦ {h.fbBtn}</span>
                </div>
              </div>

              {/* GATED */}
              <div className="ac-lock" data-ac="lock">
                {/* anotada */}
                <div data-ac-anchor="secAnnot" style={{ padding: "8px 0", position: "relative" }}>
                  <SectionHead>{h.annotHeading}</SectionHead>
                  {h.annot.map((para, pi) => (
                    <p key={pi} style={{ ...serif(0.72, 1.95), margin: pi ? "12px 0 0" : 0, color: "#2A2E3A" }}>
                      {para.map((seg, si) =>
                        "h" in seg ? (
                          <span key={si} className="ac-hl" style={{ ["--on-bg" as string]: critTint(seg.c), ["--on-bd" as string]: CRIT[seg.c] }}>{seg.h}</span>
                        ) : (
                          <span key={si}>{seg.t}</span>
                        ),
                      )}
                    </p>
                  ))}
                  <span data-ac-anchor="annot3" />
                  <div className="ac-pop" data-ac="pop" style={{ position: "absolute", left: 8, right: 8, top: 54, background: "#fff", border: `1px solid ${L.line}`, borderRadius: 13, padding: "12px 14px", zIndex: 5, transform: "translateY(8px)", boxShadow: "0 22px 50px -16px rgba(15,23,42,.36)" }}>
                    <div style={{ ...fontMono, fontSize: "0.52rem", letterSpacing: "0.12em", textTransform: "uppercase", color: CRIT.D, fontWeight: 600, marginBottom: 5 }}>{h.pop.kicker}</div>
                    <div style={{ fontSize: "0.68rem", lineHeight: 1.5, color: L.muted }}>{h.pop.body}</div>
                    <div style={{ marginTop: 6, fontSize: "0.72rem", fontWeight: 600, color: L.ok }}>→ {h.pop.fix}</div>
                  </div>
                </div>

                {/* lenguaje */}
                <div data-ac-anchor="secLang" style={{ padding: "10px 0" }}>
                  <SectionHead>{h.langHeading}</SectionHead>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {h.lang.map((d, i) => (
                      <LangCard key={i} d={d} />
                    ))}
                  </div>
                </div>

                {/* ensayo banda alta */}
                <div data-ac-anchor="secEssay" style={{ padding: "10px 0 22px" }}>
                  <SectionHead>{h.essayHeading}</SectionHead>
                  <div style={{ fontSize: "0.66rem", color: L.muted, marginBottom: 11 }}>{h.essaySub}</div>
                  <div style={{ borderLeft: `3px solid ${L.ok}`, background: "rgba(21,128,61,0.07)", borderRadius: 11, padding: "13px 15px" }}>
                    {h.essay.map((p, i) => (
                      <p key={i} style={{ ...serif(0.72, 1.72), margin: i ? "0 0 9px" : "0 0 9px", color: L.ink }}>
                        {i === 1 && <span data-ac-anchor="essay2" />}
                        {i === 2 && <span data-ac-anchor="essay3" />}
                        {p}
                      </p>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                    {h.chips.map((ch) => (
                      <span key={ch.c} style={{ ...fontMono, fontSize: "0.56rem", fontWeight: 600, background: CRIT[ch.c] + "14", color: CRIT[ch.c], borderRadius: 9999, padding: "4px 10px" }}>{ch.t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Añadir los sub-helpers de presentación y la función `runHeroLoop`**

Al final del archivo (debajo del componente), añade los helpers y la máquina de estados. `serif`/`Mono`/`Panel`/`ScoreCell`/`SectionHead`/`CritCard`/`SideCard`/`LangCard`/`pillBtn` son helpers locales; `runHeroLoop` porta el `steps[]` del mockup usando data-attributes y refs, con pausa offscreen + visibilitychange + estático en reduced-motion/móvil.

```tsx
import { type CSSProperties, type ReactNode } from "react";
const fontSerif: CSSProperties = { fontFamily: "'Libre Baskerville', Georgia, serif" };
const serif = (rem: number, lh: number): CSSProperties => ({ ...fontSerif, margin: 0, fontSize: `${rem}rem`, lineHeight: lh, color: "#3A3E48" });
function Mono({ children }: { children: ReactNode }) {
  return <div style={{ ...fontMono, fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.14em", color: L.muted, marginBottom: 6 }}>{children}</div>;
}
function SectionHead({ children }: { children: ReactNode }) {
  return <div style={{ ...fontMono, fontSize: "0.54rem", textTransform: "uppercase", letterSpacing: "0.16em", color: L.primary, marginBottom: 11 }}>{children}</div>;
}
function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Mono>{label}</Mono>
      <div style={{ flex: 1, border: `1px solid ${L.line}`, borderRadius: 11, background: "#FBFAF7", padding: "11px 12px", overflow: "hidden" }}>{children}</div>
    </div>
  );
}
function ScoreCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ ...fontMono, fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 1, lineHeight: 1 }}>{children}</div>
    </div>
  );
}
function CritCard({ cr }: { cr: LandingCopy["heroLoop"]["crit"][number] }) {
  const color = CRIT[cr.l];
  return (
    <div style={{ border: `1px solid ${L.line}`, borderRadius: 13, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...fontMono, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, background: color + "22", color }}>{cr.l}</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: L.ink }}>{cr.n}</span>
        </span>
        <span style={{ ...fontMono, fontSize: "0.98rem", fontWeight: 700, color }}>{cr.s}<span style={{ fontSize: "0.58rem", fontWeight: 400, color: L.muted }}>/{cr.max}</span></span>
      </div>
      <div style={{ height: 4, borderRadius: 9, background: L.line, overflow: "hidden" }}>
        <div className="ac-fillbar" style={{ height: "100%", width: `${(cr.s / cr.max) * 100}%`, background: color, borderRadius: 9 }} />
      </div>
      <p style={{ margin: "9px 0 0", fontSize: "0.68rem", lineHeight: 1.5, color: L.muted }}>{cr.comment}</p>
    </div>
  );
}
function SideCard({ accent, label, body }: { accent: string; label: string; body: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, borderRadius: 10, background: "#fff", border: `1px solid ${L.line}`, padding: "11px 12px" }}>
      <div style={{ ...fontMono, fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.13em", color: accent, marginBottom: 5 }}>{label}</div>
      <p style={{ margin: 0, fontSize: "0.67rem", lineHeight: 1.5, color: L.muted }}>{body}</p>
    </div>
  );
}
function LangCard({ d }: { d: LandingCopy["heroLoop"]["lang"][number] }) {
  const verb = d.kind === "verb";
  return (
    <div style={{ background: verb ? "#FBF6EC" : "#FCF1F3", border: `1px solid ${verb ? "#EADFC8" : "#F3D6DD"}`, borderRadius: 11, padding: "10px 12px" }}>
      <span style={{ ...fontMono, display: "inline-block", background: verb ? L.amber + "22" : CRIT.D + "18", color: verb ? L.amberDeep : CRIT.D, borderRadius: 7, padding: "1px 8px", fontSize: "0.62rem", fontWeight: 600, marginBottom: 5 }}>{d.tag}</span>
      <div style={{ fontSize: "0.68rem", color: "#9aa1ad", textDecoration: "line-through" }}>{d.from}</div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: L.ok, marginTop: 1 }}>{d.to}</div>
    </div>
  );
}
function pillBtn(rem = 0.8): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 13, background: L.primary, color: "#fff", padding: "11px 20px", fontSize: `${rem}rem`, fontWeight: 700, boxShadow: "0 8px 20px -8px rgba(79,70,229,.55)" };
}

function runHeroLoop(card: HTMLDivElement | null, reduce: boolean): (() => void) | void {
  if (!card) return;
  const q = (s: string) => card.querySelector(s) as HTMLElement | null;
  const input = q('[data-ac="input"]')!, result = q('[data-ac="result"]')!, body = q('[data-ac="body"]')!;
  const cursor = q('[data-ac="cursor"]')!, evalBtn = q('[data-ac="evalBtn"]')!, fbBtn = q('[data-ac="fbBtn"]')!;
  const pop = q('[data-ac="pop"]')!, lock = q('[data-ac="lock"]')!;
  const anaInner = q('[data-ac="anaInner"]')!, anaBox = q('[data-ac="anaBox"]')!;
  const hls = Array.from(card.querySelectorAll<HTMLElement>(".ac-hl"));
  const fills = Array.from(card.querySelectorAll<HTMLElement>(".ac-fillbar"));
  const anchor = (n: string) => card.querySelector<HTMLElement>(`[data-ac-anchor="${n}"]`);

  const cursorTo = (t: HTMLElement | null, sc = 1) => {
    if (!t) { cursor.style.opacity = "0"; return; }
    const c = card.getBoundingClientRect(), r = t.getBoundingClientRect();
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${r.left - c.left + r.width * 0.5 - 4}px,${r.top - c.top + r.height * 0.5 - 2}px) scale(${sc})`;
  };
  const scrollTo = (name: string) => {
    const s = anchor(name); if (!s) return;
    const vp = body.parentElement!;
    let d = s.getBoundingClientRect().top - body.getBoundingClientRect().top;
    const maxS = body.scrollHeight - vp.clientHeight;
    if (d > maxS) d = maxS; if (d < 0) d = 0;
    body.style.transform = `translateY(${-d}px)`;
  };
  const press = (b: HTMLElement) => { b.classList.add("pressed"); setTimeout(() => b.classList.remove("pressed"), 520); };
  const panAna = () => { const amt = anaInner.scrollHeight - anaBox.clientHeight; if (amt > 0) anaInner.style.transform = `translateY(${-amt}px)`; };
  const openLock = () => { lock.style.maxHeight = "6000px"; lock.style.opacity = "1"; };
  const reset = () => {
    result.style.opacity = "0"; input.style.opacity = "1";
    body.style.transition = "none"; body.style.transform = "translateY(0)";
    anaInner.style.transition = "none"; anaInner.style.transform = "translateY(0)";
    void body.offsetWidth; body.style.transition = ""; anaInner.style.transition = "";
    lock.style.maxHeight = "0px"; lock.style.opacity = "0";
    hls.forEach((x) => x.classList.remove("on")); fills.forEach((f) => f.classList.remove("on"));
    pop.classList.remove("show"); cursor.style.opacity = "0";
    cursor.style.transform = "translate(232px,150px) scale(1)";
  };
  const renderStatic = () => {
    input.style.opacity = "0"; result.style.opacity = "1";
    openLock(); fills.forEach((f) => f.classList.add("on")); hls.forEach((x) => x.classList.add("on"));
    body.style.transform = "translateY(0)"; cursor.style.opacity = "0";
  };

  // móvil o reduced-motion → estático, sin rAF.
  const desktop = window.matchMedia("(min-width:1024px)").matches;
  if (reduce || !desktop) { renderStatic(); return; }

  const steps: { t: number; fn: () => void }[] = [
    { t: 0, fn: reset },
    { t: 600, fn: panAna },
    { t: 2600, fn: () => cursorTo(evalBtn) },
    { t: 3400, fn: () => { cursorTo(evalBtn, 0.82); press(evalBtn); } },
    { t: 3900, fn: () => { input.style.opacity = "0"; result.style.opacity = "1"; cursor.style.opacity = "0"; scrollTo("secCrit"); fills.forEach((f, i) => setTimeout(() => f.classList.add("on"), 250 + i * 150)); } },
    { t: 5600, fn: () => scrollTo("crit2") },
    { t: 7000, fn: () => scrollTo("secGlobal") },
    { t: 8400, fn: () => scrollTo("secCTA") },
    { t: 9100, fn: () => cursorTo(fbBtn) },
    { t: 9900, fn: () => { cursorTo(fbBtn, 0.82); press(fbBtn); openLock(); } },
    { t: 10700, fn: () => { cursor.style.opacity = "0"; scrollTo("secAnnot"); hls.forEach((x, i) => setTimeout(() => x.classList.add("on"), i * 170)); } },
    { t: 12000, fn: () => pop.classList.add("show") },
    { t: 13500, fn: () => { pop.classList.remove("show"); scrollTo("annot3"); } },
    { t: 14900, fn: () => scrollTo("secLang") },
    { t: 16500, fn: () => scrollTo("secEssay") },
    { t: 18500, fn: () => scrollTo("essay2") },
    { t: 20300, fn: () => scrollTo("essay3") },
    { t: 22400, fn: () => { result.style.opacity = "0"; anaInner.style.transition = "none"; anaInner.style.transform = "translateY(0)"; void anaInner.offsetWidth; anaInner.style.transition = ""; input.style.opacity = "1"; } },
  ];

  let raf = 0, last = -1, t0 = 0, running = false, visible = false;
  const frame = (now: number) => {
    const t = (now - t0) % LOOP; let idx = 0;
    for (let i = 0; i < steps.length; i++) if (t >= steps[i].t) idx = i;
    if (idx !== last) { last = idx; try { steps[idx].fn(); } catch { /* noop */ } }
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running) return; running = true; last = -1; t0 = performance.now(); reset(); raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); }, { threshold: 0.2 });
  io.observe(card);
  const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
  document.addEventListener("visibilitychange", onVis);

  return () => { stop(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
}
```

> Nota: el `import { type CSSProperties, type ReactNode }` y `import { useEffect, useRef }` deben consolidarse en una sola línea de import de `react` al principio del archivo (no dos imports `react`). Ajusta el Step 1 para incluir `useEffect, useRef` y los `type` juntos.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. Errores probables y fix:
- "Cannot find name 'LandingCopy'": confirma `export type LandingCopy = typeof COPY.es;` en `LandingPage.tsx` (Task 1).
- Custom CSS vars (`["--on-bg"]`): el cast `as string` en la key ya está; si TS se queja del objeto style, mantén el patrón `{ ["--on-bg" as string]: value }`.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: PASS. Si eslint marca `react-hooks/exhaustive-deps` por `runHeroLoop`, está bien: la dependencia real es `[reduce]` y `runHeroLoop` es una función module-scope estable; si el linter exige incluirla, añádela a deps (es estable, no recrea efecto).

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/HeroLoop.tsx
git commit -m "feat(landing): tarjeta animada del héroe (HeroLoop)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Crear `CorrectionTiers.tsx` (sección "dos partes")

**Files:**
- Create: `src/components/landing/CorrectionTiers.tsx`

**Interfaces:**
- Consumes: `c.tiers2` (Task 1); `Reveal` de `@/components/landing/Reveal`; tokens `L`, `cardShadow`, `fontMono`; tipo `LandingCopy`.
- Produces: `export function CorrectionTiers({ c }: { c: LandingCopy }): JSX.Element`.

- [ ] **Step 1: Crear el componente**

```tsx
import {
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
} from "@/lib/landing-theme";
import { Reveal } from "@/components/landing/Reveal";
import type { LandingCopy } from "@/components/LandingPage";
import { Check } from "lucide-react";

export function CorrectionTiers({ c }: { c: LandingCopy }) {
  const t = c.tiers2;
  return (
    <section style={{ padding: "72px 24px", backgroundColor: L.bg }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <Reveal>
          <div style={{ ...fontMono, fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: L.primary, marginBottom: 12 }}>{t.kicker}</div>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 8px", maxWidth: "30rem", color: L.ink }}>{t.title}</h2>
          <p style={{ fontSize: "1.02rem", lineHeight: 1.6, color: L.muted, maxWidth: "38rem", margin: "0 0 36px" }}>{t.sub}</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          <Reveal>
            <TierCard accent={L.ok} tag={t.base.tag} price={t.base.price} title={t.base.title} points={t.base.points} />
          </Reveal>
          <Reveal delay={100}>
            <TierCard accent={L.primary} tag={t.full.tag} price={t.full.price} title={t.full.title} points={t.full.points} badge={t.full.badge} featured />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TierCard({ accent, tag, price, title, points, badge, featured }: {
  accent: string; tag: string; price: string; title: string; points: string[]; badge?: string; featured?: boolean;
}) {
  return (
    <div className="lib-card" style={{ position: "relative", overflow: "hidden", borderRadius: 20, background: L.surface, border: `1px solid ${featured ? L.primary : L.line}`, boxShadow: featured ? "0 24px 50px -26px rgba(79,70,229,0.4)" : cardShadow, padding: 28 }}>
      {badge && (
        <div style={{ position: "absolute", top: 0, right: 0, background: L.primary, color: "#fff", fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", padding: "5px 14px", borderBottomLeftRadius: 12 }}>{badge}</div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ ...fontMono, fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: accent }}>{tag}</div>
        <span style={{ ...fontMono, fontSize: "0.92rem", fontWeight: 600, background: accent + "14", color: accent, borderRadius: 9, padding: "4px 10px", whiteSpace: "nowrap" }}>{price}</span>
      </div>
      <h3 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.01em", color: L.ink }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {points.map((p) => (
          <span key={p} style={{ display: "flex", gap: 10, fontSize: "0.92rem", lineHeight: 1.45, color: L.ink }}>
            <Check className="h-4 w-4 shrink-0" style={{ color: accent, marginTop: 2 }} aria-hidden />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/CorrectionTiers.tsx
git commit -m "feat(landing): sección 'cada corrección en dos partes'

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Integrar en `LandingPage.tsx` y eliminar lo obsoleto

**Files:**
- Modify: `src/components/LandingPage.tsx`

**Interfaces:**
- Consumes: `HeroLoop` (Task 2), `CorrectionTiers` (Task 3), ambos tipados con `LandingCopy`.

- [ ] **Step 1: Importar los componentes nuevos**

Añade a los imports de `LandingPage.tsx` (junto a `OralPreview`/`Reveal`):

```tsx
import { HeroLoop } from "@/components/landing/HeroLoop";
import { CorrectionTiers } from "@/components/landing/CorrectionTiers";
```

- [ ] **Step 2: Reemplazar la tarjeta del héroe**

En el bloque "right: examiner readout" (~líneas 2122–2132), sustituye:

```tsx
            <motion.div
              className="flex justify-center lg:justify-end"
              initial={{ opacity: 0, x: reduce ? 0 : 30, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <Tilt>
                <ExaminerSheet c={c} />
              </Tilt>
            </motion.div>
```

por:

```tsx
            <motion.div
              className="flex w-full justify-center lg:justify-end"
              initial={{ opacity: 0, x: reduce ? 0 : 30, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <HeroLoop c={c} reduce={!!reduce} />
            </motion.div>
```

- [ ] **Step 3: Insertar la sección "dos partes" tras el héroe**

Justo después del `</section>` del héroe (antes de `{/* ANNOTATED CORRECTION */}` / `<AnnotatedCorrection c={c} />`, ~línea 2136), inserta:

```tsx
        {/* CORRECTION TIERS — dos partes */}
        <CorrectionTiers c={c} />
```

- [ ] **Step 4: Eliminar `ExaminerSheet`, `Tilt` y el copy `sheet`**

- Borra la función `ExaminerSheet` (desde `function ExaminerSheet({ c }...` hasta su `}` de cierre, ~líneas 1050–1318; verifica el rango exacto antes de borrar).
- Borra la función `Tilt` (~líneas 1604–1642; verifica el rango).
- Borra la propiedad `sheet: { … }` de `COPY.es` y de `COPY_EN`.
- Si quedan imports sin uso tras borrar (p. ej. `useMotionValue` solo lo usaba `Tilt`), elimínalos. Confirma con grep antes:

```bash
rg -n "useMotionValue|<Tilt|ExaminerSheet|\.sheet\b|c\.sheet|s\.tier" src/components/LandingPage.tsx
```
Expected: sin coincidencias salvo, como mucho, una definición de import que ya no se usa (elimínala).

- [ ] **Step 5: Type-check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS los tres. Errores típicos:
- "'useMotionValue' is declared but never read" → borra el import.
- "Property 'sheet' does not exist" → quedó una referencia a `c.sheet`; elimínala (ya no existe la tarjeta estática).

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): héroe animado + dos partes; retira ExaminerSheet

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Verificación visual y de accesibilidad

**Files:** (sin cambios de código salvo fixes que surjan)

- [ ] **Step 1: Arrancar la app y capturar el héroe en 3 estados**

Usa la skill `run` (o `playwright-skill`) para `vite dev` y capturar:
- Desktop ES (≥1024px): la tarjeta debe animar el loop (input → result → gated).
- Desktop EN: cambia a EN y confirma que el card muestra el ejemplo del faro en inglés.
- Móvil (≤480px): la tarjeta debe mostrar el **resultado estático completo** (sin cursor, lock abierto), no el loop.
- `prefers-reduced-motion`: emula la media query y confirma resultado estático.

Verifica también que la sección "Cada corrección, en dos partes" aparece **entre** el héroe y la corrección anotada, con las dos tarjetas (1,50 € / +2,00 €).

- [ ] **Step 2: Auditoría de accesibilidad**

Usa la skill `accesslint` (scan/audit) sobre la landing en `vite dev`.
Expected: sin violaciones nuevas introducidas por el héroe. La demo va `aria-hidden`, así que no debe aportar nodos interactivos ni texto al árbol accesible; el CTA real "Corregir mi texto" sigue siendo el único botón del héroe.
Si aparece una violación nueva (p. ej. contraste en un chip), corrígela y re-audita.

- [ ] **Step 3: Confirmar que no hay regresión de consola/perf**

Con la app abierta, scrollea fuera del héroe y confirma (DevTools Performance o logs) que el `requestAnimationFrame` se detiene (IntersectionObserver) y se reanuda al volver. Cambia de pestaña y confirma que para con `visibilitychange`.

- [ ] **Step 4: Commit final (si hubo fixes)**

```bash
git add -A
git commit -m "fix(landing): ajustes de verificación visual/a11y del héroe animado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (cobertura del spec)

- **Reemplazar ExaminerSheet por animada** → Task 2 (crea) + Task 4 (sustituye + borra). ✔
- **Traducir todo a EN, ejemplo del faro** → Copy Appendix EN + Task 1. ✔
- **Sección "dos partes", ubicación tras héroe** → Task 3 + Task 4 Step 3. ✔
- **No usar la acacia; banda media 12/20** → Copy Appendix (scoreVal 12, gradeVal 5). ✔
- **Pausa offscreen + visibilitychange + reduced-motion + móvil estático** → Task 2 Step 3 (`runHeroLoop`). ✔
- **Cleanup en unmount** → return del `useEffect`/`runHeroLoop`. ✔
- **Accesibilidad (demo aria-hidden, botones falsos no enfocables)** → Task 2 Step 2 (`aria-hidden`, `<span>` no `<button>`) + Task 5 Step 2. ✔
- **CSS `.ac-*` co-localizado** → Task 2 Step 1 (`AC_CSS`). ✔
- **Verificación tsc/lint/build + visual + accesslint** → presente en cada task y Task 5. ✔
- **Sin paquetes nuevos / tokens existentes** → imports solo de `landing-theme` y `lucide-react` (ya presentes). ✔
