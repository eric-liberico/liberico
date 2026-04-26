# Workflow con Claude Code

Este documento describe cómo trabajar de forma segura con Claude Code (la herramienta de línea de comandos de Anthropic) sobre este repositorio. Está orientado a alguien que aún está aprendiendo TypeScript/React/Supabase y que delega buena parte de la generación de código al asistente.

La idea central: **Claude Code escribe rápido pero sin contexto humano.** Tu trabajo es validar antes de comitear. Las dos primeras semanas vas a ir lento; es lo correcto. A las cuatro semanas revisarás un cambio en cinco minutos lo que ahora te lleva una hora.

---

## Estructura general del flujo

Para cada cambio:

1. **Crea una rama nueva** desde `main`.
2. **Pídele a Claude Code** que haga el cambio. Sé específico sobre el alcance.
3. **Lee el diff completo.** No commitees nada que no entiendas línea por línea.
4. **Verifica automáticamente:** TypeScript, lint, build, tests.
5. **Verifica manualmente:** prueba en local, incluyendo caminos infelices y móvil.
6. **Sube la rama y abre un Pull Request.** Revisa el diff otra vez en GitHub: se lee diferente.
7. **Mergea a `main`** solo cuando todo está bien.

---

## Fase 1 — Preparar el cambio

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-corto-descriptivo
```

Pídele a Claude Code el cambio con un alcance claro. Buen ejemplo:

> "Crea la Edge Function `generar-plan` en `supabase/functions/generar-plan/`. Recibe `{ diagnostico, fecha_examen, tiempo_semanal_minutos }` validado con Zod. Calcula nota inicial estimada por criterio, mapea debilidades a bloques pedagógicos, distribuye etapas (40 % base / 40 % aplicación / 20 % simulacro) y devuelve `{ plan: PlanEstudio }`. Maneja errores con el shape estándar `{ error: { codigo, mensaje } }`."

Mal ejemplo (demasiado abierto):

> "Termina el módulo de plan de estudio."

---

## Fase 2 — Verificación automática

Antes de comitear, ejecuta siempre:

```bash
# Tipos estrictos
npx tsc --noEmit

# Lint
npm run lint

# Formato
npm run format:check    # o npx prettier --check .

# Build completo (el test definitivo: si no compila, no funciona)
npm run build

# Tests
npm test               # vitest
# Si hay tests e2e:
# npm run test:e2e     # playwright
```

Si alguna comprobación falla, **no commitees**. Pídele a Claude Code que lo arregle y vuelve a comprobar.

### Revisión de seguridad, bugs, copyright y privacidad — obligatoria antes de cada commit

Después de las verificaciones automáticas, Claude Code (o tú) debe revisar manualmente cada archivo nuevo o modificado con esta lista:

**Seguridad:**
- ¿Hay `ANTHROPIC_API_KEY` o cualquier secreto en algún archivo nuevo? → nunca debe aparecer en el cliente.
- ¿Los parámetros que llegan de la URL (`search`, `params`) están validados antes de usarse como filtros de BD?
- ¿Las tablas nuevas tienen RLS activo con política `auth.uid() = user_id`?
- ¿Los inputs del usuario van a la API/BD directamente sin pasar por la Edge Function? → no debe ocurrir nunca.
- ¿Hay `dangerouslySetInnerHTML`? → nunca sin sanitización explícita.
- ¿Las aserciones `!` (`user!.id`) están dentro de un guard que garantiza que el valor existe?

**Bugs:**
- ¿Los errores de Supabase se manejan explícitamente (toast, fallback)? → no silenciar errores.
- ¿Las funciones asíncronas en `useEffect` tienen `try/catch` o manejo de error en el `.then()`?
- ¿El estado de carga (`loading`, `preloading`) se resetea en el bloque `finally` o equivalente?
- ¿Las rutas protegidas redirigen a `/login` cuando no hay `user`?
- ¿El JSON de Claude se valida con Zod antes de usarse?

**Copyright:**
- ¿El diff añade fragmentos de texto literario? → verificar estado de dominio público del autor:
  - Dominio público en la UE: autor fallecido hace más de 70 años (ej. Bécquer †1870 ✓, Lorca †1936 ✓).
  - Bajo copyright: Neruda †1973 (DP en 2043), Borges †1986 (DP en 2056), García Márquez †2014 (DP en 2084). Los fragmentos actuales están amparados por el **§ 22 Upphovsrättslagen** (URL) sueca y, en el resto de la UE, por la Directiva InfoSoc 2001/29/CE art. 5(3)(d), que obliga a todos los estados miembro a reconocer el derecho de cita. No es necesario revisar 27 leyes nacionales: la armonización europea cubre el uso de cita para este tipo de fragmentos. El riesgo aparece al monetizar: un uso sistemático de fragmentos protegidos como núcleo de una app de pago puede dejar de ser "proporcionado" en cualquier jurisdicción UE. Antes de lanzar planes de pago, consulta jurídica o sustitución por textos de dominio público.
  - El fragmento debe ser **breve** (no el texto completo) y llevar siempre autor y obra citados explícitamente.
- ¿El diff copia descriptores o rúbricas del IBO verbatim? → parafrasear siempre; el texto literal es propiedad de IBO.
- ¿Se añade algún paquete npm nuevo? → verificar que su licencia es MIT, Apache 2.0, BSD o equivalente permisiva. Evitar GPL en el cliente (es copyleft y puede forzar a publicar el código fuente).

**Privacidad / GDPR:**
- ¿El diff añade una tabla nueva con datos de usuario? → debe tener base legal explícita (consentimiento o interés legítimo documentado), política de retención definida, y RLS activo.
- ¿El diff envía datos del usuario a un servicio externo (Anthropic, Supabase, etc.)? → verificar que ese tratamiento ya está cubierto por la política de privacidad. Los análisis escritos por el estudiante se envían a la API de Anthropic (EE.UU.) — esto debe constar en la política de privacidad antes de abrir la app al público. Hasta entonces, la app es de uso restringido/académico.
- ¿El diff recopila datos nuevos no mencionados en la política de privacidad actual? → bloquear el commit hasta actualizarla.
- ¿El feature nuevo aplica a usuarios menores de edad? → GDPR delega la edad de consentimiento digital a cada estado miembro. Suecia fija **13 años**; pero Alemania, Países Bajos e Irlanda fijan **16 años**, y Francia **15**. La regla que aplica es la del **país del usuario**, no la de Suecia. Para el público objetivo (bachillerato IB, 15-17 años), el único riesgo real son usuarios de 15 años en países con umbral de 16. Para el resto de GDPR (registro, base legal, etc.), la ventanilla única de la IMY sueca cubre toda la UE.
- ¿Hay mecanismo de borrado de datos si el usuario lo solicita? → si el diff añade nuevas tablas con datos personales, también debe existir la lógica de borrado.
- ¿El diff sube al repositorio datos reales de estudiantes (análisis, correos, nombres)? → nunca. Solo fixtures sintéticos en tests.

Si hay dudas sobre un archivo concreto, lanzar un agente de revisión independiente antes de comitear.

Para cambios en Edge Functions:

```bash
# Comprueba la función en local (Supabase CLI)
supabase functions serve evaluate-analysis

# En otra terminal, lánzale una petición de prueba
curl -X POST http://localhost:54321/functions/v1/evaluate-analysis \
  -H "Authorization: Bearer <jwt-de-test>" \
  -H "Content-Type: application/json" \
  -d '{"texto_literario":"...","pregunta_orientacion":"...","analisis_estudiante":"..."}'
```

Si añades una migración, prueba contra una base de datos local con `supabase db reset` antes de subirla.

---

## Fase 3 — Verificación manual

Las herramientas validan sintaxis; tú validas comportamiento. Aquí es donde se atrapan los bugs reales.

### Camino feliz

Haz lo que el usuario haría: regístrate, navega a la página, sube un análisis, mira el resultado.

### Caminos infelices — donde Claude más mete la pata

Comprueba qué pasa si:

- Dejas el campo vacío y pulsas "Evaluar".
- Pegas 50.000 caracteres de texto literario.
- La API de Claude tarda mucho (puedes simular limitando red en DevTools).
- Recargas la página a la mitad de una evaluación.
- El JSON que devuelve Claude llega malformado (puedes forzarlo modificando el prompt para que devuelva basura, solo para probar).
- Pierdes conexión a internet en mitad de algo.

### Móvil — no opcional

Tus usuarios son adolescentes. Cualquier feature debe verse y funcionar bien en pantalla pequeña.

- DevTools → Toggle device toolbar → iPhone SE / Pixel.
- Comprueba: el teclado virtual no rompe layouts; los botones son tappables (mínimo 44 px); los modales no se salen.

### Consola y Network

- Errores en rojo en la consola, aunque la app "funcione".
- Warnings de React (los amarillos también importan).
- Llamadas a Supabase con status 200 pero respuesta vacía o rara.
- Llamadas a tu Edge Function que tardan más de lo esperado.

---

## Fase 4 — Verificaciones específicas para este stack

Cosas que debes revisar **siempre** porque son fáciles de olvidar:

### La `ANTHROPIC_API_KEY` nunca en el cliente

- En el navegador, abre Developer Tools → pestaña Sources.
- `Ctrl+F` por "ANTHROPIC" o "sk-ant".
- Si aparece, tienes una filtración crítica. La key debe vivir solo en secrets de Supabase Edge Functions.

Repite esta comprobación cada vez que toques cualquier código relacionado con la llamada a la API.

### Row Level Security activo en cada tabla nueva

En el panel de Supabase → Authentication → Policies:

- Verifica que cada tabla nueva tiene RLS habilitado.
- Verifica que tiene al menos una política basada en `auth.uid() = user_id`.
- **Una tabla sin RLS es pública para cualquiera con la URL de Supabase.**

Prueba real: abre la app en Chrome con el usuario A y en una ventana de incógnito con el usuario B. Verifica que A **no puede ver** las evaluaciones de B. Si las ve, hay un fallo de RLS — y con datos de menores, eso es un desastre legal, no solo técnico.

### Parseo seguro del JSON de Claude

- Toda llamada que espere JSON pasa por un esquema **Zod**.
- Si el parseo falla, hay un fallback (reintento o mensaje de error claro), nunca una excepción cruda al usuario.
- Verifica esto manualmente forzando un fallo: cambia el prompt temporalmente para que devuelva texto libre y comprueba que la app degrada con elegancia.

### Rate limiting por usuario

- La Edge Function `evaluate-analysis` debe verificar antes de llamar a Anthropic que el usuario no ha superado su cuota diaria.
- Verifica con un usuario de prueba: dispara N+1 evaluaciones y comprueba que la N+1 es rechazada con un mensaje claro.

### Coste y prompt caching

- Mira el dashboard de Anthropic regularmente.
- Si el coste por evaluación supera ~0,02 USD, revisa el prompt: probablemente la parte fija no se está cacheando.

---

## Fase 5 — Commit y PR

Cuando todo está bien:

```bash
git add .
git status            # repasa qué has añadido — no metas .env por accidente
git diff --cached     # último vistazo al diff que vas a comitear
git commit -m "Añade Edge Function generar-plan con validación Zod"
git push origin feature/nombre-corto-descriptivo
```

Después abre un Pull Request en GitHub. **Revisa el diff completo otra vez en la interfaz de GitHub.** Se lee diferente al diff local: he visto incontables errores que pasaron en VS Code y se cazaron en GitHub.

Si todo está bien, mergea a `main`. Si algo huele raro, vuelves a la rama, lo arreglas, y vuelves a subir.

---

## Checklist antes de cada commit

Para tu primer mes, ten esta lista pegada al monitor:

**Código y calidad:**
1. ¿Entiendo cada línea del diff? Si no → preguntar a Claude.
2. ¿`npx tsc --noEmit` pasa sin errores?
3. ¿`npm run lint` pasa sin warnings?
4. ¿`npm run build` termina con éxito?
5. ¿`npm test` está en verde?

**Comportamiento:**
6. ¿He probado el cambio en el navegador con un usuario real?
7. ¿He probado en **móvil** (DevTools → device toolbar)?
8. ¿He probado al menos un camino infeliz (campo vacío, error de red, JSON malformado)?

**Seguridad — obligatorio:**
9. ¿La `ANTHROPIC_API_KEY` no aparece en ningún sitio del cliente ni del diff?
10. ¿Las tablas nuevas tienen RLS activo con política `auth.uid() = user_id`?
11. ¿Los parámetros de URL están validados antes de usarse como filtros de BD?
12. ¿Los errores de Supabase se muestran al usuario (toast) y no se silencian?
13. ¿Las aserciones `!` (`user!.id`) están dentro de un guard que lo garantiza?
14. ¿El JSON de Claude pasa por validación Zod antes de usarse?

**Copyright — obligatorio si el diff toca contenido literario o dependencias:**
15. ¿Los fragmentos literarios nuevos son de dominio público (autor †>70 años) o están amparados por art. 32 LPI (breve, educativo, sin lucro, con atribución)?
16. ¿Los textos del IBO están parafraseados, no copiados verbatim?
17. ¿Los paquetes npm nuevos tienen licencia MIT / Apache 2.0 / BSD (no GPL)?

**Privacidad / GDPR — obligatorio si el diff toca datos de usuario o servicios externos:**
18. ¿Las tablas nuevas con datos personales tienen base legal, retención definida y RLS?
19. ¿El envío de datos a servicios externos (Anthropic, Supabase) está cubierto por la política de privacidad vigente?
20. ¿No se han subido al repo datos reales de estudiantes?

**Git:**
21. ¿Estoy en una rama, no en `main`?

Si todas las casillas están marcadas, commitea con tranquilidad.

---

## Revisión cruzada por un Claude independiente

Cuando hagas un cambio grande o sensible (manejo de datos personales, refactor de la Edge Function, cambio del prompt), pídele a **otro Claude que lo revise**. Concretamente: ve a claude.ai (no Claude Code), pega el diff o los archivos modificados y di:

> "Revisa este código pensando en seguridad, bugs y mantenibilidad. Es para una app que evalúa exámenes de estudiantes de IB y llama a la API de Anthropic vía Edge Function de Supabase. Especialmente preocupado por: gestión de secretos, parseo de respuestas, RLS, y errores que puedan dejar al usuario en estado inconsistente."

Este Claude no escribió ese código, así que tiene perspectiva fresca y suele encontrar cosas que el Claude que lo generó no ve. Es una de las prácticas más útiles cuando se trabaja con asistentes de IA. Se llama "review por un agente independiente".

---

## Cuando algo sale mal en producción

1. **No entres en pánico.** Mira los logs (Supabase → Edge Functions → Logs), identifica el error.
2. **Crea una rama `fix/` específica** desde `main`.
3. **Reproduce el error en local primero.** No arregles a ciegas.
4. **Escribe un test que falla** por culpa del bug, antes de arreglarlo. Cuando lo arregles, el test pasa.
5. **Resto del flujo igual:** verificaciones, PR, merge.
6. **Documenta el bug** en una sección "Lecciones aprendidas" si es un patrón que puede repetirse.

---

## Migración de Lovable a Cursor / Claude Code

En algún momento (mes 3-4 o cuando la app pase los ~30-40 componentes), Lovable empezará a romper cosas con cada cambio. Es el momento de pasar a un editor de verdad:

1. Ya tienes el repo en GitHub: clónalo en local.
2. Instala dependencias: `npm install`.
3. Configura Cursor o VS Code con la extensión de Claude Code.
4. **Mantén `CLAUDE.md`** actualizado: es el activo más valioso para que Claude Code entienda el proyecto en cada sesión.
5. **Mantén el repo conectado a Lovable** un tiempo más para los cambios visuales rápidos. Lovable y Claude Code pueden convivir en el mismo repo.
6. Cuando todo el flujo de desarrollo se haga ya en Cursor, desconecta Lovable.

---

## Lo más importante de todo

Las dos primeras semanas vas a ir lento. Es lo correcto. Vas a leer mucho código que no escribiste y vas a sentir que pierdes el tiempo. **No lo pierdes** — estás aprendiendo TypeScript/React/Supabase mientras revisas, y estás construyendo el músculo de detectar problemas.

No te saltes pasos por prisa. Un bug en producción cuesta diez veces más tiempo que detectarlo antes de comitear. Especialmente con datos de menores: un fallo de RLS que filtre datos de estudiantes te puede costar legalmente, no solo técnicamente.
