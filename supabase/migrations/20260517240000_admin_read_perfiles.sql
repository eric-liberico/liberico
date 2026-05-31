-- Permite que el panel admin lea perfiles completos desde el cliente autenticado.
-- Se usa como fallback para mostrar saldos de créditos aunque la Edge Function
-- admin-get-users aún no esté desplegada con el campo creditos.

DROP POLICY IF EXISTS "Admins leen perfiles" ON public.perfiles;
CREATE POLICY "Admins leen perfiles"
  ON public.perfiles FOR SELECT
  USING (public.has_active_role(auth.uid(), 'admin'));
