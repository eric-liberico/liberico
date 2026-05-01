-- Registra el modelo usado por defecto en las correcciones rápidas.
INSERT INTO public.llm_precios (modelo, precio_entrada_por_millon, precio_salida_por_millon)
VALUES ('claude-sonnet-4-20250514', 3.00, 15.00)
ON CONFLICT (modelo) DO UPDATE
SET
  precio_entrada_por_millon = EXCLUDED.precio_entrada_por_millon,
  precio_salida_por_millon = EXCLUDED.precio_salida_por_millon,
  updated_at = now();
