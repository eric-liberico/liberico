-- Chats múltiples para el profesor

CREATE TABLE public.chats_profesor (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  titulo      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chats_profesor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profesores gestionan sus chats"
  ON public.chats_profesor
  USING (auth.uid() = profesor_id)
  WITH CHECK (auth.uid() = profesor_id);

CREATE INDEX idx_chats_profesor
  ON public.chats_profesor(profesor_id, created_at DESC);

-- Añadir chat_id a mensajes (nullable para compatibilidad con mensajes anteriores)
ALTER TABLE public.mensajes_chat_profesor
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats_profesor ON DELETE CASCADE;

CREATE INDEX idx_mensajes_chat_id
  ON public.mensajes_chat_profesor(chat_id, created_at);
