-- Permite al profesor modificar tareas del plan activo de sus alumnos
CREATE POLICY "profesor_actualiza_tareas_alumnos"
  ON public.tareas_plan
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.planes_estudio pe
      JOIN public.perfiles pf ON pf.user_id = pe.user_id
      WHERE pe.id = tareas_plan.plan_id
        AND pf.profesor_id = auth.uid()
    )
  );
