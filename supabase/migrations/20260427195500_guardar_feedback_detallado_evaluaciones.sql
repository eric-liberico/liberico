ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS introduccion JSONB,
  ADD COLUMN IF NOT EXISTS parrafos JSONB,
  ADD COLUMN IF NOT EXISTS conclusion JSONB,
  ADD COLUMN IF NOT EXISTS lenguaje_analitico JSONB;
