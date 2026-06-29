-- ════════════════════════════════════════════════════════════════════════════
-- Renombrado de edge functions — Lote 1: Spanish B (spab-*).
--
-- create-oral-b-session → spab-oral-session. El string edge_function que se
-- registra en llm_uso lo escriben estos RPCs (no el código de la función), así
-- que los actualizamos aquí. Durante/tras el cutover contamos por el nombre
-- VIEJO y el NUEVO (IN (...)) para no perder cuota con filas en vuelo, e
-- INSERTAMOS ya el nombre nuevo. El `modelo` (elevenlabs-convai-oral-b-fase*) NO
-- cambia: no es un nombre de función.
--
-- Las demás funciones spab-* (evaluate-paper1/2-b, evaluate-oral-b) usan el RPC
-- genérico reservar_cuota_paper (p_edge_function por parámetro) → su cambio va
-- solo en el TS. generate-questions-paper2-b y tts-listening-b cuentan su cuota
-- en el TS (con .in([nuevo, viejo])).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Reserva de cuota para INICIAR sesión (Parte 1).
CREATE OR REPLACE FUNCTION public.reservar_cuota_oral_b_sesion(
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
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('oral-b-sesion:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function IN ('spab-oral-session', 'create-oral-b-session')
      AND modelo = 'elevenlabs-convai-oral-b-fase1'
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'spab-oral-session', 'elevenlabs-convai-oral-b-fase1', 0, 0)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_oral_b_sesion(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_cuota_oral_b_sesion(uuid, integer) TO service_role;

-- 2. Continuación a Parte 2/3 (sin cobro extra).
CREATE OR REPLACE FUNCTION public.reservar_continuacion_oral_b(
  p_user_id uuid,
  p_fase integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ventana timestamptz := now() - interval '2 hours';
  v_id uuid;
  v_prev integer;
  v_actual integer;
  v_modelo_prev text := 'elevenlabs-convai-oral-b-fase' || (p_fase - 1)::text;
  v_modelo_act  text := 'elevenlabs-convai-oral-b-fase' || p_fase::text;
BEGIN
  IF p_fase NOT IN (2, 3) THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('oral-b-sesion:' || p_user_id::text)::bigint);

  SELECT count(*) INTO v_prev
  FROM public.llm_uso
  WHERE user_id = p_user_id
    AND edge_function IN ('spab-oral-session', 'create-oral-b-session')
    AND modelo = v_modelo_prev
    AND created_at >= v_ventana;

  SELECT count(*) INTO v_actual
  FROM public.llm_uso
  WHERE user_id = p_user_id
    AND edge_function IN ('spab-oral-session', 'create-oral-b-session')
    AND modelo = v_modelo_act
    AND created_at >= v_ventana;

  IF v_prev <= v_actual THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'spab-oral-session', v_modelo_act, 0, 0)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_continuacion_oral_b(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_continuacion_oral_b(uuid, integer) TO service_role;

-- 3. Cap global de concurrencia (GPU). Ventana corta → el IN cubre el cutover.
CREATE OR REPLACE FUNCTION public.hay_slot_oral_b_global(
  p_user_id uuid,
  p_max integer,
  p_ventana_min integer DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ventana timestamptz := now() - make_interval(mins => p_ventana_min);
  v_ocupadas integer;
BEGIN
  SELECT count(DISTINCT user_id) INTO v_ocupadas
  FROM public.llm_uso
  WHERE edge_function IN ('spab-oral-session', 'create-oral-b-session')
    AND modelo LIKE 'elevenlabs-convai-oral-b-fase%'
    AND user_id <> p_user_id
    AND created_at >= v_ventana;

  RETURN v_ocupadas < p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.hay_slot_oral_b_global(uuid, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hay_slot_oral_b_global(uuid, integer, integer) TO service_role;

COMMIT;
