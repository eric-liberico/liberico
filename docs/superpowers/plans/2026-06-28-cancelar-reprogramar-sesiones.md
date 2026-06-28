# Cancelar y reprogramar sesiones 1:1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que alumno y profesor puedan cancelar/reprogramar sesiones 1:1 con política de ventanas (≥48h cancelar+reembolso, ≥24h reprogramar), reembolso elegible (vale de sesión o dinero manual) y vale de respaldo si no hay huecos.

**Architecture:** Una Edge Function nueva `manage-booking` (Deno) hace el autoservicio de alumno/profe validando la ventana en servidor con `slot.starts_at`. Tablas nuevas `session_vouchers` y `refund_requests` (RLS). `create-booking` canjea vales. El borrado/actualización de eventos de Google Calendar usa impersonación de `booking@liberico.org`. Frontend en `reservar-sesion.tsx` (alumno) y `profesor-sesiones.tsx` (profe).

**Tech Stack:** Supabase (Postgres + RLS + Edge Functions Deno), React + TypeScript + TanStack Router, Tailwind v4 + tokens de `@/lib/landing-theme`, Google Calendar API.

## Global Constraints

- **Verificación (NO hay runner de tests JS):** `npx tsc --noEmit`, `npm run build`; edge: `deno task check:edge` y `deno task lint:edge`. `npm run lint` está ROTO repo-wide (minimatch/brace-expansion, preexistente) — NO es defecto, NO es gate. No hay framework de tests JS — NO marcar "faltan tests" como defecto.
- **La política de ventanas se valida en SERVIDOR** (Edge Function), con `slot.starts_at` vs `now`. La UI también gatea, pero el servidor es la fuente de verdad.
- **Pago manual/offline:** reservar no cobra; el reembolso de dinero solo se **registra** (`refund_requests`), no se mueve dinero.
- **Ventanas (alumno):** cancelar requiere ≥48h; reprogramar requiere ≥24h; <24h nada. **Profe** cancela sin restricción de ventana → **vale automático** al alumno.
- **Vale = una sesión futura gratis** (cubre cualquier slot, sin importe). Caduca a **6 meses**.
- **Reembolso de dinero:** `refund_requests.amount_sek = bookings.total_sek`; el alumno elige vale o dinero al cancelar con derecho.
- **Cancelada = oculta** de las páginas de alumno y profe (soft, `status='cancelled'`).
- **Calendar:** borrar/actualizar eventos requiere token impersonando `GOOGLE_IMPERSONATED_SUBJECT`. Fallos de Calendar NO bloquean la acción.
- **RLS obligatorio** en tablas nuevas; migración versionada y aditiva.
- **Edge Functions Deno** validan JWT al inicio; service role solo en backend. Nuevas funciones se añaden a `deno.json` tasks.
- **Frontend bilingüe** `isEN` (`useUiLang()==='en'`); estética con tokens de `landing-theme`; desktop-first.
- **Spec:** `docs/superpowers/specs/2026-06-28-cancelar-reprogramar-sesiones-design.md`.

---

## File Structure

**Nuevos:**
- `supabase/migrations/20260628120000_cancelar_reprogramar.sql` — tablas `session_vouchers`, `refund_requests`, columnas en `bookings`, RLS.
- `supabase/functions/manage-booking/index.ts` — autoservicio cancel/reschedule.

**Modificados:**
- `supabase/functions/_shared/booking-confirmation.ts` — añadir `actualizarEventoCalendario` (PATCH) y exportarla.
- `supabase/functions/create-booking/index.ts` — canje de vale (`usar_vale`).
- `supabase/functions/confirm-booking/index.ts` — impersonación al borrar evento (alinear).
- `deno.json` — añadir `manage-booking` a `check:edge` y `lint:edge`.
- `src/integrations/supabase/types.ts` — tipos de las tablas nuevas + columnas de `bookings`.
- `src/routes/reservar-sesion.tsx` — botones cancelar/reprogramar + modal + selector de huecos + banner/canje de vale.
- `src/routes/profesor-sesiones.tsx` — botón "Cancelar sesión".
- `src/routes/admin-bookings.tsx` — lista mínima de `refund_requests` pendientes.

---

## Task 1: Migración — vales, reembolsos y columnas de cancelación

**Files:**
- Create: `supabase/migrations/20260628120000_cancelar_reprogramar.sql`
- Modify: `src/integrations/supabase/types.ts`

**Interfaces:**
- Produces: tablas `public.session_vouchers`, `public.refund_requests`; columnas `bookings.cancelled_by`, `bookings.cancelled_at`.

- [ ] **Step 1: Crear la migración**

`supabase/migrations/20260628120000_cancelar_reprogramar.sql`:

```sql
-- Cancelar/reprogramar sesiones 1:1: vales, reembolsos y auditoría de cancelación
-- Migración aditiva.

-- 1) Columnas de auditoría de cancelación en bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by text
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('student', 'teacher', 'admin')),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 2) Vales de sesión (una sesión futura gratis)
CREATE TABLE IF NOT EXISTS public.session_vouchers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  motivo              text NOT NULL
                      CHECK (motivo IN ('cancelacion', 'profesor_cancelo', 'reprogramar_sin_hueco')),
  origin_booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  redeemed_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_vouchers_student
  ON public.session_vouchers (student_id, status);

ALTER TABLE public.session_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus vales"
  ON public.session_vouchers FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admin gestiona vales"
  ON public.session_vouchers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  ));

-- 3) Solicitudes de reembolso de dinero (procesadas a mano por el admin)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sek    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processed', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  processed_by  uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests (status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumno lee sus reembolsos"
  ON public.refund_requests FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admin gestiona reembolsos"
  ON public.refund_requests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  ));
```

- [ ] **Step 2: Aplicar y verificar en local (o revisar a ojo)**

Run: `supabase db reset` (local) o revisar el SQL contra el patrón de `20260429210000_booking_tables.sql`.
Expected: tablas creadas con RLS; columnas en `bookings`.

> Si no hay entorno local, dejar la aplicación a producción para el paso de despliegue (fuera de este plan de código), como en specs previos.

- [ ] **Step 3: Tipos en `types.ts`**

En `src/integrations/supabase/types.ts`, añadir a `bookings` Row/Insert/Update: `cancelled_by: string | null` y `cancelled_at: string | null`. Añadir entradas de tabla para `session_vouchers` y `refund_requests` (Row/Insert/Update) con los campos anteriores (uuid→string, timestamptz→string, integer→number).

> Alternativa preferible: regenerar `types.ts` con la CLI tras aplicar la migración.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260628120000_cancelar_reprogramar.sql src/integrations/supabase/types.ts
git commit -m "feat(cancelar): migración vales + reembolsos + columnas de cancelación"
```

---

## Task 2: Helper de Calendar — actualizar evento + impersonación

**Files:**
- Modify: `supabase/functions/_shared/booking-confirmation.ts`
- Modify: `supabase/functions/confirm-booking/index.ts`

**Interfaces:**
- Produces: `actualizarEventoCalendario({ accessToken, calendarId, eventId, startsAt, endsAt }): Promise<void>` (exportada). `confirm-booking` obtiene el token con impersonación al borrar.

- [ ] **Step 1: Añadir `actualizarEventoCalendario` (PATCH)**

En `supabase/functions/_shared/booking-confirmation.ts`, tras `eliminarEventoCalendario`, añadir:

```ts
export async function actualizarEventoCalendario(opts: {
  accessToken: string;
  calendarId: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
}): Promise<void> {
  const { accessToken, calendarId, eventId, startsAt, endsAt } = opts;
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: { dateTime: startsAt, timeZone: "UTC" },
        end: { dateTime: endsAt, timeZone: "UTC" },
      }),
    },
  );
  if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
    const err = await resp.text();
    throw new Error(`Google Calendar update error: ${err}`);
  }
}
```

- [ ] **Step 2: Impersonación al borrar en `confirm-booking`**

En `supabase/functions/confirm-booking/index.ts`, en las DOS llamadas `await getGoogleAccessToken(googleSAJson);` (acciones cancel y delete), pasar el subject:

```ts
const accessToken = await getGoogleAccessToken(
  googleSAJson,
  Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
);
```

- [ ] **Step 3: Verificar edge**

Run: `deno task check:edge && deno task lint:edge`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/booking-confirmation.ts supabase/functions/confirm-booking/index.ts
git commit -m "feat(cancelar): actualizarEventoCalendario + impersonación al borrar"
```

---

## Task 3: Edge Function `manage-booking` — cancelar

**Files:**
- Create: `supabase/functions/manage-booking/index.ts`
- Modify: `deno.json`

**Interfaces:**
- Consumes: `getGoogleAccessToken`, `eliminarEventoCalendario` de `_shared/booking-confirmation.ts`; tablas de Task 1.
- Produces: endpoint POST `manage-booking` con body `{ booking_id, action: "cancel", refund?: "voucher"|"money" }`. (La acción `reschedule` se añade en Task 4.)

- [ ] **Step 1: Crear `manage-booking/index.ts` con la acción cancel**

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  eliminarEventoCalendario,
  getGoogleAccessToken,
} from "../_shared/booking-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOUCHER_MONTHS = 6;

function valeExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + VOUCHER_MONTHS);
  return d.toISOString();
}

// deno-lint-ignore no-explicit-any
async function borrarEventoSiExiste(adminClient: any, booking: any) {
  if (!booking.calendar_event_id || !booking.calendar_id) return;
  try {
    const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleSAJson) return;
    const accessToken = await getGoogleAccessToken(
      googleSAJson,
      Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
    );
    await eliminarEventoCalendario({
      accessToken,
      calendarId: booking.calendar_id,
      eventId: booking.calendar_event_id,
    });
  } catch (calErr) {
    console.error("Calendar delete (no bloquea):", calErr);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Configuración incompleta" }, 500);

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return json({ error: "No autorizado" }, 401);
    }
    const { data: userData, error: userErr } = await anonClient.auth.getUser(parts[1]);
    if (userErr || !userData.user) return json({ error: "No autorizado" }, 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as {
      booking_id?: unknown;
      action?: unknown;
      refund?: unknown;
      new_slot_id?: unknown;
      force_voucher_no_slot?: unknown;
    };
    const bookingId = typeof body.booking_id === "string" ? body.booking_id : null;
    const action = body.action === "reschedule" ? "reschedule" : "cancel";
    if (!bookingId) return json({ error: "booking_id requerido" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bErr } = await adminClient
      .from("bookings")
      .select(
        "id, student_id, teacher_id, slot_id, status, total_sek, calendar_event_id, calendar_id, slot:booking_slots(starts_at, ends_at)",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) return json({ error: "Reserva no encontrada" }, 404);

    const isStudent = userId === booking.student_id;
    const isTeacher = userId === booking.teacher_id;
    if (!isStudent && !isTeacher) return json({ error: "Acceso denegado" }, 403);
    if (booking.status === "cancelled" || booking.status === "completed") {
      return json({ error: "La sesión ya no se puede modificar" }, 400);
    }

    const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot;
    const startsAt = slot?.starts_at as string | undefined;
    if (!startsAt) return json({ error: "Horario no encontrado" }, 400);
    const horasAntes = (new Date(startsAt).getTime() - Date.now()) / 3_600_000;

    if (action === "cancel") {
      // Política: alumno requiere >=48h; profe sin restricción
      if (isStudent && horasAntes < 48) {
        return json({ error: "Solo puedes cancelar con al menos 48 h de antelación." }, 400);
      }
      const refund = body.refund === "money" ? "money" : "voucher";

      // 1) Marcar cancelada + liberar slot + revocar acceso
      await adminClient
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: isTeacher ? "teacher" : "student",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      await adminClient
        .from("booking_slots")
        .update({ status: "available" })
        .eq("id", booking.slot_id);
      await adminClient
        .from("booking_teacher_access")
        .update({ revoked_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .is("revoked_at", null);

      // 2) Reembolso: profe → vale; alumno → según elección
      let emitido: "voucher" | "money" = "voucher";
      if (isTeacher) {
        await adminClient.from("session_vouchers").insert({
          student_id: booking.student_id,
          motivo: "profesor_cancelo",
          origin_booking_id: bookingId,
          expires_at: valeExpiry(),
        });
        emitido = "voucher";
      } else if (refund === "money") {
        await adminClient.from("refund_requests").insert({
          booking_id: bookingId,
          student_id: booking.student_id,
          amount_sek: (booking.total_sek as number | null) ?? 0,
        });
        emitido = "money";
      } else {
        await adminClient.from("session_vouchers").insert({
          student_id: booking.student_id,
          motivo: "cancelacion",
          origin_booking_id: bookingId,
          expires_at: valeExpiry(),
        });
        emitido = "voucher";
      }

      // 3) Calendar (best-effort)
      await borrarEventoSiExiste(adminClient, booking);

      return json({ ok: true, status: "cancelled", refund: emitido });
    }

    // action === "reschedule" se implementa en Task 4
    return json({ error: "Acción no soportada todavía" }, 400);
  } catch (e) {
    console.error("manage-booking error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
```

- [ ] **Step 2: Añadir `manage-booking` a `deno.json`**

En `deno.json`, en las tareas `check:edge` y `lint:edge`, añadir ` supabase/functions/manage-booking/index.ts` al final de la lista de ficheros de cada una.

- [ ] **Step 3: Verificar edge**

Run: `deno task check:edge && deno task lint:edge`
Expected: sin errores (incluye ya `manage-booking`).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/manage-booking/index.ts deno.json
git commit -m "feat(cancelar): manage-booking — cancelar (alumno >=48h / profe) + vale/reembolso"
```

---

## Task 4: `manage-booking` — reprogramar

**Files:**
- Modify: `supabase/functions/manage-booking/index.ts`

**Interfaces:**
- Consumes: `actualizarEventoCalendario` (Task 2).
- Produces: acción `reschedule` con body `{ booking_id, action:"reschedule", new_slot_id?, force_voucher_no_slot?: boolean }`.

- [ ] **Step 1: Importar `actualizarEventoCalendario`**

En el import de `_shared/booking-confirmation.ts` de `manage-booking/index.ts`, añadir `actualizarEventoCalendario`:

```ts
import {
  actualizarEventoCalendario,
  eliminarEventoCalendario,
  getGoogleAccessToken,
} from "../_shared/booking-confirmation.ts";
```

- [ ] **Step 2: Implementar la acción reschedule**

Reemplazar `// action === "reschedule" se implementa en Task 4` y el `return json({ error: "Acción no soportada todavía" }, 400);` por:

```ts
    // action === "reschedule"
    if (!isStudent) return json({ error: "Solo el alumno puede reprogramar" }, 403);
    if (horasAntes < 24) {
      return json({ error: "Solo puedes reprogramar con al menos 24 h de antelación." }, 400);
    }

    const newSlotId = typeof body.new_slot_id === "string" ? body.new_slot_id : null;
    const forceVoucher = body.force_voucher_no_slot === true;

    if (newSlotId) {
      // Validar el nuevo slot: disponible, del mismo profe, futuro
      const { data: newSlot } = await adminClient
        .from("booking_slots")
        .select("id, teacher_id, status, starts_at, ends_at")
        .eq("id", newSlotId)
        .maybeSingle();
      if (!newSlot || newSlot.status !== "available" || newSlot.teacher_id !== booking.teacher_id) {
        return json({ error: "El horario elegido ya no está disponible." }, 409);
      }
      if (new Date(newSlot.starts_at as string).getTime() <= Date.now()) {
        return json({ error: "El horario debe estar en el futuro." }, 400);
      }

      // Reservar nuevo slot con guard contra carrera
      const { data: booked } = await adminClient
        .from("booking_slots")
        .update({ status: "booked" })
        .eq("id", newSlotId)
        .eq("status", "available")
        .select("id");
      if (!booked || booked.length === 0) {
        return json({ error: "El horario elegido ya no está disponible." }, 409);
      }

      // Mover la reserva y liberar el slot viejo
      await adminClient.from("bookings").update({ slot_id: newSlotId }).eq("id", bookingId);
      await adminClient
        .from("booking_slots")
        .update({ status: "available" })
        .eq("id", booking.slot_id);

      // Calendar: mover el evento (best-effort)
      if (booking.calendar_event_id && booking.calendar_id) {
        try {
          const googleSAJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
          if (googleSAJson) {
            const accessToken = await getGoogleAccessToken(
              googleSAJson,
              Deno.env.get("GOOGLE_IMPERSONATED_SUBJECT") || undefined,
            );
            await actualizarEventoCalendario({
              accessToken,
              calendarId: booking.calendar_id,
              eventId: booking.calendar_event_id,
              startsAt: newSlot.starts_at as string,
              endsAt: newSlot.ends_at as string,
            });
          }
        } catch (calErr) {
          console.error("Calendar update (no bloquea):", calErr);
        }
      }
      return json({ ok: true, status: "rescheduled" });
    }

    if (forceVoucher) {
      // No hay huecos → cancelar con vale
      await adminClient
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: "student",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      await adminClient
        .from("booking_slots")
        .update({ status: "available" })
        .eq("id", booking.slot_id);
      await adminClient
        .from("booking_teacher_access")
        .update({ revoked_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .is("revoked_at", null);
      await adminClient.from("session_vouchers").insert({
        student_id: booking.student_id,
        motivo: "reprogramar_sin_hueco",
        origin_booking_id: bookingId,
        expires_at: valeExpiry(),
      });
      await borrarEventoSiExiste(adminClient, booking);
      return json({ ok: true, status: "voucher_issued", refund: "voucher" });
    }

    return json({ error: "Falta new_slot_id o force_voucher_no_slot" }, 400);
```

- [ ] **Step 3: Verificar edge**

Run: `deno task check:edge && deno task lint:edge`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/manage-booking/index.ts
git commit -m "feat(cancelar): manage-booking — reprogramar (>=24h) + vale si no hay hueco"
```

---

## Task 5: `create-booking` — canje de vale

**Files:**
- Modify: `supabase/functions/create-booking/index.ts`

**Interfaces:**
- Consumes: tabla `session_vouchers`.
- Produces: `create-booking` acepta `usar_vale: boolean`; si hay vale activo no caducado, la reserva se crea sin pago y el vale pasa a `redeemed`.

- [ ] **Step 1: Leer `usar_vale` y buscar vale activo**

En `supabase/functions/create-booking/index.ts`, ampliar el tipo del body con `usar_vale?: unknown;` y, tras validar `consentHistory`/`consentPayment` (línea ~108-115), añadir (con `adminClient` ya creado más abajo — mover este bloque tras crear `adminClient`):

```ts
    const usarVale = body.usar_vale === true;
    let valeId: string | null = null;
    if (usarVale) {
      const { data: vale } = await adminClient
        .from("session_vouchers")
        .select("id")
        .eq("student_id", studentId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!vale) return json({ error: "No tienes un vale disponible." }, 400);
      valeId = vale.id as string;
    }
```

> Nota: `adminClient` se crea en la línea ~117 (`const adminClient = createClient(...)`). Coloca el bloque de validación de vale **después** de esa línea y **antes** del insert de `bookings`.

- [ ] **Step 2: Canjear el vale tras confirmar la reserva**

Tras `const confirmation = await confirmarBooking(adminClient, booking.id as string);` (línea ~177-180), añadir:

```ts
    if (valeId) {
      await adminClient
        .from("session_vouchers")
        .update({ status: "redeemed", redeemed_booking_id: booking.id })
        .eq("id", valeId)
        .eq("status", "active");
    }
```

- [ ] **Step 3: Verificar edge**

Run: `deno task check:edge && deno task lint:edge`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-booking/index.ts
git commit -m "feat(cancelar): create-booking canjea vale de sesión"
```

---

## Task 6: Frontend — cancelar/reprogramar en `reservar-sesion`

**Files:**
- Modify: `src/routes/reservar-sesion.tsx`

**Interfaces:**
- Consumes: Edge Function `manage-booking` (Tasks 3-4).
- Produces: en cada reserva próxima, acciones Cancelar/Reprogramar con la política y el selector de reembolso/huecos.

- [ ] **Step 1: Helper de ventana + invocador de `manage-booking`**

En `reservar-sesion.tsx`, junto a los otros helpers, añadir:

```tsx
function horasHasta(startsAt: string | null): number {
  if (!startsAt) return Infinity;
  return (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
}

async function invokeManageBooking(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sesión expirada");
  const { data, error } = await supabase.functions.invoke("manage-booking", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: payload,
  });
  if (error || data?.error) throw new Error(data?.error ?? error?.message);
  return data;
}
```

- [ ] **Step 2: Estado del modal en `ReservarSesionPage`**

Añadir estado para el modal de gestión:

```tsx
  const [manage, setManage] = useState<
    | { booking: MyBooking; mode: "cancel" | "reschedule" }
    | null
  >(null);
  const [manageBusy, setManageBusy] = useState(false);
```

- [ ] **Step 3: Botones en `BookingCard`**

`BookingCard` debe recibir dos callbacks nuevos: `onCancel(b)` y `onReschedule(b)`. Añádelos a sus props y, dentro (solo para reservas futuras confirmadas), renderiza la fila de acciones:

```tsx
      {isConfirmed && isFuture && (
        <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: L.line }}>
          <button
            type="button"
            disabled={horasHasta(b.slot_starts_at) < 24}
            onClick={() => onReschedule(b)}
            title={horasHasta(b.slot_starts_at) < 24 ? (isEN ? "Only up to 24h before" : "Solo hasta 24h antes") : undefined}
            className="lib-press rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{ borderColor: L.line, color: L.ink }}
          >
            {isEN ? "Reschedule" : "Reprogramar"}
          </button>
          <button
            type="button"
            disabled={horasHasta(b.slot_starts_at) < 48}
            onClick={() => onCancel(b)}
            title={horasHasta(b.slot_starts_at) < 48 ? (isEN ? "Only up to 48h before" : "Solo hasta 48h antes") : undefined}
            className="lib-press rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{ borderColor: "#FB7185", color: "#BE123C" }}
          >
            {isEN ? "Cancel" : "Cancelar"}
          </button>
        </div>
      )}
```

Pasa los callbacks donde se renderiza `BookingCard` en `upcomingBookings.map`:
`onCancel={(bk) => setManage({ booking: bk, mode: "cancel" })}` y
`onReschedule={(bk) => setManage({ booking: bk, mode: "reschedule" })}`.

- [ ] **Step 4: Modal de cancelar (selector vale/dinero)**

Tras el `<main>` (antes de cerrar el root `</div>`), renderiza el modal cuando `manage?.mode === "cancel"`:

```tsx
      {manage?.mode === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.45)" }} onClick={() => !manageBusy && setManage(null)}>
          <div className="w-full max-w-md rounded-2xl border p-5" style={{ backgroundColor: L.surface, borderColor: L.line }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold" style={{ color: L.ink }}>
              {isEN ? "Cancel session" : "Cancelar sesión"}
            </h3>
            <p className="mt-1 text-sm" style={{ color: L.muted }}>
              {isEN ? "You're cancelling with 100% refund. Choose how:" : "Cancelas con reembolso del 100%. Elige cómo:"}
            </p>
            <div className="mt-3 grid gap-2">
              <button type="button" disabled={manageBusy}
                onClick={async () => {
                  setManageBusy(true);
                  try { await invokeManageBooking({ booking_id: manage.booking.id, action: "cancel", refund: "voucher" });
                    toast.success(isEN ? "Cancelled. Voucher issued." : "Cancelada. Vale emitido."); setManage(null); void cargarMisReservas();
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setManageBusy(false); }
                }}
                className="lib-press rounded-xl border px-4 py-3 text-left text-sm font-semibold" style={{ borderColor: L.primary, color: L.ink }}>
                {isEN ? "Session voucher (instant)" : "Vale de sesión (inmediato)"}
              </button>
              <button type="button" disabled={manageBusy}
                onClick={async () => {
                  setManageBusy(true);
                  try { await invokeManageBooking({ booking_id: manage.booking.id, action: "cancel", refund: "money" });
                    toast.success(isEN ? "Cancelled. Money refund requested." : "Cancelada. Reembolso solicitado."); setManage(null); void cargarMisReservas();
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setManageBusy(false); }
                }}
                className="lib-press rounded-xl border px-4 py-3 text-left text-sm font-semibold" style={{ borderColor: L.line, color: L.ink }}>
                {isEN ? "Money refund (manual, slower)" : "Devolución de dinero (manual, tarda)"}
              </button>
            </div>
            <button type="button" disabled={manageBusy} onClick={() => setManage(null)} className="mt-3 text-xs" style={{ color: L.muted }}>
              {isEN ? "Keep my session" : "Mantener mi sesión"}
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: compila.

- [ ] **Step 6: Commit**

```bash
git add src/routes/reservar-sesion.tsx
git commit -m "feat(cancelar): UI alumno — cancelar con elección vale/dinero"
```

---

## Task 7: Frontend — reprogramar (selector de huecos + vale si no hay)

**Files:**
- Modify: `src/routes/reservar-sesion.tsx`

**Interfaces:**
- Consumes: `manage-booking` reschedule; `booking_slots` disponibles del profe.

- [ ] **Step 1: Modal de reprogramar**

Cuando `manage?.mode === "reschedule"`, cargar los slots disponibles del profe de esa reserva y mostrarlos para elegir; si no hay, ofrecer vale. Añadir estado:

```tsx
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[] | null>(null);

  useEffect(() => {
    if (manage?.mode !== "reschedule") { setRescheduleSlots(null); return; }
    void (async () => {
      const { data } = await supabase
        .from("booking_slots")
        .select("id, starts_at, ends_at, price_sek, teacher_id")
        .eq("status", "available")
        .eq("teacher_id", manage.booking.teacher_id ?? "")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      setRescheduleSlots((data ?? []) as AvailableSlot[]);
    })();
  }, [manage]);
```

> `MyBooking` necesita `teacher_id`. Si no lo tiene, añádelo al `select` de `cargarMisReservas` y al tipo `MyBooking` (ya se selecciona `teacher_id` en la query base de reservas).

- [ ] **Step 2: Render del modal de reprogramar**

```tsx
      {manage?.mode === "reschedule" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,23,42,0.45)" }} onClick={() => !manageBusy && setManage(null)}>
          <div className="w-full max-w-md rounded-2xl border p-5" style={{ backgroundColor: L.surface, borderColor: L.line }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold" style={{ color: L.ink }}>{isEN ? "Reschedule" : "Reprogramar"}</h3>
            {rescheduleSlots === null ? (
              <p className="mt-2 text-sm" style={{ color: L.muted }}>{isEN ? "Loading…" : "Cargando…"}</p>
            ) : rescheduleSlots.length === 0 ? (
              <div className="mt-2 space-y-3">
                <p className="text-sm" style={{ color: L.muted }}>
                  {isEN ? "No free slots right now. Get a voucher for a future session?" : "No hay huecos libres ahora. ¿Quieres un vale para una sesión futura?"}
                </p>
                <button type="button" disabled={manageBusy}
                  onClick={async () => {
                    setManageBusy(true);
                    try { await invokeManageBooking({ booking_id: manage.booking.id, action: "reschedule", force_voucher_no_slot: true });
                      toast.success(isEN ? "Voucher issued." : "Vale emitido."); setManage(null); void cargarMisReservas();
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setManageBusy(false); }
                  }}
                  className="lib-press rounded-xl px-4 py-2 text-sm font-semibold" style={{ backgroundColor: L.primary, color: "#fff" }}>
                  {isEN ? "Get voucher" : "Conseguir vale"}
                </button>
              </div>
            ) : (
              <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto">
                {rescheduleSlots.map((s) => (
                  <button key={s.id} type="button" disabled={manageBusy}
                    onClick={async () => {
                      setManageBusy(true);
                      try { await invokeManageBooking({ booking_id: manage.booking.id, action: "reschedule", new_slot_id: s.id });
                        toast.success(isEN ? "Rescheduled." : "Reprogramada."); setManage(null); void cargarMisReservas();
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); } finally { setManageBusy(false); }
                    }}
                    className="lib-press rounded-xl border px-3 py-2 text-left text-sm" style={{ borderColor: L.line, color: L.ink }}>
                    {fmtFecha(s.starts_at, isEN, studentTimeZone)} · {fmtHora(s.starts_at, isEN, studentTimeZone)}
                  </button>
                ))}
              </div>
            )}
            <button type="button" disabled={manageBusy} onClick={() => setManage(null)} className="mt-3 text-xs" style={{ color: L.muted }}>{isEN ? "Close" : "Cerrar"}</button>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: compila.

- [ ] **Step 4: Commit**

```bash
git add src/routes/reservar-sesion.tsx
git commit -m "feat(cancelar): UI alumno — reprogramar con selector de huecos y vale"
```

---

## Task 8: Frontend — banner y canje de vale al reservar

**Files:**
- Modify: `src/routes/reservar-sesion.tsx`

**Interfaces:**
- Consumes: tabla `session_vouchers`; `create-booking` con `usar_vale`.

- [ ] **Step 1: Cargar vales activos del alumno**

Añadir estado y carga:

```tsx
  const [valeActivo, setValeActivo] = useState(false);
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("session_vouchers")
        .select("id")
        .eq("student_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      setValeActivo((data ?? []).length > 0);
    })();
  }, [user]);
```

- [ ] **Step 2: Banner + check "usar vale" + enviar en el submit**

Añadir un estado `const [usarVale, setUsarVale] = useState(false);`. En el formulario de reserva (cuando `selectedSlot`), si `valeActivo`, mostrar un check:

```tsx
              {valeActivo && (
                <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: L.primary, color: L.ink }}>
                  <Checkbox checked={usarVale} onCheckedChange={(v) => setUsarVale(v === true)} />
                  {isEN ? "Use my session voucher (free)" : "Usar mi vale de sesión (gratis)"}
                </label>
              )}
```

En `handleSubmit`, en el body de `create-booking`, añadir `usar_vale: usarVale || undefined,` y resetear `setUsarVale(false)` tras éxito.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: compila.

- [ ] **Step 4: Commit**

```bash
git add src/routes/reservar-sesion.tsx
git commit -m "feat(cancelar): banner y canje de vale al reservar"
```

---

## Task 9: Frontend — cancelar sesión (profesor)

**Files:**
- Modify: `src/routes/profesor-sesiones.tsx`

**Interfaces:**
- Consumes: `manage-booking` cancel (profe).

- [ ] **Step 1: Invocador + acción en cada booking**

En `profesor-sesiones.tsx`, añadir un helper `invokeManageBooking` (igual que en Task 6, Step 1) y, en la fila de cada booking de `BookingGroup`/agenda, un botón "Cancelar sesión" que pida confirmación y llame:

```tsx
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("¿Cancelar esta sesión? El alumno recibirá un vale.")) return;
                    try {
                      await invokeManageBooking({ booking_id: b.id, action: "cancel" });
                      toast.success("Sesión cancelada. Vale emitido al alumno.");
                      void cargar();
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
                  }}
                  className="session-press inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                  style={{ borderColor: "#FB7185", color: "#BE123C" }}
                >
                  Cancelar sesión
                </button>
```

> Mostrar solo para bookings `confirmed`/`pending_payment` futuros (no canceladas/pasadas).

- [ ] **Step 2: Ocultar canceladas**

Confirmar que las listas/agenda de `profesor-sesiones` filtran `status === "cancelled"` (la agenda ya lo hace; en los grupos, `proximas`/`historial` no incluyen canceladas). No mostrar canceladas en ninguna lista.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run build`
Expected: compila.

- [ ] **Step 4: Commit**

```bash
git add src/routes/profesor-sesiones.tsx
git commit -m "feat(cancelar): profesor cancela sesión (vale automático al alumno)"
```

---

## Task 10: Admin — reembolsos pendientes + pulido + verificación final

**Files:**
- Modify: `src/routes/admin-bookings.tsx`
- Modify: componentes/rutas de la feature según hallazgos de diseño.

- [ ] **Step 1: Lista de reembolsos pendientes (admin)**

En `admin-bookings.tsx`, añadir una sección que cargue `refund_requests` con `status='pending'` (join al alumno por `student_id` → `perfiles.email`) y los liste con un botón "Marcar procesado" que haga `update({ status: 'processed', processed_at: now, processed_by: adminId }).eq("id", r.id)`. Cargar con el patrón existente del archivo.

- [ ] **Step 2: Pulido UX con ui-ux-pro-max**

Aplicar `frontend-design`/`ui-ux-pro-max` a los modales de cancelar/reprogramar y al banner de vale (jerarquía, estados, foco, `prefers-reduced-motion`, accesibilidad de los diálogos: `role="dialog"`, Esc para cerrar).

- [ ] **Step 3: Verificación final**

Run: `npx tsc --noEmit && npm run build && deno task check:edge && deno task lint:edge`
Expected: todo en verde.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(cancelar): admin reembolsos pendientes + pulido UX y a11y"
```

---

## Self-Review (checklist del autor del plan)

- **Cobertura del spec:**
  - Tablas vales/reembolsos + columnas bookings + RLS → Task 1. ✓
  - Política servidor (48h/24h) → Tasks 3/4. ✓
  - Cancelar (alumno elige vale/dinero; profe → vale auto) → Tasks 3, 6, 9. ✓
  - Reprogramar (≥24h, nuevo slot, vale si no hay) → Tasks 4, 7. ✓
  - Liberar slot + revocar acceso + borrar evento (impersonación) → Tasks 2, 3, 4. ✓
  - Canje de vale al reservar → Tasks 5, 8. ✓
  - Ocultar canceladas de ambas páginas → Tasks 6 (alumno ya filtra cancelled), 9. ✓
  - Admin reembolsos → Task 10. ✓
  - `manage-booking` en deno.json → Task 3. ✓
- **Placeholders:** sin TBD/TODO; el "pulido" (Task 10) depende de hallazgos de diseño, no es placeholder de lógica.
- **Consistencia de tipos:** `manage-booking` body `{ booking_id, action, refund?, new_slot_id?, force_voucher_no_slot? }` usado igual en frontend (Tasks 6-9) y backend (Tasks 3-4). `usar_vale` consistente entre create-booking (Task 5) y UI (Task 8). `session_vouchers`/`refund_requests` campos coherentes con la migración (Task 1).
- **Riesgo conocido (no de código):** el borrado/movimiento de Calendar depende de DWD (ya configurado para `booking@`); fallos no bloquean. El reembolso de dinero es manual (la app solo registra).
