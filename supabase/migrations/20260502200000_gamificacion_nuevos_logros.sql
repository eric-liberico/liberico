-- Nuevos logros de calidad para Prueba 2 y Oral Individual
INSERT INTO public.logros_catalogo VALUES
  ('nota_6_p2',             'Nota 6 en P2',           'Alcanza nota IB 6 o superior en una evaluación de Prueba 2.',              200, 'Award',      'calidad'),
  ('nota_7_p2',             'Excelencia en P2',        'Alcanza nota IB 7 en una evaluación de Prueba 2.',                         400, 'Medal',      'calidad'),
  ('mejora_consecutiva_p2', 'Tendencia en P2',         'Sube la puntuación total de P2 en dos evaluaciones consecutivas.',         150, 'TrendingUp', 'calidad'),
  ('nota_6_oral',           'Oral brillante',          'Alcanza nota IB 6 o superior en una evaluación de Oral Individual.',      200, 'Award',      'calidad'),
  ('nota_7_oral',           'Oral perfecto',           'Alcanza nota IB 7 en una evaluación de Oral Individual.',                  400, 'Medal',      'calidad'),
  ('mejora_consecutiva_oral','Voz en progreso',        'Sube la puntuación total del Oral en dos evaluaciones consecutivas.',      150, 'TrendingUp', 'calidad')
ON CONFLICT (id) DO NOTHING;
