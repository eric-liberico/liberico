-- Elimina la policy UPDATE abierta en evaluaciones_oral.
-- generate-oral-feedback y generate-oral-annotations ahora usan service role (adminClient)
-- para actualizar sus filas, eliminando la necesidad de un UPDATE policy para usuarios anon.
DROP POLICY IF EXISTS "Users update own evaluaciones_oral" ON public.evaluaciones_oral;
