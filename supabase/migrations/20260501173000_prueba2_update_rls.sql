-- Alinea las políticas de Prueba 2 con Prueba 1 para poder guardar artefactos generados.
DROP POLICY IF EXISTS "Users select own evaluaciones_prueba2" ON public.evaluaciones_prueba2;
CREATE POLICY "Users select own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR SELECT
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users insert own evaluaciones_prueba2" ON public.evaluaciones_prueba2;
CREATE POLICY "Users insert own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users update own evaluaciones_prueba2" ON public.evaluaciones_prueba2;
CREATE POLICY "Users update own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_active_role(auth.uid()));

DROP POLICY IF EXISTS "Users delete own evaluaciones_prueba2" ON public.evaluaciones_prueba2;
CREATE POLICY "Users delete own evaluaciones_prueba2"
  ON public.evaluaciones_prueba2 FOR DELETE
  USING (auth.uid() = user_id AND public.has_active_role(auth.uid()));
