-- Corrige recursión infinita en RLS introducida en 20260429210000_booking_tables.sql.
--
-- El problema: la política "Profesor lee perfil de alumno con acceso activo" en `perfiles`
-- consulta `booking_teacher_access`, cuyas políticas de admin consultan `perfiles` a su vez,
-- creando un ciclo infinito que rompe todas las queries a `perfiles` (incluida la lectura del
-- propio rol del usuario en useAuth, que defaultea a 'alumno' al fallar).
--
-- Solución: reemplazar todas las políticas que consultan `perfiles` directamente (causando el
-- ciclo) por comprobaciones via `public.has_active_role()`, función SECURITY DEFINER que
-- accede a `perfiles` sin disparar RLS.

-- ── booking_slots ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin gestiona slots" ON booking_slots;
CREATE POLICY "Admin gestiona slots"
  ON booking_slots FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- ── bookings ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin gestiona reservas" ON bookings;
CREATE POLICY "Admin gestiona reservas"
  ON bookings FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- ── booking_teacher_access ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin gestiona accesos" ON booking_teacher_access;
CREATE POLICY "Admin gestiona accesos"
  ON booking_teacher_access FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- ── booking_notes ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin lee notas" ON booking_notes;
CREATE POLICY "Admin lee notas"
  ON booking_notes FOR SELECT
  USING (public.has_active_role(auth.uid(), 'admin'));

-- ── teacher_profiles ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin gestiona perfiles de profesor" ON teacher_profiles;
CREATE POLICY "Admin gestiona perfiles de profesor"
  ON teacher_profiles FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- ── perfiles: eliminar la política que causaba el ciclo ───────────────────────
-- La consulta a booking_teacher_access desde una política SELECT de `perfiles`
-- dispara las políticas de booking_teacher_access, que a su vez consultan `perfiles`.
DROP POLICY IF EXISTS "Profesor lee perfil de alumno con acceso activo" ON perfiles;

-- La sustituimos por una función SECURITY DEFINER que rompe el ciclo.
CREATE OR REPLACE FUNCTION public.teacher_has_active_access(
  p_teacher_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM booking_teacher_access
    WHERE teacher_id = p_teacher_id
      AND student_id = p_student_id
      AND access_starts_at <= now()
      AND (access_ends_at IS NULL OR access_ends_at > now())
      AND revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.teacher_has_active_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_has_active_access(uuid, uuid) TO authenticated;

CREATE POLICY "Profesor lee perfil de alumno con acceso activo"
  ON perfiles FOR SELECT
  USING (public.teacher_has_active_access(auth.uid(), user_id));

-- ── evaluaciones: misma corrección ───────────────────────────────────────────
DROP POLICY IF EXISTS "Profesor lee evaluaciones con acceso activo" ON evaluaciones;
CREATE POLICY "Profesor lee evaluaciones con acceso activo"
  ON evaluaciones FOR SELECT
  USING (public.teacher_has_active_access(auth.uid(), user_id));
