-- ════════════════════════════════════════════════════════════════════════════
-- Renombrado de edge functions — Lote 2: Language A: Literature (lita-*).
--
-- Estos 6 RPCs de cuota tienen el string edge_function hardcodeado en SQL (es el
-- valor que se escribe en llm_uso). Los actualizamos al nombre nuevo. Igual que
-- en el lote 1: contamos por el nombre VIEJO y el NUEVO (IN (...)) para no perder
-- cuota en el cutover, e INSERTAMOS ya el nombre nuevo. Los `modelo`
-- (claude-opus-4-7, elevenlabs-convai-fase*) NO cambian.
--
-- evaluate-analysis        → lita-p1-evaluate   (reservar_cuota_evaluacion)
-- evaluate-paper2          → lita-p2-evaluate   (reservar_cuota_prueba2)
-- evaluate-oral            → lita-io-evaluate   (reservar_cuota_oral)
-- evaluate-oral-notes      → lita-io-notes-evaluate (reservar_cuota_apuntes_oral)
-- create-oral-simulation-session → lita-io-sim-session
--                            (reservar_cuota_simulador, reservar_fase2_simulador)
--
-- El resto de funciones de Literatura registran edge_function directamente en su
-- TS, o vía reservar_cuota_paper (p_edge_function por parámetro) → cambian en TS.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Paper 1 (análisis)
CREATE OR REPLACE FUNCTION public.reservar_cuota_evaluacion(
  p_user_id  uuid,
  p_limite   integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id   uuid;
  v_hace24h  timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id       = p_user_id
      AND edge_function IN ('lita-p1-evaluate', 'evaluate-analysis')
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-p1-evaluate', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_evaluacion(uuid, integer) FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION public.reservar_cuota_evaluacion(uuid, integer) TO service_role;

-- 2. Paper 2 (comparativo)
CREATE OR REPLACE FUNCTION public.reservar_cuota_prueba2(
  p_user_id uuid,
  p_limite integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id uuid;
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('paper2:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function IN ('lita-p2-evaluate', 'evaluate-paper2')
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-p2-evaluate', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_prueba2(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_cuota_prueba2(uuid, integer) TO service_role;

-- 3. Oral Individual
CREATE OR REPLACE FUNCTION public.reservar_cuota_oral(
  p_user_id uuid,
  p_limite integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id uuid;
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('oral:' || p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id = p_user_id
      AND edge_function IN ('lita-io-evaluate', 'evaluate-oral')
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-io-evaluate', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_oral(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_cuota_oral(uuid, integer) TO service_role;

-- 4. Revisión de apuntes del oral
CREATE OR REPLACE FUNCTION public.reservar_cuota_apuntes_oral(
  p_user_id uuid,
  p_limite  integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id  uuid;
  v_hace24h timestamptz := now() - interval '24 hours';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id       = p_user_id
      AND edge_function IN ('lita-io-notes-evaluate', 'evaluate-oral-notes')
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-io-notes-evaluate', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_apuntes_oral(uuid, integer) FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION public.reservar_cuota_apuntes_oral(uuid, integer) TO service_role;

-- 5. Simulador oral — fase 1
CREATE OR REPLACE FUNCTION public.reservar_cuota_simulador(
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
      AND edge_function IN ('lita-io-sim-session', 'create-oral-simulation-session')
      AND modelo        = 'elevenlabs-convai-fase1'
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-io-sim-session', 'elevenlabs-convai-fase1', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_simulador(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_cuota_simulador(uuid, integer) TO service_role;

-- 6. Simulador oral — fase 2
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
    AND edge_function IN ('lita-io-sim-session', 'create-oral-simulation-session')
    AND modelo        = 'elevenlabs-convai-fase1'
    AND created_at   >= v_hace24h;

  SELECT count(*) INTO v_fase2
  FROM public.llm_uso
  WHERE user_id       = p_user_id
    AND edge_function IN ('lita-io-sim-session', 'create-oral-simulation-session')
    AND modelo        = 'elevenlabs-convai-fase2'
    AND created_at   >= v_hace24h;

  IF v_fase1 <= v_fase2 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'lita-io-sim-session', 'elevenlabs-convai-fase2', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_fase2_simulador(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reservar_fase2_simulador(uuid) TO service_role;

COMMIT;
