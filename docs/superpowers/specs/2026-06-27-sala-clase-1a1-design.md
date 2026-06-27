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
  - Bandas medias A/B/C/D + nota IB media, con el **criterio más flojo
    resaltado** (cálculo en cliente, sin IA), reutilizando la lógica de
    `profesor-sesiones`.
  - Correcciones recientes: **P1 (`evaluaciones`) en esta iteración**. Cada una
    se despliega para ver el feedback clave.
  - Todo gateado por `booking_teacher_access` activo. Si no hay acceso (el alumno
    no consintió o expiró): estado claro "Sin acceso al historial del alumno".
  - **P2/Oral fuera de alcance ahora:** la RLS de `booking_teacher_access` solo
    extiende el acceso temporal del profe a `evaluaciones` (P1) y `perfiles`. Las
    tablas de P2/Oral (`evaluaciones_prueba2`, `evaluaciones_oral`, …) no tienen
    esa política, así que mostrarlas requeriría una migración de RLS aparte. Se
    deja como mejora futura para no ampliar el alcance ni tocar migraciones.
- **Notas de la clase** (columna lateral, sticky): editor con `summary` +
  `next_steps` + toggle "visible para el alumno". Reutiliza `booking_notes` y la
  lógica de guardado existente.

## Cuerpo — vista del ALUMNO

- Tu objetivo (`student_goal`, solo lectura).
- Cómo prepararte (los tips que ya existen en `reservar-sesion`).
- Foco de teoría → enlace a `/teoria` si está desbloqueado.
- Después de la clase: "Notas de tu profesora" (`summary` + `next_steps`) cuando
  estén marcadas como visibles.
- Bilingüe (`isEN`).

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
- **Ampliado:** `_shared/booking-confirmation.ts` (attendees + sendUpdates=all +
  emails + descripción + impersonación opcional).
- **Ediciones ligeras:** botón de entrada a la sala en `reservar-sesion.tsx` y
  `profesor-sesiones.tsx`.
- **Sin migración** (todas las tablas/columnas existen).
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
2. El profe ve el material del alumno (objetivo, bandas con criterio flojo,
   correcciones P1) cuando tiene acceso, y un estado claro cuando no.
3. El profe puede escribir y guardar notas (resumen + próximos pasos) y marcarlas
   visibles; el alumno las ve tras la clase.
4. Al confirmar una reserva, ambos participantes reciben (cuando la infra DWD
   está configurada) una invitación de calendario con el enlace de Meet; y si
   falla, la reserva no se rompe y el `meet_link` sigue disponible en la app.
5. `npx tsc --noEmit`, `npm run lint`, `deno task check:edge`,
   `deno task lint:edge` y `npm run build` pasan.
