-- Comentario estructurado del profesor sobre la evaluación de un alumno.
-- Uno por evaluación por profesor (UNIQUE); se actualiza con UPSERT.
CREATE TABLE public.comentarios_profesor (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID         NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  profesor_id   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido     TEXT         NOT NULL,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (evaluacion_id, profesor_id)
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER comentarios_profesor_updated_at
  BEFORE UPDATE ON public.comentarios_profesor
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.comentarios_profesor ENABLE ROW LEVEL SECURITY;

-- El profesor gestiona sus propios comentarios
CREATE POLICY "profesor_gestiona_propios_comentarios"
  ON public.comentarios_profesor
  FOR ALL
  USING  (auth.uid() = profesor_id)
  WITH CHECK (auth.uid() = profesor_id);

-- El alumno puede leer los comentarios sobre sus propias evaluaciones
CREATE POLICY "alumno_lee_comentarios_propios"
  ON public.comentarios_profesor
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      WHERE e.id = comentarios_profesor.evaluacion_id
        AND e.user_id = auth.uid()
    )
  );
