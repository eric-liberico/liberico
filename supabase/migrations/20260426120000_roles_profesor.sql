-- Fase 4: Sistema de roles (alumno / profesor) y chat del profesor

-- ── PERFILES ─────────────────────────────────────────────────────────────────

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'alumno'
    CHECK (rol IN ('alumno', 'profesor'));

-- ── HISTORIAL DE CHAT DEL PROFESOR CON CLAUDE ────────────────────────────────

CREATE TABLE public.mensajes_chat_profesor (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rol         TEXT        NOT NULL CHECK (rol IN ('user', 'assistant')),
  contenido   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mensajes_chat_profesor ENABLE ROW LEVEL SECURITY;

-- El profesor solo puede leer y escribir sus propios mensajes
CREATE POLICY "Profesores gestionan sus mensajes"
  ON public.mensajes_chat_profesor
  USING (auth.uid() = profesor_id)
  WITH CHECK (auth.uid() = profesor_id);

CREATE INDEX idx_mensajes_chat_profesor
  ON public.mensajes_chat_profesor(profesor_id, created_at);
