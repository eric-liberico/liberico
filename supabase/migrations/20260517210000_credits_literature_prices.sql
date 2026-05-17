-- Precios de créditos para asignaturas Literature (Spanish A / English A)
-- Mismos precios que Spanish B por decisión de producto.

INSERT INTO public.evaluacion_precios (concepto, creditos, descripcion) VALUES
  ('evaluate-analysis',              1.50, 'Literature P1 — corrección básica'),
  ('generate-analysis-feedback',     2.00, 'Literature P1 — feedback completo'),
  ('evaluate-paper2',                2.00, 'Literature P2 — corrección básica'),
  ('generate-paper2-feedback',       2.00, 'Literature P2 — feedback completo'),
  ('evaluate-oral',                  2.00, 'Literature Oral — corrección básica'),
  ('generate-oral-feedback',         2.00, 'Literature Oral — feedback completo'),
  ('generate-band5-essay',           2.00, 'Literature P1 — ensayo banda 5'),
  ('generate-band5-essay-p2',        2.00, 'Literature P2 — ensayo banda 5'),
  ('generate-rewrite-suggestions',   2.00, 'Literature P1 — sugerencias de reescritura'),
  ('generate-rewrite-suggestions-p2',2.00, 'Literature P2 — sugerencias de reescritura')
ON CONFLICT (concepto) DO NOTHING;
