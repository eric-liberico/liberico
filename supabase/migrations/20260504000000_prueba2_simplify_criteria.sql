-- Migración para simplificar criterios de Prueba 2 de 5 a 4 criterios
-- Criterio B1 (Análisis formal) y B2 (Comparación) se combinan en B (Análisis y evaluación)
-- Puntuación máxima: 25 -> 20

-- 1. Agregar columnas nuevas
ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN criterio_b int CHECK (criterio_b BETWEEN 0 AND 5),
ADD COLUMN justificacion_b text,
ADD COLUMN sugerencias_reescritura jsonb,
ADD COLUMN ensayo_banda_5 jsonb;

-- 2. Migrar datos existentes: usar promedio de B1 y B2
UPDATE public.evaluaciones_prueba2
SET criterio_b = CASE
  WHEN criterio_b1 IS NOT NULL AND criterio_b2 IS NOT NULL
    THEN ROUND((criterio_b1::numeric + criterio_b2::numeric) / 2.0)::int
  WHEN criterio_b1 IS NOT NULL
    THEN criterio_b1
  WHEN criterio_b2 IS NOT NULL
    THEN criterio_b2
  ELSE 0
END;

-- 3. Migrar justificaciones: combinar si ambas existen, o usar la que hay
UPDATE public.evaluaciones_prueba2
SET justificacion_b = CASE
  WHEN justificacion_b1 IS NOT NULL AND justificacion_b2 IS NOT NULL
    THEN justificacion_b1 || ' ' || justificacion_b2
  WHEN justificacion_b1 IS NOT NULL
    THEN justificacion_b1
  WHEN justificacion_b2 IS NOT NULL
    THEN justificacion_b2
  ELSE NULL
END;

-- 4. Actualizar la columna puntuacion_total para usar el nuevo criterio_b
-- Primero necesitamos hacer una columna temporal sin el GENERATED ALWAYS
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN puntuacion_total;

ALTER TABLE public.evaluaciones_prueba2
ADD COLUMN puntuacion_total int GENERATED ALWAYS AS (
  criterio_a + criterio_b + criterio_c + criterio_d
) STORED;

-- 5. Eliminar las columnas antiguas (B1, B2)
ALTER TABLE public.evaluaciones_prueba2
DROP COLUMN criterio_b1,
DROP COLUMN criterio_b2,
DROP COLUMN justificacion_b1,
DROP COLUMN justificacion_b2;
