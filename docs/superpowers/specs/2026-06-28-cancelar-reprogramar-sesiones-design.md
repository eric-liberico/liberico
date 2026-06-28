# Cancelar y reprogramar sesiones 1:1 — Diseño

**Fecha:** 2026-06-28
**Estado:** Aprobado (diseño).
**Rama:** `feat/cancelar-reprogramar`

## Objetivo

Permitir que **alumno** y **profesor** cancelen o reprogramen una sesión 1:1,
con política de ventanas temporales, reembolso (vale de sesión o dinero) y un
**vale** de respaldo cuando no hay huecos para reprogramar. Las sesiones
canceladas desaparecen de la página del alumno y del profesor.

## No-objetivos

- No se construye proveedor de email (las notificaciones son in-app por ahora).
- No se automatiza el movimiento de dinero (el pago es manual/offline; el
  reembolso de dinero se **marca** para que el admin lo procese fuera).
- No se toca la sala de clase ni la invitación de calendario (salvo el arreglo
  de borrado de evento, abajo).

## Decisiones (brainstorming)

- **Pago manual/offline:** reservar no cobra en la app; existe un sistema de
  `creditos` pero es para evaluaciones IA, no para sesiones.
- **Política de ventanas (alumno):**
  - **≥ 48 h** antes: cancelar (reembolso 100%) **o** reprogramar.
  - **24–48 h**: solo reprogramar (sin reembolso).
  - **< 24 h**: ni cancelar ni reprogramar.
- **Reembolso 100%:** el alumno **elige** entre **vale de sesión** (inmediato,
  in-app) o **devolución de dinero** (manual; la app la marca y avisa al admin).
- **Reprogramar sin huecos libres:** se emite un **vale** (se cancela la reserva).
- **Profesor cancelar:** **siempre**; emite **vale automático** al alumno (que
  podrá pedir convertir a dinero). El profesor no reprograma (solo cancela).
- **Caducidad del vale:** **6 meses**.
- **Notificación:** in-app (banner al entrar), sin email.

## Arquitectura

### Componente nuevo

`supabase/functions/manage-booking/index.ts` — Edge Function de autoservicio para
alumno y profesor. Valida JWT, comprueba que quien llama es el alumno o el profe
de la reserva, **calcula la ventana con `slot.starts_at` vs ahora en servidor**
(fuente de verdad) y ejecuta la acción con service role. Acciones:
`cancel` | `reschedule`. `confirm-booking` (admin) se mantiene aparte.

### Datos nuevos (migración versionada, con RLS)

- `session_vouchers`:
  - `id uuid pk`, `student_id uuid` (auth.users), `status text`
    CHECK in (`active`,`redeemed`,`expired`,`cancelled`) default `active`,
    `motivo text` CHECK in (`cancelacion`,`profesor_cancelo`,`reprogramar_sin_hueco`),
    `origin_booking_id uuid`, `redeemed_booking_id uuid` null,
    `created_at timestamptz default now()`, `expires_at timestamptz`.
  - RLS: el alumno lee sus vales (`student_id = auth.uid()`); admin gestiona todo.
    El servicio (service role) crea/canjea desde Edge Functions.
- `refund_requests`:
  - `id uuid pk`, `booking_id uuid`, `student_id uuid`, `amount_sek integer`,
    `status text` CHECK in (`pending`,`processed`,`rejected`) default `pending`,
    `created_at timestamptz default now()`, `processed_at timestamptz null`,
    `processed_by uuid null`.
  - RLS: el alumno lee los suyos; admin gestiona.
- `bookings`: añadir `cancelled_by text` CHECK in (`student`,`teacher`,`admin`)
  null, `cancelled_at timestamptz null`.

### Política (servidor)

En `manage-booking`, con `slot.starts_at`:
- `horasAntes = (starts_at - now) / 3600000`.
- `cancel` (alumno): requiere `horasAntes >= 48`. Refund elegido por el alumno
  (`refund: 'voucher' | 'money'`).
- `reschedule` (alumno): requiere `horasAntes >= 24`.
- `cancel` (profe): sin restricción de ventana.
- Si la condición no se cumple → error 400 con mensaje claro (la UI también
  desactiva el botón, pero el servidor es la verdad).

### Efectos

- **Cancelar** (alumno o profe):
  - `bookings`: `status='cancelled'`, `cancelled_by`, `cancelled_at`.
  - `booking_slots`: el slot vuelve a `available`.
  - `booking_teacher_access`: `revoked_at = now()`.
  - Calendar: borrar el evento (con impersonación, ver Arreglo).
  - Reembolso: si alumno≥48h → según su elección (vale o `refund_request`);
    si profe → **vale automático** (`motivo='profesor_cancelo'`).
    - `refund_requests.amount_sek` = `bookings.total_sek` de la reserva.
    - Un **vale = una sesión futura gratis**, sin importe (cubre cualquier slot
      independientemente de su precio).
  - Oculta de ambas páginas (filtrado por `status != 'cancelled'`).
- **Reprogramar** (alumno, ≥24h):
  - Elige un `booking_slots` nuevo `available` del mismo profe.
  - `bookings.slot_id` pasa al nuevo; el slot viejo vuelve a `available`, el
    nuevo pasa a `booked`.
  - Calendar: **actualizar** el evento existente (PATCH de `start`/`end` con
    impersonación), que **conserva el mismo enlace de Meet**. Si falla, no
    bloquea la reprogramación.
  - Si **no hay slots disponibles**: la UI ofrece "no hay huecos → obtener vale";
    al confirmar, `manage-booking` cancela la reserva y emite vale
    (`motivo='reprogramar_sin_hueco'`).

### Canje del vale

- `create-booking` acepta `usar_vale: true`. Si el alumno tiene un vale `active`
  no caducado, la reserva se crea **sin pago manual** (se confirma directamente)
  y el vale pasa a `redeemed` con `redeemed_booking_id`. (La confirmación de
  calendar/acceso sigue igual vía `confirmarBooking`.)
- La UI de `reservar-sesion` muestra un banner "Tienes un vale" y, al elegir
  hueco, un check "Usar mi vale".

### UI (con ui-ux-pro-max)

- **Alumno** (`reservar-sesion.tsx`): en cada `BookingCard` futura, botones
  **Reprogramar** y **Cancelar**, activos/desactivados según la ventana (con
  tooltip si bloqueados). Modal de confirmación que enseña la política y, en
  cancelación con derecho a reembolso, el selector **Vale vs Dinero**.
  Reprogramar abre un selector de huecos del profe; si vacío, ofrece el vale.
  Banner de vale + canje.
- **Profesor** (`profesor-sesiones.tsx` y/o la sala): botón **Cancelar sesión**
  con confirmación (avisa de que el alumno recibirá un vale).

### Arreglo incluido

El borrado de evento de Calendar en cancelaciones usa
`getGoogleAccessToken(json)` **sin** `subject`. Como los eventos ahora se crean
impersonando `booking@liberico.org`, el borrado debe pasar
`Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT")` como `subject` (igual que la
creación) para poder borrarlos. Se aplica en `manage-booking` y se alinea
`confirm-booking`.

## Estados / casos límite

- Reserva ya cancelada/completada → acción rechazada.
- Sin slot futuro del profe para reprogramar → flujo de vale.
- Vale caducado → no canjeable (la UI no lo ofrece; el servidor lo valida).
- Cancelación concurrente / slot ya retomado → comprobaciones atómicas
  (`.eq("status", ...)` como guard).
- Calendar falla al borrar → no bloquea la cancelación (best-effort, se registra).

## Alcance de cambios

- **Migración nueva:** `session_vouchers`, `refund_requests`, columnas en
  `bookings`, RLS de las dos tablas. Regenerar `types.ts`.
- **Edge Function nueva:** `manage-booking` (cancel/reschedule, política, vale,
  refund, calendar con impersonación).
- **Ampliado:** `create-booking` (canje de vale); `_shared/booking-confirmation.ts`
  o `confirm-booking` (impersonación en borrado de calendar).
- **Frontend:** `reservar-sesion.tsx` (botones cancelar/reprogramar, modal,
  selector de huecos, banner+canje de vale); `profesor-sesiones.tsx` (cancelar);
  posible panel admin para `refund_requests` (mínimo: listar pendientes).
- Bilingüe `isEN`; estética con tokens de `landing-theme`; sin coste LLM.

## Criterios de éxito

1. El alumno cancela ≥48h y elige vale o dinero; <48h no puede cancelar; 24–48h
   solo reprograma; <24h nada — y el servidor lo valida, no solo la UI.
2. Reprogramar mueve el slot y actualiza el calendario; sin huecos → vale.
3. El profe cancela en cualquier momento; el alumno recibe vale automático.
4. Las sesiones canceladas desaparecen de las páginas de alumno y profe; el slot
   se libera; el acceso del profe al historial se revoca; el evento de Calendar
   se borra.
5. El alumno canjea un vale al reservar (sin pago manual). Vale caduca a 6 meses.
6. `tsc`, `build`, `deno task check:edge`, `deno task lint:edge` verdes.
