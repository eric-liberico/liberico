# Diseño — Pulido visual + optimización de conversión de la landing pública

**Fecha:** 2026-06-19
**Rama:** `feat/landing-pulido-conversion`
**Archivo principal:** `src/components/LandingPage.tsx` (~3101 líneas)
**Enfoque elegido:** A — pasada acotada de pulido + conversión, conservando la identidad editorial (serif + navy + crema).

## Objetivo

Elevar la ejecución visual de la landing pública y mejorar su conversión (registro / primer uso), sin rediseñar la identidad ni desbordar el alcance. Entregable en **un solo plan de implementación**, diff revisable.

## Fuera de alcance (no tocar)

- Refactor masivo del monolito (solo extracción quirúrgica de lo que se reworkea — ver Arquitectura).
- Dashboard logueado (`DashboardPage` en `src/routes/index.tsx`).
- Flujo real de evaluación / Edge Functions / backend.
- Copy de rúbricas o descriptores IB verbatim (parafrasear siempre).
- Nueva paleta o tipografía (se conserva la identidad).

## Estado actual (verificado por captura)

Landing renderizada en `http://localhost:8080/` para visitantes no autenticados. Orden actual de secciones:

1. Hero (headline + tarjeta "Examiner's evaluation" + CTA morado + precio + 3 mini-tarjetas)
2. Banda de autoridad (navy) — "Calibrado por quien pone las notas de corte"
3. Cómo funciona (3 pasos)
4. Demo de corrección anotada
5. Precios (navy) — pago por uso 1,50 € / +2 €
6. Cursos / asignaturas
7. Avatar "profesor virtual" (navy) — caricatura SVG animada (`AvatarFace`/`OralAvatar`)
8. Tabs de criterios (A/B/C/D)
9. FAQ
10. CTA final (ámbar) + footer

Hallazgos: CTA morado vs CTA final ámbar (inconsistencia); zona de decisión del hero recargada; avatar de baja fidelidad que choca con el tono premium; demasiados acentos de color simultáneos; página muy larga (~9000px escritorio / ~13000px móvil, 3-4 bandas navy); idioma por defecto = inglés en navegadores neutros/en-US.

## Decisiones tomadas

- **Color de acción primaria:** morado (`L.primary`). El ámbar queda reservado al logo.
- **Avatar:** sustituir la caricatura por una preview estática y fiel de la sesión oral real (mismo patrón "captura de producto" del hero).

## Unidades de trabajo

### UT1 — CTA unificado (morado)
Todas las acciones primarias usan `L.primary`: CTA del hero, CTA final (hoy ámbar → morado), botón `START` del nav, CTA intermedio nuevo (UT5). Acciones secundarias → estilo outline/ghost. Eliminar el uso de ámbar como color de acción. **Criterio de hecho:** no queda ningún botón de acción primaria en ámbar; un único color de CTA en toda la página.

### UT2 — Despejar la zona de decisión del hero
Reemplazar las 3 mini-tarjetas densas bajo el CTA por **una franja de confianza fina**: 3 ítems cortos icono + 2-3 palabras (*Calibrado por examinadores · Sin suscripción · Pago por uso*). Mantener la tarjeta "Examiner's evaluation" a la derecha. **Criterio de hecho:** el CTA y el precio tienen aire; la franja ocupa una sola fila en escritorio y se apila limpia en móvil.

### UT3 — Contener la paleta
Regla explícita de acentos, documentada inline cerca de los tokens (`L`, `CRIT`):
- **Morado** = acción primaria + acento de marca ("IB examiner").
- **Colores de criterio (A/B/C/D)** solo dentro de contextos de evaluación/criterios (tarjeta del examinador, tabs de criterios, corrección anotada).
- **Verde** del badge de nota se conserva (es elemento de producto real).
- Retirar acentos ámbar/otros incidentales fuera del logo.
**Criterio de hecho:** ningún color de criterio aparece como decoración fuera de su contexto.

### UT4 — Avatar → preview real del oral
Sustituir `AvatarFace`/`OralAvatar` (caricatura) por una **tarjeta-preview estática** que represente fielmente la sesión oral real (frame del avatar Simli/ElevenLabs + transcripción), con indicador sutil de "hablando". Reutilizar el lenguaje visual de la tarjeta del hero.
**Dependencia de asset:** producir la imagen/representación. Dado que el flujo real vive tras login/créditos, hay dos vías:
  - (a) screenshot puesto en escena del oral real, optimizado (webp), guardado en `public/`; o
  - (b) **(recomendada)** recreación estática fiel en JSX/CSS con los mismos estilos del componente real (`AvatarProfesorVideo.tsx`/`AvatarProfesor.tsx`), sin coste de captura ni acceso autenticado.
  El plan implementa (b) por defecto; solo cae a (a) si existe ya un screenshot limpio reutilizable.
**Criterio de hecho:** la sección ya no muestra caricatura; el elemento se lee como "producto real"; respeta `prefers-reduced-motion`.

### UT5 — Reordenar / recortar para mantener impulso
Reorden propuesto (a validar en revisión del spec; el plan lo fija):
1. Hero
2. **Demo de corrección anotada** (subir: prueba más fuerte primero)
3. Cómo funciona
4. Autoridad
5. Cursos
6. Precios
7. Preview del oral (UT4)
8. Criterios
9. FAQ
10. **CTA intermedio** tras la prueba (≈ tras secciones 2-3) + CTA final

Acciones: reducir bandas navy de ~4 a 2; fusionar o acortar la sección redundante (candidata: solape "cómo funciona" ↔ "criterios"); añadir un CTA intermedio.
**Criterio de hecho:** la página es más corta; hay un CTA visible antes del final; no más de 2 bandas navy a sangre.

### UT6 — Idioma por defecto (menor, opcional)
Cuando el idioma del navegador es neutro/desconocido, el fallback debe ser **ES** (no EN). Mantener detección `es-*` → ES, `en-*` → EN, el toggle y la persistencia en `localStorage` (`liberico.landingLang`).
**Criterio de hecho:** un navegador sin coincidencia clara muestra ES; el toggle sigue funcionando y persiste.

## Arquitectura — evitar un diff inmanejable

El archivo de 3101 líneas es demasiado grande para editar con fiabilidad. **Solo las secciones que se reworkean** se extraen a su propio componente bajo `src/components/landing/` (p. ej. `HeroSection.tsx`, `OralPreview.tsx`, `TrustStrip.tsx`). Extracción quirúrgica, **no** refactor total. Cada componente: una responsabilidad, props tipadas, recibe el objeto de copy (`c: typeof COPY.es`) como ya hace el patrón actual (`ExaminerSheet`, `CriteriaTabs`).

## i18n

Todo texto nuevo va en **ambos** objetos: `COPY` (es) y `COPY_EN`. El tipo `COPY_EN: typeof COPY.es` ya fuerza paridad de forma; añadir claves en ambos o no compila. Cero strings hardcodeados en JSX.

## Manejo de estado / errores

- Las animaciones `Reveal` (IntersectionObserver) deben seguir disparando tras el reorden; degradan con `prefers-reduced-motion` (ya implementado) — no romper ese guard.
- Sin nuevas llamadas a red ni dependencias de auth en la landing pública.

## Verificación (trabajo visual)

- **Capturas antes/después** escritorio (1440) y móvil (390) vía el flujo Playwright ya montado (`/tmp/playwright-test-landing.js`), con scroll para disparar reveals.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde.
- Sin errores de consola; reveals disparan; CTAs navegan a destino correcto; toggle ES/EN intacto.

## Riesgos

- **Asset del oral (UT4):** si se opta por screenshot real, requiere acceso autenticado/créditos; la recreación estática (vía b) lo evita pero debe mantenerse fiel.
- **Reorden (UT5):** mover secciones puede romper supuestos de `Reveal`/anclas del nav (`#how`, `#pricing`…). El plan debe actualizar los anchors del nav si cambian.
- **Paquete de assets:** si se añade imagen, optimizar (webp) y respetar licencias (es producto propio, sin riesgo de terceros).
