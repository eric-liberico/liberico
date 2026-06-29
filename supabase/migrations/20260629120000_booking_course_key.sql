-- ─────────────────────────────────────────────────────────────────────────────
-- Snapshot del curso (Lengua A / Lengua B) en cada reserva 1:1
-- ─────────────────────────────────────────────────────────────────────────────
-- perfiles.course_key es MUTABLE: cambia cuando el alumno cambia de asignatura
-- (useAuth.handleSetCourseKey hace UPDATE perfiles SET course_key). Por eso no
-- sirve para etiquetar reservas: todas las reservas de un alumno mostrarían su
-- curso ACTUAL, no el que tenían al reservar. Guardamos el curso en la propia
-- reserva al crearla.
--
-- Nullable y sin default a propósito: las reservas creadas antes de esta columna
-- no tienen curso conocido (no lo inventamos) y la UI simplemente no muestra
-- el badge para ellas.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS course_key text REFERENCES public.courses(key);

COMMENT ON COLUMN public.bookings.course_key IS
  'Curso activo del alumno al crear la reserva (snapshot de perfiles.course_key). NULL en reservas previas a esta columna.';
