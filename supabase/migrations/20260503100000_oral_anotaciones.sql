-- Columna para anotaciones localizables generadas bajo demanda en evaluaciones_oral
ALTER TABLE evaluaciones_oral ADD COLUMN IF NOT EXISTS anotaciones JSONB;
