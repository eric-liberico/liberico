BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- Oral conversacional de Spanish B (sesión en vivo con avatar)
-- Reutiliza la tabla evaluaciones_oral_b (criterios A/B1/B2/C → /30) añadiendo
-- el modo "conversacion" y los artefactos de la sesión grabada. RLS ya existente
-- por user_id sigue aplicando a las columnas nuevas.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Columnas de la sesión conversacional en evaluaciones_oral_b.
ALTER TABLE public.evaluaciones_oral_b
  ADD COLUMN IF NOT EXISTS modo               TEXT NOT NULL DEFAULT 'asincrono',
  ADD COLUMN IF NOT EXISTS conversation_id    TEXT,
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS transcript_limpio  TEXT,
  ADD COLUMN IF NOT EXISTS transcript_verbatim TEXT,
  ADD COLUMN IF NOT EXISTS dialogo            JSONB,
  ADD COLUMN IF NOT EXISTS pronunciacion      JSONB;

ALTER TABLE public.evaluaciones_oral_b
  DROP CONSTRAINT IF EXISTS evaluaciones_oral_b_modo_check;
ALTER TABLE public.evaluaciones_oral_b
  ADD CONSTRAINT evaluaciones_oral_b_modo_check
  CHECK (modo IN ('asincrono', 'conversacion'));

COMMENT ON COLUMN public.evaluaciones_oral_b.modo IS
  'asincrono (guion pegado/dictado) | conversacion (sesión en vivo con avatar IA).';
COMMENT ON COLUMN public.evaluaciones_oral_b.conversation_id IS
  'ID de la conversación de ElevenLabs ConvAI (solo modo conversacion).';
COMMENT ON COLUMN public.evaluaciones_oral_b.audio_storage_path IS
  'Ruta temporal en el bucket audio-oral de la grabación cruda del alumno; se borra tras transcribir.';
COMMENT ON COLUMN public.evaluaciones_oral_b.transcript_limpio IS
  'Transcripción "limpia" de ElevenLabs (entender el contenido); base de B1/B2/C.';
COMMENT ON COLUMN public.evaluaciones_oral_b.transcript_verbatim IS
  'Transcripción verbatim (Whisper) que conserva errores L2; base del criterio A (lengua).';
COMMENT ON COLUMN public.evaluaciones_oral_b.dialogo IS
  'Array de turnos {source: "ai"|"user", text, parte} de la sesión completa.';
COMMENT ON COLUMN public.evaluaciones_oral_b.pronunciacion IS
  'Valoración opcional de pronunciación/entonación (parte del criterio A en el oral).';

-- 2a. RPC atómica de cuota para INICIAR una sesión oral B en vivo (Parte 1).
-- Cuenta sesiones iniciadas (placeholders de modelo …-fase1) en 24 h.
-- Devuelve el uuid de la fila reservada (para poder borrarla y reembolsar si falla
-- ElevenLabs), o NULL si la cuota diaria está agotada.
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
      AND edge_function = 'create-oral-b-session'
      AND modelo = 'elevenlabs-convai-oral-b-fase1'
      AND created_at >= v_hace24h
  ) >= p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'create-oral-b-session', 'elevenlabs-convai-oral-b-fase1', 0, 0)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_cuota_oral_b_sesion(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_cuota_oral_b_sesion(uuid, integer) TO service_role;

-- 2b. RPC para CONTINUAR a la Parte 2 o 3 (no se cobran créditos extra).
-- Solo permite la fase p_fase si hay una fase anterior pendiente de continuar en
-- las últimas 2 h: count(fase p_fase-1) > count(fase p_fase). Inserta placeholder
-- y devuelve su id, o NULL si no hay sesión activa para continuar.
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
    AND edge_function = 'create-oral-b-session'
    AND modelo = v_modelo_prev
    AND created_at >= v_ventana;

  SELECT count(*) INTO v_actual
  FROM public.llm_uso
  WHERE user_id = p_user_id
    AND edge_function = 'create-oral-b-session'
    AND modelo = v_modelo_act
    AND created_at >= v_ventana;

  IF v_prev <= v_actual THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.llm_uso (user_id, edge_function, modelo, tokens_entrada, tokens_salida)
  VALUES (p_user_id, 'create-oral-b-session', v_modelo_act, 0, 0)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_continuacion_oral_b(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_continuacion_oral_b(uuid, integer) TO service_role;

-- 3. Precio en créditos de la sesión completa (conversación + transcripción + feedback).
INSERT INTO public.evaluacion_precios (concepto, creditos, descripcion) VALUES
  ('oral-b-session', 5.00, 'Spanish B Oral — sesión conversacional en vivo + feedback /30')
ON CONFLICT (concepto) DO NOTHING;

COMMIT;
