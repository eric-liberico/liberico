# Tareas pendientes

Lista de mejoras y funcionalidades identificadas pero aún no implementadas, ordenadas por área.

---

## Prueba 2 — Completo (2026-04-30)

Implementado. Deuda técnica pendiente:

- ~~**Nota IB para Prueba 2**~~ ✅ implementada (`notaIBPrueba2`, tabla proporcional). Pendiente calibrar con ejemplos reales del IBO antes de presentar como oficial.
- ~~**Ensayo modelo de Prueba 2**~~ ✅ `generate-band5-essay-p2` + `EnsayoBanda5Prueba2.tsx` desplegados.
- ~~**Anotaciones sobre ensayo**~~ ✅ `EnsayoAnotadoPrueba2.tsx` con fuzzy matching, reescrituras y filtro por criterio.
- ~~**Historial unificado**~~ ✅ `/historial` rediseñado como portal con bloques P1 y P2.
- **Admin panel**: instrumentar `evaluate-paper2` en métricas del admin (desglose por función ya captura los tokens en `llm_uso`; ya funciona si hay datos).
- **Rate limiting**: el límite actual (8/día) es conservador para MVP. Revisar con datos reales antes de subir.
- **Profesor ve P2**: la vista del profesor (`/profesor-alumno.$alumnoId`) solo lee `evaluaciones` (P1). Añadir `evaluaciones_prueba2` a la vista del profesor cuando sea prioritario.

---

## Panel de administración

### Requiere cambios de esquema (migraciones)

- **Latencia por petición**: añadir columna `duracion_ms` a `llm_uso`. Mostrar p50/p95/p99 por función y tendencia temporal.
- **Errores de edge function**: añadir columna `error_code` a `llm_uso`. Tasa de error real por función (hoy solo se proxy con `tokens_salida = 0`).
- **Tabla de sesiones**: registrar `session_id`, `user_agent`, `país` (via Cloudflare headers) para análisis geográfico básico.

### Requiere integración de terceros

- **Funnel de conversión**: visita → registro → onboarding → primera evaluación → segunda evaluación. Requiere Plausible o PostHog.
- **Retención por cohorte**: % de alumnos activos a los 7/14/30 días del registro. Requiere PostHog o análisis SQL sobre `evaluaciones`.
- **Frontend error tracking**: Sentry o PostHog para errores JS del cliente.
- **Health check en tiempo real**: semáforo Supabase + Anthropic API (verde/amarillo/rojo) usando las páginas de estado públicas.

### Con datos actuales (sin migraciones)

- **Alertas de presupuesto por email**: trigger que avisa cuando la proyección mensual supera un umbral configurable.
- **Actividad del profesor**: conteo de anotaciones, chats con Claude y alumnos vistos en el período.
- **Score drift**: comparar medias de bandas semana a semana para detectar cambios en el calibrado del corrector.
- **Integridad de BD**: conteo de perfiles sin evaluaciones, evaluaciones sin perfil, tareas huérfanas.
- **Uso por día de la semana / hora**: heatmap para saber cuándo estudian los alumnos.

---

## Corrector y evaluación

- **Bloque de cotejo de texto**: resaltar en el texto literario los fragmentos que el alumno citó en su análisis.
- **Historial filtrable**: filtrar por criterio, nota, fecha. Hoy solo muestra la lista plana.
- **Exportar evaluación a PDF**: botón en `EvaluacionPanel` que genera un PDF con bandas, comentarios y texto anotado.
- **Modo cronometrado**: temporizador de 70 min (tiempo real del examen) con alerta a los 10 min restantes.

---

## Pedagogía y contenido

- **Vocabulario interactivo**: tarjetas de vocabulario con práctica tipo flashcard (muestra la palabra, el alumno recuerda la definición).
- **Ejercicios adaptativos**: si el alumno falla repetidamente un tipo de ejercicio, aumentar la frecuencia de ese tipo.
- **Ejercicios de teatro**: los microejercicios actuales cubren narrativa y poesía; falta teatro (ironía dramática, espacio teatral, estructura).
- **Textos en dominio público adicionales**: ampliar la biblioteca con textos de autores anteriores a 1955 (fuera de copyright) para dar más variedad de prácticas.

---

## Gamificación (Fase 4)

- **Progreso por criterio**: barra visual del avance en A/B/C/D a lo largo del historial del alumno.
- **Medallas**: logros desbloqueables (primera evaluación, primera banda 5, racha de 7 días, etc.).
- **Racha diaria**: contador de días consecutivos con actividad, con pérdida y recuperación.

---

## UX / Mobile (Fase 5)

- **Onboarding revisado**: el paso de selección de rol (alumno/profesor) debería ser más visual y menos texto.
- **Notificaciones push**: recordatorio de práctica si el alumno no ha abierto la app en 48 h (requiere Service Worker + Web Push).
- **Modo offline básico**: cachear la sección `/teoria` y los ejercicios ya cargados para uso sin conexión.
- **Accesibilidad**: revisar contraste en modo claro/oscuro, navegación por teclado en todos los modales.

---

## Legal / Negocio (Fase 5)

- **Política de privacidad**: redactar y publicar en `/privacidad` antes de cualquier campaña de captación.
- **Cláusula Google Calendar/Meet**: documentar que las sesiones 1:1 generan invitaciones de calendario y enlace de Meet, incluyendo qué datos se envían a Google (emails, horario y objetivo de la sesión).
- **Tiers de precio**: free (N evaluaciones/mes) vs. premium (ilimitado). Requiere Stripe + RLS por tier.
- **Evaluación jurídica de fragmentos protegidos**: antes de monetizar, consultar si el uso de Neruda, Borges y García Márquez cumple con § 22 URL sueca en contexto comercial.
- **Términos de servicio para menores**: los usuarios son adolescentes; puede requerir consentimiento parental según RGPD / COPPA.

---

## Infraestructura

- **Rate limiting en edge functions de lectura**: hoy solo `evaluate-analysis` tiene cuota. Añadir límites a `generate-band5-essay` y `generate-rewrite-suggestions` (ya costosas).
- **Migración de `marco_analisis` a tabla separada**: protección real con RLS en lugar de honor system. Ver nota en `CLAUDE.md`.
- **Tests de integración**: fixtures sintéticos para los 5 ejemplos calibrados (Cristina, Maija, Dylan, Máximo, Elena). El corrector debe dar ±1 banda en todos ellos.
- **CI en GitHub Actions**: `bun run build`, `bun run lint`, `npx tsc --noEmit` en cada PR.
