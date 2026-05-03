-- Endurece las policies de evaluaciones_apuntes_oral para usuarios inactivos,
-- igual que se hizo con evaluaciones_oral en la migración anterior.
DROP POLICY IF EXISTS "Alumno lee sus revisiones de apuntes" ON public.evaluaciones_apuntes_oral;
DROP POLICY IF EXISTS "Alumno crea sus revisiones de apuntes" ON public.evaluaciones_apuntes_oral;

CREATE POLICY "Alumno lee sus revisiones de apuntes"
  ON public.evaluaciones_apuntes_oral FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND activo = true
    )
  );

CREATE POLICY "Alumno crea sus revisiones de apuntes"
  ON public.evaluaciones_apuntes_oral FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE user_id = auth.uid() AND activo = true
    )
  );
