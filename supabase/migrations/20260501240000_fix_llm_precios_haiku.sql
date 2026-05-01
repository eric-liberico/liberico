-- Añade el ID completo del modelo Haiku 4.5 que registran las edge functions
INSERT INTO llm_precios (modelo, precio_entrada_por_millon, precio_salida_por_millon)
VALUES ('claude-haiku-4-5-20251001', 1.00, 5.00)
ON CONFLICT (modelo) DO NOTHING;
