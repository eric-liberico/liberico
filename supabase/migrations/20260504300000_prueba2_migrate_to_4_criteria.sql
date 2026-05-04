-- Migración completa para cambiar Prueba 2 de 5 criterios (B1, B2) a 4 criterios (B)
-- Combina todos los cambios en una sola transacción para garantizar consistencia

BEGIN;

-- 1. Agregar columnas nuevas si no existen
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS criterio_b int CHECK (criterio_b BETWEEN 0 AND 5);

ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN IF NOT EXISTS justificacion_b text;

-- 2. Migrar datos: usar promedio de B1 y B2 si existen
UPDATE public.evaluaciones_prueba2
SET criterio_b = CASE
  WHEN criterio_b IS NOT NULL THEN criterio_b  -- Ya tiene valor, no cambiar
  WHEN criterio_b1 IS NOT NULL AND criterio_b2 IS NOT NULL
    THEN ROUND((criterio_b1::numeric + criterio_b2::numeric) / 2.0)::int
  WHEN criterio_b1 IS NOT NULL THEN criterio_b1
  WHEN criterio_b2 IS NOT NULL THEN criterio_b2
  ELSE 0
END
WHERE criterio_b IS NULL;

-- 3. Migrar justificaciones
UPDATE public.evaluaciones_prueba2
SET justificacion_b = CASE
  WHEN justificacion_b IS NOT NULL THEN justificacion_b  -- Ya tiene valor, no cambiar
  WHEN justificacion_b1 IS NOT NULL AND justificacion_b2 IS NOT NULL
    THEN justificacion_b1 || ' ' || justificacion_b2
  WHEN justificacion_b1 IS NOT NULL THEN justificacion_b1
  WHEN justificacion_b2 IS NOT NULL THEN justificacion_b2
  ELSE NULL
END
WHERE justificacion_b IS NULL;

-- 4. Eliminar puntuacion_total (es una columna generada)
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN IF EXISTS puntuacion_total;

-- 5. Eliminar las columnas antiguas que ya hemos migrado
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN IF EXISTS criterio_b1,
DROP COLUMN IF EXISTS criterio_b2,
DROP COLUMN IF EXISTS justificacion_b1,
DROP COLUMN IF EXISTS justificacion_b2;

-- 6. Recrear puntuacion_total con la nueva fórmula (max 20 en lugar de 25)
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN puntuacion_total int GENERATED ALWAYS AS (
  criterio_a + criterio_b + criterio_c + criterio_d
) STORED;

COMMIT;
