-- Añade columnas de prompt caching a llm_uso para calcular coste real

ALTER TABLE public.llm_uso
  ADD COLUMN IF NOT EXISTS cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_read_tokens     INTEGER NOT NULL DEFAULT 0;
