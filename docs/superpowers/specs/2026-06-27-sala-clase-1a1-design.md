# Sala de clase 1:1 — Diseño

**Fecha:** 2026-06-27
**Estado:** Aprobado (diseño). Pendiente de plan de implementación.
**Rama:** `feat/sala-clase-1a1`

## Objetivo

Dar a las sesiones 1:1 entre profesor y alumno un **hogar propio**: una "sala de
clase" enfocada donde ambos entran para su clase online. El vídeo sigue en
**Google Meet** (no se construye vídeo en la app). La sala aporta lo que una
tutoría genérica por Zoom no tiene: el profesor llega con el **material real del
alumno** (correcciones, bandas, objetivo) delante, y el alumno tiene un único
sitio claro para entrar, prepararse y leer las notas después.

Además, al confirmarse la reserva se **envía una invitación de calendario con el
enlace de Meet a los correos de los dos participantes** (hoy el evento se crea
solo en el calendario interno de LIBerico, sin invitar a nadie).

## Qué NO es (no-objetivos)

- No se construye vídeo/WebRTC en la app. El vídeo es Google Meet.
- No se añade IA nueva ni ninguna Edge Function nueva. Cero coste LLM nuevo.
- No se rehace el flujo de reserva: el alumno sigue eligiendo un hueco libre que
  publica el profe (estilo Calendly). Solo se añade un botón de entrada a la sala.
- No hay presencia en vivo / notas compartidas en tiempo real (posible 2ª
  iteración).
- No se toca el modelo de pago (sigue siendo manual / como está).

## Contexto: qué ya existe

- **Tablas:** `teacher_profiles`, `booking_slots`, `bookings`,
  `booking_teacher_access` (acceso temporal del profe al historial del alumno,
  expira 7 días tras la sesión), `booking_notes`. Columnas de sync con Calendar
  en `bookings`: `meet_link`, `calendar_event_id`, `calendar_id`,
  `calendar_sync_status`, `calendar_sync_error`, `calendar_synced_at`.
- **Rutas:** `reservar-sesion.tsx` (alumno: reserva, ve Meet y notas),
  `profesor-sesiones.tsx` (profe: agenda, disponibilidad, brief del alumno en un
  acordeón, notas), `admin-bookings.tsx` (admin).
- **Edge Functions:** `create-booking` (confirma al crear; pago manual),
  `confirm-booking`, `create-checkout-session`, `stripe-webhook`. La creación del
  evento de Calendar + Meet vive en `_shared/booking-confirmation.ts`.
- **Roles** (`useAuth`): `profesor`, `admin`, `alumno`.
- **Estética:** tokens en `lib/landing-theme` (`L.*`, `fontSans`, `fontMono`,
  `cardShadow`), helpers en `lib/timezone`, i18n con `useUiLang()` / patrón
  `isEN`.

## Decisiones tomadas (brainstorming)

1. Mantener Google Meet para el vídeo.
2. Construir una **sala con ruta propia** (`/clase/$bookingId`), *role-aware*,
   para profe y alumno (Enfoque A).
3. Conexión = el alumno reserva un hueco libre (lo existente; se pule con el
   botón de entrada a la sala).
4. **Sin IA**: solo mostrar muy bien los datos que ya existen.
5. **Añadir invitación de calendario** con el enlace de Meet a los dos correos.
6. **El alumno elige el enfoque de la sesión** al reservar: Prueba 1, Prueba 2 u
   Oral (campo nuevo `session_focus`). El **profe puede ver las correcciones de
   P1, P2 y Oral** de Literatura (con el enfoque elegido destacado), lo que
   requiere una migración de RLS para P2/Oral. El consentimiento sigue siendo
   **único** (un solo "autorizo acceso a mi historial"), no per-tipo.

## Arquitectura

### Ruta y acceso

- Nueva ruta TanStack: `src/routes/clase.$bookingId.tsx` → `/clase/<id>`.
- Una sola sala, *role-aware*: el alumno ve su versión, el profe la suya, según
  `rol` y si es el `student_id` / `teacher_id` de la reserva.
- **Autorización:** solo el alumno de la reserva, su profe o un admin. La RLS de
  `bookings` ya lo garantiza a nivel de datos; la UI comprueba el rol/propiedad y
  redirige a inicio si no procede. Si la reserva no existe → estado "no
  encontrada".

### Puntos de entrada (la sala es el detalle; las listas son el índice)

- **Alumno** en `reservar-sesion.tsx`: cada reserva próxima gana un botón
  primario "Entrar a la clase" → `/clase/$id`. El enlace de Meet se muestra
  dentro de la sala (deja de estar enterrado en la tarjeta de estado).
- **Profe** en `profesor-sesiones.tsx`: al pulsar una sesión, botón primario
  "Abrir sala" → `/clase/$id`. El contexto del alumno (hoy en un acordeón en la
  lista) pasa a vivir en la sala.

### Componentes nuevos

- `clase.$bookingId.tsx` — página contenedora: carga la reserva, decide rol,
  pinta cabecera + cuerpo según rol, maneja todos los estados.
- `SessionHeader` — cabecera común: con quién, cuándo, cuenta atrás/estado,
  botón "Entrar a la clase".
- `JoinButton` — botón de Meet con sus estados (ver abajo).
- Hook de cuenta atrás (`useCountdown` o equivalente, cálculo de tiempo a
  inicio/fin de la sesión).

Cada unidad tiene un propósito claro y se puede entender por separado. Si
`clase.$bookingId.tsx` crece demasiado, se extraen `TeacherRoomBody` y
`StudentRoomBody` a archivos propios.

## Cabecera de la sala (común)

Muestra: con quién (nombre + badge de rol; para el alumno "Estandarizadora IB"),
fecha, rango horario, duración, zona horaria local; un estado/cuenta atrás
("Empieza en 2 h 14 min" / "En curso" / "Terminó"); y el botón **Entrar a la
clase**.

Estados del botón:

- **Hay `meet_link` y estamos en la ventana** (15 min antes → fin + 30 min):
  primario, destacado (pulso suave).
- **Hay `meet_link` pero falta para la hora:** visible pero atenuado, texto "La
  sala abre 15 min antes".
- **Sin `meet_link` todavía:** deshabilitado + "El enlace aparecerá al
  confirmarse con Calendar".
- **Pasada / completada:** se sustituye por "Clase finalizada".
- **Pendiente de pago / cancelada:** banner explicativo, sin botón.

## Cuerpo — vista del PROFESOR

Dos columnas en escritorio, apilado en móvil.

- **El trabajo del alumno** (columna principal):
  - Objetivo del alumno (`student_goal`) destacado.
  - Foco de teoría elegido (`theory_focus_id`).
  - **Enfoque de la sesión** (`session_focus`) destacado arriba: "Esta sesión es
    sobre Prueba 2". Las correcciones de esa prueba se muestran primero.
  - Correcciones recientes de **P1, P2 y Oral de Literatura** (todas las que el
    alumno tenga), en secciones separadas por prueba, cada una desplegable para
    ver el feedback clave. La prueba del enfoque va primero/expandida.
  - Bandas/criterios medios por prueba con el **criterio más flojo resaltado**
    (cálculo en cliente, sin IA). Ojo: las escalas difieren por prueba:
    - P1 `evaluaciones`: `banda_a..d` + `nota_ib`.
    - P2 `evaluaciones_prueba2`: `criterio_a, b1, b2, c, d` (0–5).
    - Oral `evaluaciones_oral`: `criterio_a..d` (0–10).
    El cálculo del criterio más flojo se hace por prueba, con su propia escala.
  - Todo gateado por `booking_teacher_access` activo (consentimiento único del
    alumno). Si no hay acceso (no consintió o expiró): estado claro "Sin acceso
    al historial del alumno".
  - **Spanish B fuera de alcance:** la sesión 1:1 es calibración IB de
    Literatura; las correcciones de Spanish B (`evaluaciones_paper1_b`,
    `evaluaciones_paper2_b`, `evaluaciones_oral_b`) quedan como mejora futura.
- **Notas de la clase** (columna lateral, sticky): editor con `summary` +
  `next_steps` + toggle "visible para el alumno". Reutiliza `booking_notes` y la
  lógica de guardado existente.

## Cuerpo — vista del ALUMNO

- **Enfoque de la sesión** (`session_focus`): "Esta sesión es sobre Prueba 2".
- Tu objetivo (`student_goal`, solo lectura).
- Cómo prepararte (los tips que ya existen en `reservar-sesion`).
- Foco de teoría → enlace a `/teoria` si está desbloqueado.
- Después de la clase: "Notas de tu profesora" (`summary` + `next_steps`) cuando
  estén marcadas como visibles.
- Bilingüe (`isEN`).

## Enfoque de sesión y acceso del profe (datos + RLS)

### Enfoque de sesión (`session_focus`)

- Nueva columna `bookings.session_focus text` con CHECK en `('p1','p2','oral')`
  (nullable para reservas antiguas).
- El alumno lo elige en `reservar-sesion.tsx` al reservar (selector P1 / P2 /
  Oral), junto a su objetivo y al foco de teoría existente. Es independiente de
  `theory_focus_id` (este último desbloquea una ficha de teoría; `session_focus`
  dice de qué prueba va la clase).
- Se pasa a `create-booking` y se guarda en la reserva. Se muestra al profe y al
  alumno en la sala; ordena qué correcciones ve el profe primero.

### Acceso del profe a P2 y Oral (migración RLS)

Hoy la RLS de acceso temporal (`booking_teacher_access`) solo cubre
`evaluaciones` (P1) y `perfiles`. **Migración nueva, versionada y aditiva** (no
reescribe migraciones aplicadas):

- Política SELECT en `evaluaciones_prueba2` para el profe con
  `booking_teacher_access` activo (mismo patrón que la de `evaluaciones`:
  `teacher_id = auth.uid()`, `student_id = <tabla>.user_id`, ventana de acceso
  activa, `revoked_at IS NULL`).
- Política SELECT equivalente en `evaluaciones_oral`.
- El consentimiento sigue siendo **único**: cuando el alumno consiente, el profe
  ve P1/P2/Oral durante la ventana de acceso. No se añade consentimiento
  per-tipo.
- Índices: confirmar que `evaluaciones_prueba2(user_id, created_at)` y
  `evaluaciones_oral(user_id, created_at)` tienen índice (P2 ya lo tiene; revisar
  Oral) para que el filtro por alumno sea eficiente.

## Invitación de calendario a los participantes (backend)

Cambio acotado en `_shared/booking-confirmation.ts`, función
`crearEventoCalendario` (y su llamador `confirmarBooking`):

- Añadir **`attendees`** al evento: email del alumno y del profe.
  - Email del alumno: desde `perfiles` (vía admin client, por `student_id`).
  - Email del profe: `teacher_profiles.calendar_email`, con fallback a
    `perfiles` por `teacher_id`.
- Cambiar `sendUpdates=none` → **`sendUpdates=all`**: Google envía el correo de
  invitación con el enlace de Meet a los dos y el evento aparece en *sus*
  calendarios (con recordatorios y RSVP).
- Enriquecer el evento: título "Clase IB 1:1 — LIBerico"; descripción con el
  objetivo del alumno + enlace a `/clase/$id` (la sala).

### Resiliencia (obligatorio)

- La invitación **nunca bloquea** la reserva (igual que hoy el calendar es
  best-effort). Si falla añadir invitados o enviar correos, se cae al
  comportamiento actual: evento sin invitados, la app sigue mostrando el
  `meet_link`, y se registra en `calendar_sync_error`.

### Aviso de infraestructura (verificar al desplegar — NO bloquea el código)

Una *service account* de Google que invita a terceros y envía correos
normalmente requiere **Domain-Wide Delegation (DWD)**: impersonar a un usuario de
Google Workspace vía el parámetro `subject` de `getGoogleAccessToken` (ya
existe). Plan:

- Añadir un secreto `GOOGLE_IMPERSONATED_SUBJECT` (email de un usuario Workspace
  con acceso al calendario). Si está presente, se pasa como `subject`; si no, se
  intenta sin él (puede que Google rechace los `attendees`, y entonces actúa la
  resiliencia anterior).
- DWD se configura en la consola de Google Workspace (scope
  `https://www.googleapis.com/auth/calendar`). Esto es configuración de
  despliegue, no de código.

No hay proveedor de email transaccional en el proyecto, por eso se usa el envío
nativo de Google Calendar (no se añade dependencia ni proveedor nuevo).

## Estados a manejar (sala)

cargando · no encontrada / sin permiso · cancelada · pendiente de pago ·
confirmada futura · en curso · pasada/completada · sin `meet_link` aún · profe
sin acceso al historial.

## Alcance de cambios

- **Nuevo:** `src/routes/clase.$bookingId.tsx` + componentes pequeños
  (`SessionHeader`, `JoinButton`, hook de cuenta atrás).
- **Migración nueva (versionada, aditiva):** columna `bookings.session_focus` +
  políticas RLS de acceso del profe en `evaluaciones_prueba2` y
  `evaluaciones_oral`.
- **Ampliado:** `_shared/booking-confirmation.ts` (attendees + sendUpdates=all +
  emails + descripción + impersonación opcional). `create-booking` acepta y
  guarda `session_focus`.
- **Ediciones ligeras:** selector de enfoque de sesión + botón de entrada a la
  sala en `reservar-sesion.tsx`; botón de entrada a la sala en
  `profesor-sesiones.tsx`. Regenerar `src/integrations/supabase/types.ts` tras la
  migración.
- **Sin Edge Function nueva. Sin coste LLM.**
- Posible nuevo secreto opcional: `GOOGLE_IMPERSONATED_SUBJECT`.

## Estética y accesibilidad

- Tokens de `landing-theme`; micro-interacciones press/hover; `focus-visible`;
  respeto a `prefers-reduced-motion`. Desktop-first (preferencia del proyecto),
  funcional en móvil.
- La construcción del frontend usará las skills `ui-ux-pro-max` y
  `frontend-design`; al final se pasa `audit` (accesibilidad).

## Criterios de éxito

1. Un alumno y un profe pueden abrir `/clase/<id>` de su reserva y ver una
   pantalla clara con quién/cuándo y un botón para entrar a Meet.
2. El alumno elige el enfoque (P1/P2/Oral) al reservar; el profe lo ve y, con
   acceso, ve las correcciones de P1, P2 y Oral (con la del enfoque primero) y
   sus bandas/criterios con el más flojo resaltado. Estado claro cuando no hay
   acceso.
3. El profe puede escribir y guardar notas (resumen + próximos pasos) y marcarlas
   visibles; el alumno las ve tras la clase.
4. Al confirmar una reserva, ambos participantes reciben (cuando la infra DWD
   está configurada) una invitación de calendario con el enlace de Meet; y si
   falla, la reserva no se rompe y el `meet_link` sigue disponible en la app.
5. `npx tsc --noEmit`, `npm run lint`, `deno task check:edge`,
   `deno task lint:edge` y `npm run build` pasan.
