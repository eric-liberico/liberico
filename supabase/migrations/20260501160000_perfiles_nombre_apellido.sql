-- Añade nombre y apellido a perfiles para que el admin pueda leerlos sin depender de user_metadata de la Auth API
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS nombre  text,
  ADD COLUMN IF NOT EXISTS apellido text;
