-- ─────────────────────────────────────────────────────────────────────────────
-- Gamificación aislada por asignatura (course_key)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Tabla gamificacion_curso ──────────────────────────────────────────────
-- Reemplaza el uso de columnas xp_total/racha_actual/… en perfiles para XP/racha.
-- Una fila por (user_id, course_key) → progreso completamente aislado.

CREATE TABLE public.gamificacion_curso (
  user_id               uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_key            text    NOT NULL REFERENCES public.courses(key),
  xp_total              integer NOT NULL DEFAULT 0,
  racha_actual          integer NOT NULL DEFAULT 0,
  racha_maxima          integer NOT NULL DEFAULT 0,
  ultima_actividad_fecha text,
  nota_media            real    NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, course_key)
);

ALTER TABLE public.gamificacion_curso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own gamificacion_curso"
  ON public.gamificacion_curso FOR SELECT
  USING (auth.uid() = user_id);

-- Service role administra INSERT/UPDATE desde Edge Functions

-- ── 2. Migrar datos existentes a gamificacion_curso (Spanish A) ──────────────
-- Todos los datos actuales de XP/racha pertenecen a Spanish A.
INSERT INTO public.gamificacion_curso (user_id, course_key, xp_total, racha_actual, racha_maxima, nota_media)
SELECT
  user_id,
  'spanish-a-literature',
  COALESCE(xp_total, 0),
  COALESCE(racha_actual, 0),
  COALESCE(racha_maxima, 0),
  COALESCE(nota_media, 0)
FROM public.perfiles
WHERE xp_total > 0 OR racha_actual > 0
ON CONFLICT (user_id, course_key) DO NOTHING;

-- ── 3. Añadir course_key a logros_desbloqueados ──────────────────────────────
-- Los logros existentes pertenecen a Spanish A.

ALTER TABLE public.logros_desbloqueados
  ADD COLUMN course_key text NOT NULL DEFAULT 'spanish-a-literature'
  REFERENCES public.courses(key);

-- Eliminar unique constraint (user_id, logro_id) — ahora es (user_id, logro_id, course_key)
ALTER TABLE public.logros_desbloqueados
  DROP CONSTRAINT IF EXISTS logros_desbloqueados_user_id_logro_id_key;

ALTER TABLE public.logros_desbloqueados
  ADD CONSTRAINT logros_desbloqueados_user_logro_course_key
  UNIQUE (user_id, logro_id, course_key);

-- Actualizar índice
DROP INDEX IF EXISTS public.logros_desbloqueados_user_idx;
CREATE INDEX logros_desbloqueados_user_course_idx
  ON public.logros_desbloqueados(user_id, course_key, desbloqueado_at DESC);

COMMIT;
