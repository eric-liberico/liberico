-- Añadir soporte de simulaciones al módulo oral
ALTER TABLE evaluaciones_oral
  ADD COLUMN IF NOT EXISTS es_simulacion BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN evaluaciones_oral.es_simulacion IS
  'TRUE cuando la evaluación proviene de una sesión de simulación con el avatar IA';
