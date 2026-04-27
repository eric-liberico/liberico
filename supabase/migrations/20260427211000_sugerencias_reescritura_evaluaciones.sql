ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS sugerencias_reescritura JSONB;
