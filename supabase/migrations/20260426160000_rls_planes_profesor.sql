-- El profesor puede leer planes de estudio y tareas de sus alumnos

CREATE POLICY "Profesores leen planes de sus alumnos"
  ON public.planes_estudio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = planes_estudio.user_id
        AND profesor_id = auth.uid()
    )
  );

CREATE POLICY "Profesores leen tareas de planes de sus alumnos"
  ON public.tareas_plan FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
    )
  );
