-- Revierte los cambios a Prueba 2: vuelve a 5 criterios (B1, B2 en lugar de B)
-- Restaura el esquema original con criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d

BEGIN;

-- 1. Eliminar la columna puntuacion_total que depende de criterio_b
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN IF EXISTS puntuacion_total;

-- 2. Recrear los criterios B1 y B2 desde criterio_b (usando el promedio como base)
-- Nota: Si criterio_b es el promedio de B1 y B2, reconstruimos como valores iguales
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS criterio_b1 int CHECK (criterio_b1 BETWEEN 0 AND 5);

ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS criterio_b2 int CHECK (criterio_b2 BETWEEN 0 AND 5);

-- 3. Restaurar B1 y B2 desde el valor de B (ambos reciben el mismo valor que B)
UPDATE public.evaluaciones_prueba2
SET
  criterio_b1 = COALESCE(criterio_b1, criterio_b),
  criterio_b2 = COALESCE(criterio_b2, criterio_b)
WHERE criterio_b1 IS NULL OR criterio_b2 IS NULL;

-- 4. Recrear justificaciones B1 y B2 desde justificacion_b
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS justificacion_b1 text;

ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS justificacion_b2 text;

UPDATE public.evaluaciones_prueba2
SET
  justificacion_b1 = COALESCE(justificacion_b1, justificacion_b),
  justificacion_b2 = COALESCE(justificacion_b2, '')
WHERE justificacion_b1 IS NULL;

-- 5. Eliminar las columnas nuevas que no queremos
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN IF EXISTS criterio_b,
DROP COLUMN IF EXISTS justificacion_b;

-- 6. Recrear puntuacion_total con la fórmula original (A + B1 + B2 + C + D = /25)
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN puntuacion_total int GENERATED ALWAYS AS (
  criterio_a + criterio_b1 + criterio_b2 + criterio_c + criterio_d
) STORED;

COMMIT;
