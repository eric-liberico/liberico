-- Permite que el usuario lea sus propias filas de llm_uso (necesario para mostrar cuotas en cuenta.tsx)
CREATE POLICY "usuario_lee_su_llm_uso"
  ON public.llm_uso FOR SELECT
  USING (user_id = auth.uid());

-- RPC atómica para el simulador oral.
-- Solo cuenta entradas de fase1, de modo que el límite equivale a simulaciones completas.
-- Usa pg_advisory_xact_lock para serializar peticiones concurrentes del mismo usuario.
-- Devuelve true si la plaza fue reservada, false si la cuota está agotada.
CREATE OR REPLACE FUNCTION public.reservar_cuota_simulador(
  p_user_id uuid,
  p_limite integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('simulador:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function = 'create-oral-simulation-session'
      AND modelo = 'elevenlabs-convai-fase1'
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN false;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'create-oral-simulation-session', 'elevenlabs-convai-fase1', 0, 0);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_simulador(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_cuota_simulador(uuid, integer) TO service_role;
