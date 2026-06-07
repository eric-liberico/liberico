BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- Cap global de concurrencia del oral conversacional de Spanish B.
--
-- El worker GPU (Modal) tiene `max_containers = AVATAR_MAX_PARALLEL` (1 alumno =
-- 1 GPU). Hasta ahora, cuando se llenaban todas las GPUs, la sesión nº4 se
-- quedaba en cola dentro de Modal: el alumno esperaba el cold-start de un
-- contenedor que no podía arrancar, con los créditos YA cobrados. Esta RPC deja
-- que `create-oral-b-session` rechace ANTES de cobrar, con un "inténtalo en unos
-- minutos", cuando no hay GPU libre.
--
-- Modelo de "sesión activa": un alumno ocupa como mucho 1 GPU a la vez (sus
-- fases 1/2/3 son secuenciales). Contamos alumnos DISTINTOS con un placeholder
-- de sesión en la ventana de vida máxima de un contenedor (timeout de Modal =
-- 20 min). Excluimos al propio alumno (si reintenta o continúa, reutiliza su
-- slot, no consume uno nuevo). Es deliberadamente conservador: una sesión que
-- terminó antes sigue contando hasta que expira la ventana → como mucho rechaza
-- de más, nunca sobre-provisiona GPU.
-- ════════════════════════════════════════════════════════════════════════════

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
  WHERE edge_function = 'create-oral-b-session'
    AND modelo LIKE 'elevenlabs-convai-oral-b-fase%'
    AND user_id <> p_user_id
    AND created_at >= v_ventana;

  RETURN v_ocupadas < p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.hay_slot_oral_b_global(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hay_slot_oral_b_global(uuid, integer, integer) TO service_role;

COMMIT;
