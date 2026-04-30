-- Añade columna de sugerencias de reescritura a la tabla de Prueba 2
ALTER TABLE evaluaciones_prueba2
  ADD COLUMN IF NOT EXISTS sugerencias_reescritura JSONB;
