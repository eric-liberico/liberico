-- ─────────────────────────────────────────────────────────────────────────────
-- Spanish B — Prueba 2: desactivar el contenido de ejemplo
--
-- Oculta del alumno los audios y textos de ejemplo sembrados para pruebas.
-- No se eliminan: quedan disponibles (inactivos) en el panel admin.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE public.audios_paper2_b
SET activo = false
WHERE title_es LIKE '(Ejemplo)%';

UPDATE public.textos_paper2_b
SET activo = false
WHERE title_es LIKE '(Ejemplo)%';

COMMIT;
