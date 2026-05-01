-- Eliminar política duplicada (ya existe users_read_own_llm_uso de 20260427130000)
DROP POLICY IF EXISTS "usuario_lee_su_llm_uso" ON public.llm_uso;

-- reservar_cuota_simulador: ahora devuelve uuid del registro reservado (NULL = cuota agotada).
-- DROP necesario porque el tipo de retorno cambia de boolean a uuid.
-- El caller cancela la reserva borrando la fila si ElevenLabs falla.
DROP FUNCTION IF EXISTS public.reservar_cuota_simulador(uuid, integer);

CREATE FUNCTION public.reservar_cuota_simulador(
  p_user_id uuid,
  p_limite integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hace24h timestamptz := now() - interval '24 hours';
  v_uso_id  uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('simulador:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id       = p_user_id
      AND edge_function = 'create-oral-simulation-session'
      AND modelo        = 'elevenlabs-convai-fase1'
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'create-oral-simulation-session', 'elevenlabs-convai-fase1', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_simulador(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_cuota_simulador(uuid, integer) TO service_role;

-- reservar_fase2_simulador: permite fase 2 solo si count(fase1) > count(fase2) en las últimas 24 h.
-- Inserta la fila de fase2 de forma atómica y devuelve su id (NULL = sin fase1 activa).
CREATE OR REPLACE FUNCTION public.reservar_fase2_simulador(
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hace24h  timestamptz := now() - interval '24 hours';
  v_uso_id   uuid;
  v_fase1    integer;
  v_fase2    integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('simulador:' || p_user_id::text)::bigint);

  SELECT count(*) INTO v_fase1
  FROM public.llm_uso
  WHERE user_id       = p_user_id
    AND edge_function = 'create-oral-simulation-session'
    AND modelo        = 'elevenlabs-convai-fase1'
    AND created_at   >= v_hace24h;

  SELECT count(*) INTO v_fase2
  FROM public.llm_uso
  WHERE user_id       = p_user_id
    AND edge_function = 'create-oral-simulation-session'
    AND modelo        = 'elevenlabs-convai-fase2'
    AND created_at   >= v_hace24h;

  IF v_fase1 <= v_fase2 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'create-oral-simulation-session', 'elevenlabs-convai-fase2', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_fase2_simulador(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_fase2_simulador(uuid) TO service_role;
