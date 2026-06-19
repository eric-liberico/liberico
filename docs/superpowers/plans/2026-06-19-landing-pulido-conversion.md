# Landing — Pulido visual + conversión · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar la ejecución visual y la conversión de la landing pública conservando la identidad editorial (serif + navy + crema), sin rediseño ni refactor masivo.

**Architecture:** Cambios localizados en `src/components/LandingPage.tsx` (monolito ~3101 líneas). Solo se extrae a componente nuevo lo que se reworkea de fondo (el avatar → `src/components/landing/OralPreview.tsx`); el resto se edita in situ por ser cambios contenidos y de menor riesgo que extraer. La "prueba" de cada tarea es una comparación de capturas antes/después más typecheck/lint/build en verde (es trabajo visual; el componente no tiene tests unitarios y añadir un framework está fuera de alcance).

**Tech Stack:** React + TS estricto, framer-motion, lucide-react, Tailwind, estilos inline con tokens locales `L`/`DEEP`/`CRIT`. TanStack Router (`<Link to="/login">`). Capturas vía Playwright (`/tmp/playwright-test-landing.js`).

## Global Constraints

- TypeScript estricto: añadir claves de copy en **ambos** objetos `COPY` (es) y `COPY_EN` o no compila (`COPY_EN: typeof COPY.es`).
- Acción primaria = índigo `L.primary` (`#4F46E5`). Ámbar `L.amber` = solo marca/decoración (logo, gradientes, glows, eyebrows). Ningún botón de acción en ámbar.
- Colores de criterio (`CRIT.A/B/C/D`) solo dentro de contextos de evaluación/criterios.
- Respetar `prefers-reduced-motion` (ya implementado vía `useReducedMotion()` / `prefersReducedMotion()`); no romper los guards.
- No tocar: `DashboardPage` (`src/routes/index.tsx`), Edge Functions, backend, copy IB verbatim.
- Trabajar en rama `feat/landing-pulido-conversion`. Commits frecuentes, uno por tarea.
- Checks por tarea: `npx tsc --noEmit`, `npm run lint`, `npm run build`. Capturas con dev server en `http://localhost:8080/`.
- **UT6 (idioma por defecto) NO genera tarea:** `getInitialLang()` (líneas 81-90) ya hace fallback a `es` salvo navegador `en-*`. El requisito del spec ya está satisfecho; documentado aquí para trazabilidad.

## File Structure

- **Modify** `src/components/LandingPage.tsx`:
  - CTA final y tier destacado de precios: ámbar → índigo (Task 1).
  - Hero: bloque `c.pillars` (cards) → franja de confianza fina (Task 2).
  - Sección `{/* ORAL AVATAR */}` (línea 2868-2869): `<OralAvatar/>` → `<OralPreview/>`; eliminar defs muertas `AvatarFace` (1685-1743) y `OralAvatar` (1744-1990) (Task 3).
  - Orden de secciones: subir `<AnnotatedCorrection c={c} />` (2658-2659) a justo tras el hero; añadir CTA intermedio (Task 4).
- **Create** `src/components/landing/OralPreview.tsx`: tarjeta-preview estática y fiel de la sesión oral (Task 3).
- **Reuse (no editar)** `/tmp/playwright-test-landing.js`: harness de capturas (escritorio 1440 + móvil 390, con scroll para disparar `Reveal`).

---

### Task 1: Disciplina de acción/color (CTA único índigo) — UT1 + UT3

**Files:**
- Modify: `src/components/LandingPage.tsx` (final CTA ~2990-2997; pricing tier ~2751-2780; comentario de tokens ~50-51)

**Interfaces:**
- Consumes: tokens `L.primary`, `L.amber`, `ctaPrimary` (def. ~2284-2288).
- Produces: ningún botón de acción en ámbar; regla de acentos documentada inline.

- [ ] **Step 1: Capturar estado "antes"**

Run: `cd /Users/erickvist/.claude/plugins/cache/playwright-skill/playwright-skill/4.1.0/skills/playwright-skill && node run.js /tmp/playwright-test-landing.js`
Renombrar las salidas a `/tmp/landing-desktop-before.png` y `/tmp/landing-mobile-before.png`.

- [ ] **Step 2: CTA final → índigo** (sección `{/* FINAL CTA */}`, ~2990-2997)

Reemplazar el `style` del `<Link to="/login">` del CTA final:

```tsx
style={{
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 36px -14px rgba(79,70,229,0.7)",
}}
```

Y en el párrafo `{c.teacher}` (~3008-3013), cambiar el enlace subrayado `style={{ color: L.amber }}` → `style={{ color: "#C7D2FE" }}` (índigo claro legible sobre banda navy `DEEP.bg`).

- [ ] **Step 3: Tier destacado de precios → índigo** (~2751-2780)

- Borde de la tarjeta destacada (2751): `border: \`1px solid ${tier.feat ? L.amber : L.line}\`` → usar `L.primary` en vez de `L.amber`.
- Sombra (2752): `tier.feat ? "0 18px 40px -20px rgba(232,161,58,0.5)"` → `"0 18px 40px -20px rgba(79,70,229,0.5)"`.
- Label (2763): `color: tier.feat ? L.amberDeep : L.muted` → `tier.feat ? L.primary : L.muted`.
- Botón (2776-2779): la rama `tier.feat` `{ backgroundColor: L.amber, color: "#1A1206" }` → `{ backgroundColor: L.primary, color: "#fff" }` (queda idéntico a la rama no-feat; simplificar a `style={ctaPrimary}` para ambas).

- [ ] **Step 4: Documentar la regla de acentos** (comentario en tokens, ~50-51)

Actualizar el comentario junto a `primary`/`amber` para que diga explícitamente: índigo = única acción primaria (CTAs); ámbar = solo marca/decoración (logo, gradientes underline/scroll, glows, eyebrows de autoridad). No usar `CRIT.*` fuera de evaluación/criterios.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 6: Capturar "después" y comparar**

Run el harness de nuevo; verificar visualmente que el CTA final y el tier destacado son índigo, sin ámbar de acción; el logo, el underline del hero y los glows siguen con ámbar. Sin errores de consola.

- [ ] **Step 7: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): unificar CTA a índigo; ámbar solo como marca (UT1/UT3)"
```

---

### Task 2: Franja de confianza del hero — UT2

**Files:**
- Modify: `src/components/LandingPage.tsx` (bloque `{/* pillars */}` ~2489-2524)

**Interfaces:**
- Consumes: `c.pillars` (array `{ t, d }`), `PILLAR_ACCENT`, tokens `L`.
- Produces: una franja horizontal compacta; el CTA + precio del hero ganan aire vertical.

- [ ] **Step 1: Reemplazar las 3 cards por una franja fina** (~2489-2524)

Sustituir el bloque `{/* pillars */}` por una fila compacta icono + texto corto (reutiliza `c.pillars[i].t` como etiqueta breve; descarta `d` en el hero para reducir densidad). No añade claves de copy nuevas.

```tsx
{/* trust strip */}
<motion.div
  variants={heroItem}
  className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
>
  {c.pillars.map((p, i) => (
    <span key={i} className="inline-flex items-center gap-2 text-[0.82rem] font-medium" style={{ color: L.ink }}>
      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: L.primary }} aria-hidden />
      {p.t}
    </span>
  ))}
</motion.div>
```

(`Check` ya está importado de lucide-react. `PILLAR_ACCENT` queda sin uso en el hero; si no se usa en ningún otro sitio, eliminar su definición en ~2206 para evitar variable muerta — verificar con `rg "PILLAR_ACCENT" src/components/LandingPage.tsx`.)

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: sin errores ni warnings de variable sin uso.

- [ ] **Step 3: Capturar y comparar (escritorio + móvil)**

Verificar que la franja ocupa una sola fila en escritorio y se apila limpia en móvil; el CTA + precio respiran; nada se solapa.

- [ ] **Step 4: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): franja de confianza fina en el hero (UT2)"
```

---

### Task 3: OralPreview — preview real del oral + reducir banda navy — UT4

**Files:**
- Create: `src/components/landing/OralPreview.tsx`
- Modify: `src/components/LandingPage.tsx` (uso ~2868-2869; eliminar defs muertas `AvatarFace` 1685-1743 y `OralAvatar` 1744-1990; imports)

**Interfaces:**
- Consumes: el objeto de copy `c` (mismas claves del oral que ya recibía `OralAvatar`), `reduce: boolean | null`.
- Produces: `export function OralPreview({ c, reduce }: { c: typeof COPY.es; reduce: boolean | null })` — sección autocontenida con fondo claro.

- [ ] **Step 1: Leer la fuente de fidelidad**

Leer `src/components/AvatarProfesorVideo.tsx` y la def actual de `OralAvatar` (1744-1990) para identificar (a) las claves de copy del oral usadas, (b) el lenguaje visual del avatar real (frame redondeado oscuro, indicador de "hablando", transcripción). El preview debe **parecerse al producto real**, no a la caricatura.

- [ ] **Step 2: Crear `OralPreview.tsx`**

Tarjeta estática con el mismo lenguaje visual que `ExaminerSheet` (superficie blanca, sombra `cardShadow`, bordes `L.line`): un "frame" de videollamada redondeado oscuro con el avatar (still/representación fiel, sin la cara de dibujo), un chip "● En directo / Live" sutil, y 2-3 líneas de transcripción reales tomadas de las claves de copy del oral. Indicador de "hablando" estático o con animación que respete `reduce`. Importar tokens compartidos desde `LandingPage` o duplicar los mínimos necesarios (`L`, `cardShadow`) — preferir exportarlos si ya no lo están; si no, definir un objeto local mínimo idéntico. Sección con `style={{ backgroundColor: L.bg2 }}` (claro), **no** navy, para bajar las bandas navy a 2 (autoridad + CTA final).

- [ ] **Step 3: Sustituir el uso y borrar el código muerto** (`LandingPage.tsx`)

- Reemplazar `<OralAvatar c={c} reduce={reduce} />` (2869) por `<OralPreview c={c} reduce={reduce} />`.
- Añadir el import: `import { OralPreview } from "@/components/landing/OralPreview";`.
- Eliminar las definiciones de `AvatarFace` (1685-1743) y `OralAvatar` (1744-1990).
- Tras borrar, ejecutar `rg "AvatarFace|OralAvatar|Volume2|Mic" src/components/LandingPage.tsx` y retirar imports de lucide-react que queden sin uso (p. ej. `Volume2`, `Mic` si solo los usaba el avatar).

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: sin errores; sin imports/variables sin uso.

- [ ] **Step 5: Capturar y comparar**

Verificar que la sección ya no muestra caricatura, se lee como "producto real", el fondo es claro, y quedan exactamente 2 bandas navy en la página (autoridad + CTA final). Respeta `prefers-reduced-motion`.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/OralPreview.tsx src/components/LandingPage.tsx
git commit -m "feat(landing): sustituir caricatura del oral por preview real del producto (UT4)"
```

---

### Task 4: Front-load de prueba + CTA intermedio — UT5

**Files:**
- Modify: `src/components/LandingPage.tsx` (mover `<AnnotatedCorrection/>` 2658-2659; añadir CTA intermedio)

**Interfaces:**
- Consumes: `<AnnotatedCorrection c={c} />`, `ctaPrimary`, `c.cta`.
- Produces: orden Hero → Corrección anotada → Autoridad → Cómo funciona → … ; un CTA visible a media página.

- [ ] **Step 1: Subir la corrección anotada tras el hero**

Mover la línea `<AnnotatedCorrection c={c} />` (con su comentario `{/* ANNOTATED CORRECTION */}`, 2658-2659) a justo después del cierre `</section>` del HERO (~2539) y antes de `{/* AUTHORITY */}`. Es un componente autocontenido: el movimiento es de 2 líneas y no afecta a los anchors del nav (`how`/`pricing`/`courses`/`faq` permanecen en sus secciones).

- [ ] **Step 2: Añadir CTA intermedio tras la corrección anotada**

Insertar, inmediatamente después de `<AnnotatedCorrection c={c} />` en su nueva posición, una banda clara compacta con un único CTA índigo (reutiliza `c.cta` y `ctaPrimary`; sin claves de copy nuevas):

```tsx
{/* MID CTA */}
<section className="px-6 py-14 text-center" style={{ backgroundColor: L.bg }}>
  <Link
    to="/login"
    className="lib-press group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold uppercase tracking-[0.07em]"
    style={ctaPrimary}
  >
    {c.cta}
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  </Link>
</section>
```

- [ ] **Step 3: Verificar reveals y anchors**

Confirmar que `<AnnotatedCorrection/>` sigue revelándose (usa su propio IntersectionObserver), y que el nav (`how`, `pricing`, `courses`, `faq`) navega correctamente a sus secciones tras el reorden.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 5: Capturar página completa (escritorio + móvil) y comparar**

Verificar nuevo orden, CTA intermedio visible antes del final, página más corta, scroll-spy del nav intacto.

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat(landing): front-load de la corrección anotada + CTA intermedio (UT5)"
```

---

## Cierre

- [ ] **Verificación final:** `npx tsc --noEmit && npm run lint && npm run build` en verde; capturas escritorio+móvil antes/después adjuntas; sin errores de consola; CTAs navegan a `/login`; toggle ES/EN intacto; `prefers-reduced-motion` respetado.
- [ ] **Revisión de diff** por seguridad/secretos/copyright antes de abrir PR (no debe haber rúbricas IB verbatim ni assets de terceros).
- [ ] Decidir integración con la skill `superpowers:finishing-a-development-branch` (merge / PR).

## Self-review (cobertura del spec)

- UT1 (CTA único índigo) → Task 1 ✓
- UT2 (hero despejado) → Task 2 ✓
- UT3 (paleta contenida) → Task 1 (steps 2-4) ✓
- UT4 (avatar → preview real) → Task 3 ✓
- UT5 (reorden/recorte/CTA intermedio/menos navy) → Task 4 + Task 3 (banda navy) ✓; el "cortar 1 sección" se omite deliberadamente (YAGNI: no cortar contenido sin evidencia; el acortado real viene del reorden y de la franja del hero).
- UT6 (idioma) → sin tarea: ya satisfecho por `getInitialLang()` (documentado en Global Constraints).
