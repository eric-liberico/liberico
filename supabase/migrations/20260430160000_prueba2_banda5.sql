-- Añade columna de ensayo elevado a banda alta para Prueba 2
ALTER TABLE evaluaciones_prueba2
  ADD COLUMN IF NOT EXISTS ensayo_banda_5 JSONB;
