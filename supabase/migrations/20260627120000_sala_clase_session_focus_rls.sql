-- Sala de clase 1:1: enfoque de sesión + acceso del profe a P2/Oral
-- Migración aditiva. No reescribe migraciones aplicadas.

-- 1) Enfoque de la sesión elegido por el alumno al reservar
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS session_focus text
  CHECK (session_focus IS NULL OR session_focus IN ('p1', 'p2', 'oral'));

-- 2) El profe con acceso temporal activo puede leer las correcciones de P2 del alumno
CREATE POLICY "Profesor lee prueba2 con acceso activo"
  ON public.evaluaciones_prueba2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_teacher_access bta
      WHERE bta.teacher_id = auth.uid()
        AND bta.student_id = evaluaciones_prueba2.user_id
        AND bta.access_starts_at <= now()
        AND (bta.access_ends_at IS NULL OR bta.access_ends_at > now())
        AND bta.revoked_at IS NULL
    )
  );

-- 3) El profe con acceso temporal activo puede leer las correcciones de Oral del alumno
CREATE POLICY "Profesor lee oral con acceso activo"
  ON public.evaluaciones_oral FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_teacher_access bta
      WHERE bta.teacher_id = auth.uid()
        AND bta.student_id = evaluaciones_oral.user_id
        AND bta.access_starts_at <= now()
        AND (bta.access_ends_at IS NULL OR bta.access_ends_at > now())
        AND bta.revoked_at IS NULL
    )
  );

-- 4) Índice para filtrar correcciones de oral por alumno (P2 ya tiene el suyo)
CREATE INDEX IF NOT EXISTS idx_evaluaciones_oral_user_created
  ON public.evaluaciones_oral(user_id, created_at DESC);
