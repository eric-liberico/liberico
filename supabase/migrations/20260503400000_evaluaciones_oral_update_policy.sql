-- UPDATE policy para evaluaciones_oral: las funciones generate-oral-feedback y
-- generate-oral-annotations guardan feedback/anotaciones actualizando filas existentes
-- con el cliente anon autenticado como el propio alumno.
CREATE POLICY "Users update own evaluaciones_oral"
  ON public.evaluaciones_oral FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
