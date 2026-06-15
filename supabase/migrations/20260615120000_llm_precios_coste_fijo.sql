-- ════════════════════════════════════════════════════════════════════════════
-- Coste de "modelos" no tokenizados (voz/avatar/transcripción) en el panel admin.
--
-- Hasta ahora llm_precios solo cubría modelos de Anthropic (coste por token), de
-- modo que calcCoste() devolvía 0 para servicios facturados por minuto/llamada:
--   - oral conversacional Spanish B  (elevenlabs-convai-oral-b-fase1/2/3)
--   - simulador oral Spanish A        (elevenlabs-convai-fase1/2)
--   - transcripción y TTS (OpenAI)    (gpt-4o-mini-transcribe, gpt-4o-mini-tts)
-- Estas funciones registran filas en llm_uso con tokens_entrada/salida = 0, así
-- que su coste real era invisible y el margen de la sesión oral (5 créditos)
-- aparecía como ~100% beneficio. Añadimos un coste fijo por fila registrada.
--
-- IMPORTANTE: los valores son ESTIMACIONES iniciales (ElevenLabs ConvAI + Simli
-- por minuto, audio típico por fase). Son editables desde el panel admin y deben
-- recalibrarse cuando se registre la duración real de cada sesión.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Columna de coste fijo (USD) por fila de llm_uso. NULL = no aplica (modelos por token).
ALTER TABLE public.llm_precios
  ADD COLUMN IF NOT EXISTS coste_fijo_usd NUMERIC;

COMMENT ON COLUMN public.llm_precios.coste_fijo_usd IS
  'Coste fijo en USD por fila registrada en llm_uso, para "modelos" no tokenizados '
  '(voz/avatar/transcripción). NULL para modelos facturados por token. Estimado y editable.';

-- 2. Sembrar costes estimados. precio_*_por_millon = 0 porque estos servicios no
--    se facturan por token; el coste real va en coste_fijo_usd. Cada fase del oral
--    conversacional es una fila independiente, así que la suma por fila reconstruye
--    el coste total de la sesión multi-fase automáticamente.
INSERT INTO public.llm_precios
  (modelo, precio_entrada_por_millon, precio_salida_por_millon, coste_fijo_usd, updated_at)
VALUES
  -- Oral conversacional Spanish B (ElevenLabs ConvAI + Simli, ~3 min/fase)
  ('elevenlabs-convai-oral-b-fase1', 0, 0, 0.60, now()),
  ('elevenlabs-convai-oral-b-fase2', 0, 0, 0.60, now()),
  ('elevenlabs-convai-oral-b-fase3', 0, 0, 0.60, now()),
  -- Simulador oral Spanish A
  ('elevenlabs-convai-fase1', 0, 0, 0.60, now()),
  ('elevenlabs-convai-fase2', 0, 0, 0.60, now()),
  -- Transcripción y TTS (OpenAI), facturado por minuto de audio
  ('gpt-4o-mini-transcribe', 0, 0, 0.02, now()),
  ('gpt-4o-mini-tts', 0, 0, 0.015, now())
ON CONFLICT (modelo) DO UPDATE
  SET coste_fijo_usd = EXCLUDED.coste_fijo_usd,
      updated_at = now();

COMMIT;
