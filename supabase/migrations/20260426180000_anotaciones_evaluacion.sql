-- Anotaciones inline del profesor sobre el análisis del alumno
CREATE TABLE public.anotaciones_evaluacion (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id       UUID         NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  profesor_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inicio              INTEGER      NOT NULL CHECK (inicio >= 0),
  fin                 INTEGER      NOT NULL CHECK (fin > inicio),
  texto_seleccionado  TEXT         NOT NULL,
  tipo                TEXT         NOT NULL CHECK (tipo IN ('subrayado', 'sugerencia', 'correccion')),
  comentario          TEXT         NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.anotaciones_evaluacion ENABLE ROW LEVEL SECURITY;

-- El profesor gestiona sus propias anotaciones
CREATE POLICY "profesor_gestiona_propias_anotaciones"
  ON public.anotaciones_evaluacion
  FOR ALL
  USING  (auth.uid() = profesor_id)
  WITH CHECK (auth.uid() = profesor_id);

-- El alumno puede leer las anotaciones de sus propias evaluaciones
CREATE POLICY "alumno_lee_anotaciones_propias"
  ON public.anotaciones_evaluacion
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      WHERE e.id = anotaciones_evaluacion.evaluacion_id
        AND e.user_id = auth.uid()
    )
  );
