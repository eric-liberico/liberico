# Tareas pendientes

Lista de mejoras y funcionalidades identificadas pero aún no implementadas, ordenadas por área.

---

## LIBerico Aula — Producto B2B para profesores

### Ahora — Validación (antes de escribir código)

- [ ] **Entrevistar a 5 profesores de IB Español A** con estas preguntas exactas:
  1. ¿Cómo preparas una clase ahora?
  2. ¿Qué parte te lleva más tiempo?
  3. ¿Mirarías un heatmap de criterios A/B/C/D de tu clase antes de planificar?
  4. ¿Usarías una clase AI-generada tal cual, la modificarías o la descartarías?
  5. ¿Pagarías de tu bolsillo? ¿A qué precio sin pensarlo dos veces?
- [ ] **Revisar panel de profesor actual** y listar qué existe vs. qué falta para el MVP.
- [ ] **Consultar abogado de datos** sobre: consentimiento de menores al compartir historial con profesor, y requisitos DPA para ventas a colegios (GDPR + Skollagen sueca).
- [ ] **Decisión go/no-go** basada en las entrevistas. No programar nada B2B hasta tener esta decisión.

### Siguiente — MVP (si hay green light, semanas 4-10)

- [ ] **Gestión de clase**: crear curso, generar código/enlace de invitación, alumno acepta desde su cuenta existente (no se crean cuentas nuevas).
- [ ] **Pantalla de consentimiento del alumno**: al unirse a una clase, el alumno acepta explícitamente que su historial es visible para ese profesor. Consentimiento revocable. Solo comparte historial desde la fecha de vinculación por defecto.
- [ ] **Heatmap de clase**: tabla criterios A/B/C/D × alumno, fila de media de clase, celdas rojas donde la media está por debajo de banda 3.
- [ ] **Generador de clase básico**: objetivo de aprendizaje, mini-lección (máx. 10 min), actividad práctica con texto de dominio público, exit ticket (2 preguntas), sugerencia de deberes. Dos niveles de diferenciación: bajo banda 3 / banda 3+.
- [ ] **Export PDF/Markdown**: botón de descarga. Sin Gamma todavía.
- [ ] **Precio early adopter**: 29 €/mes vitalicio para los primeros 20 profesores. Onboarding manual de los primeros usuarios.
- [ ] **DPA estándar borrador**: tener listo para firmar antes del primer cliente institucional.

### Luego — Iteración (semanas 11-20, según feedback real)

- [ ] **Historial de clases generadas**: el profesor ve las clases que generó anteriormente.
- [ ] **Actividad diferenciada avanzada**: más de dos niveles si el feedback lo justifica.
- [ ] **Plan colegio**: licencia departamento (hasta 5 profesores, 599-999 €/año). Solo abrir cuando haya 2+ profesores del mismo centro pagando individualmente.
- [ ] **Bucle de feedback pedagógico**: registrar si los criterios mejoran en las evaluaciones posteriores a una clase generada. Base de datos de efectividad de intervenciones (diseñar esquema aunque no se muestre todavía).
- [ ] **Gamma API**: evaluar solo si >80% de los profesores activos hacen clic en "Crear presentación". Feature premium de plan colegio, límite 5/mes.

### NO construir (decisión explícita)

- Creación de cuentas de alumnos desde el lado profesor.
- Panel de administración de colegio (director, coordinador IB, facturación multi-sede).
- Integración con Google Classroom, Managebac u otros LMS.
- Notificaciones automáticas al profesor por cambios de banda del alumno.
- Más de dos niveles de diferenciación en el generador de clase (MVP).
- Gamma API antes de validar demanda real con datos de uso.

---

## Gamificación ✅ (2026-05-01)

Fase 4 completada:

- ~~**Migración BD**~~ ✅ `20260502100000_gamificacion.sql` aplicada: columnas xp_total/racha_actual/racha_maxima/ultima_actividad_fecha en `perfiles`; tablas `logros_catalogo` (15 logros seed) y `logros_desbloqueados` con RLS.
- ~~**procesarGamificacion**~~ ✅ `_shared/gamificacion.ts` — no-fatal, llamada al final del happy path en `evaluate-analysis`, `evaluate-paper2`, `evaluate-oral`.
- ~~**UI gamificación**~~ ✅ `TarjetaRacha`, `BarraXP`, `LogroCard`, `PanelLogros`, `ToastLogro` en `src/components/gamificacion/`.
- ~~**Integración**~~ ✅ Dashboard muestra racha + XP; Historial muestra panel de logros; paneles de evaluación muestran toast al desbloquear.

Pendiente (deuda técnica menor):

- **Calibrar XP base**: los valores P1=30/P2=40/Oral=50 son estimados. Ajustar según datos reales de uso.
- **`/cuenta` con resumen gamificación**: la ruta `/cuenta` aún no muestra XP/racha/logros.
- **Más logros**: se pueden añadir logros por criterio o por texto de biblioteca cuando haya datos reales.

---

## Mejoras adicionales ✅ (2026-05-01)

Todas implementadas y desplegadas.

- ~~**Transcripción imagen/PDF a texto**~~ ✅ `ImageUploadButton.tsx` + edge function `transcribe-image`. Soporta JPG/PNG/WebP/HEIC/PDF. Integrado en P1, P2 y Oral.
- ~~**Juego del Quijote en band5**~~ ✅ `EnsayoBanda5.tsx` y `EnsayoBanda5Prueba2.tsx` muestran el juego mientras generan.
- ~~**Sugeridor de asunto global (Oral)**~~ ✅ `SugeridorOral.tsx` + edge function `suggest-oral-topics`. Pre-rellena el formulario del Oral.
- ~~**Biblioteca de textos P1**~~ ✅ Ruta `/biblioteca`, tabla `textos_practica_p1`, edge function `generate-practice-text`, panel admin. **Pendiente**: poblar la biblioteca generando textos desde `/admin`.
- ~~**Selector de preguntas P2**~~ ✅ `SelectorPreguntaP2.tsx`, tabla `preguntas_prueba2` con 170 preguntas de past papers ordenadas alfabéticamente.
- ~~**Fix coste transcripción en admin**~~ ✅ `llm_precios` actualizado con ID completo `claude-haiku-4-5-20251001`.

Pendiente:

- **Poblar la biblioteca**: generar textos de práctica desde `/admin` → sección "Biblioteca P1".
- **Sugerencias de reescritura para oral**: edge function `generate-rewrite-suggestions-oral` (priorizar cuando haya evaluaciones reales).
- **Profesor ve Oral y P2**: `/profesor-alumno.$alumnoId` solo lee P1.

---

## Oral Individual — MVP completo (2026-05-01)

Módulo implementado. Deuda técnica pendiente:

- ~~**Desplegar migración**~~ ✅ desplegada.
- ~~**Desplegar edge function**~~ ✅ `evaluate-oral` desplegada.
- ~~**Regenerar tipos de Supabase**~~ ✅ regenerados el 2026-05-01.
- **Calibración de `notaIBOral`**: los umbrales actuales (0-9→1 ... 37-40→7) son estimados. Validar con ejemplos calibrados del IBO cuando estén disponibles.
- **Sugerencias de reescritura para oral**: considerar una edge function `generate-rewrite-suggestions-oral` similar a P1/P2, una vez que haya suficientes evaluaciones reales para priorizar.
- **Profesor ve oral**: `/profesor-alumno.$alumnoId` solo lee P1 actualmente. Añadir `evaluaciones_oral` cuando sea prioritario.

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
