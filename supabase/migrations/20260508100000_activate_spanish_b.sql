-- Activación de Spanish B Paper 1 MVP
-- Ahora que la UI (SpanishBPaper1View, branch en /prueba-1) está deployada
-- y la edge function evaluate-paper1-b funciona, hacemos visible el curso
-- y los 3 estímulos seed.

BEGIN;

-- Curso visible en /asignaturas (las RLS de courses filtran is_active=true).
UPDATE public.courses
  SET is_active = true
  WHERE key = 'spanish-b-language';

-- Activar los 3 prompts seed para que aparezcan en el dropdown del formulario.
UPDATE public.prompts_paper1_b
  SET activo = true
  WHERE activo = false;

COMMIT;
