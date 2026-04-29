-- RPC: reservar_cuota_evaluacion
-- Atomically checks the 24-hour quota for a user and, if under the limit,
-- inserts a placeholder row in llm_uso to reserve the slot.
--
-- Returns the UUID of the placeholder row, or NULL if the quota is exhausted.
--
-- The caller MUST:
--   1. UPDATE the row with real token counts on Anthropic success, OR
--   2. DELETE the row if the Anthropic call fails or is cancelled.
--
-- The pg_advisory_xact_lock serializes concurrent requests from the same user
-- so the count check and the INSERT are effectively atomic within the same user.
-- The lock is released when the transaction commits (i.e., when the function returns).

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
  -- Transaction-level advisory lock derived from the user_id.
  -- Concurrent requests from the same user wait here instead of racing.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  IF (
    SELECT count(*)
    FROM public.llm_uso
    WHERE user_id       = p_user_id
      AND edge_function = 'evaluate-analysis'
      AND created_at   >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;  -- NULL signals quota exhausted to the caller
  END IF;

  -- Placeholder row: tokens will be updated once Anthropic responds.
  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'evaluate-analysis', 'claude-opus-4-7', 0, 0)
  RETURNING id INTO v_uso_id;

  RETURN v_uso_id;
END;
$$;

-- Only the service role (used by Edge Functions) may call this function.
REVOKE ALL ON FUNCTION public.reservar_cuota_evaluacion(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reservar_cuota_evaluacion(uuid, integer) TO service_role;
