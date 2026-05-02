ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS nota_media real NOT NULL DEFAULT 0;
