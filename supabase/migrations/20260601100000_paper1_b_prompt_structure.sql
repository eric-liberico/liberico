BEGIN;

ALTER TABLE public.prompts_paper1_b
  ADD COLUMN IF NOT EXISTS opciones_tipo_texto TEXT[]
  CHECK (
    opciones_tipo_texto IS NULL OR (
      cardinality(opciones_tipo_texto) BETWEEN 2 AND 3
      AND array_position(opciones_tipo_texto, NULL) IS NULL
      AND opciones_tipo_texto <@ ARRAY[
        'blog',
        'email',
        'article',
        'brochure',
        'speech',
        'interview',
        'instructions',
        'leaflet',
        'proposal',
        'report',
        'review'
      ]::TEXT[]
    )
  );

COMMENT ON COLUMN public.prompts_paper1_b.opciones_tipo_texto IS
  'Array de 2-3 tipos de texto entre los que el alumno elige. Si NULL, se usa text_type como unica opcion legacy.';

ALTER TABLE public.prompts_paper1_b
  ADD COLUMN IF NOT EXISTS bullets_es TEXT[]
  CHECK (
    bullets_es IS NULL OR (
      cardinality(bullets_es) = 3
      AND array_position(bullets_es, NULL) IS NULL
    )
  );

ALTER TABLE public.prompts_paper1_b
  ADD COLUMN IF NOT EXISTS bullets_en TEXT[]
  CHECK (
    bullets_en IS NULL OR (
      cardinality(bullets_en) = 3
      AND array_position(bullets_en, NULL) IS NULL
    )
  );

COMMENT ON COLUMN public.prompts_paper1_b.bullets_es IS
  'Array de exactamente 3 strings: puntos de contenido que debe cubrir el alumno (ES).';
COMMENT ON COLUMN public.prompts_paper1_b.bullets_en IS
  'Array de exactamente 3 strings: puntos de contenido que debe cubrir el alumno (EN).';

ALTER TABLE public.evaluaciones_paper1_b
  ADD COLUMN IF NOT EXISTS tipo_texto_elegido TEXT
  CHECK (
    tipo_texto_elegido IS NULL OR tipo_texto_elegido IN (
      'blog',
      'email',
      'article',
      'brochure',
      'speech',
      'interview',
      'instructions',
      'leaflet',
      'proposal',
      'report',
      'review'
    )
  );

COMMENT ON COLUMN public.evaluaciones_paper1_b.tipo_texto_elegido IS
  'Tipo de texto elegido por el alumno cuando el prompt ofrece varias opciones.';

UPDATE public.prompts_paper1_b
SET
  opciones_tipo_texto = ARRAY['blog', 'email', 'article'],
  bullets_es = ARRAY[
    'Describe la experiencia que viviste y como te afecto personalmente.',
    'Explica que aprendiste de esa experiencia y como cambio tu perspectiva.',
    'Da razones por las que recomiendas a otros jovenes vivir algo similar.'
  ],
  bullets_en = ARRAY[
    'Describe the experience you had and how it personally affected you.',
    'Explain what you learned from it and how it changed your outlook.',
    'Give reasons why you would recommend a similar experience to other young people.'
  ]
WHERE text_type = 'blog' AND theme = 'experiencias';

UPDATE public.prompts_paper1_b
SET
  opciones_tipo_texto = ARRAY['article', 'brochure', 'speech'],
  bullets_es = ARRAY[
    'Describe la iniciativa de sostenibilidad y en que consiste.',
    'Explica los beneficios que ha tenido o podria tener para la comunidad.',
    'Argumenta por que es importante que mas ciudades adopten medidas similares.'
  ],
  bullets_en = ARRAY[
    'Describe the sustainability initiative and what it involves.',
    'Explain the benefits it has had or could have for the community.',
    'Argue why it is important for more cities to adopt similar measures.'
  ]
WHERE text_type = 'article' AND theme = 'planeta_compartido';

COMMIT;
