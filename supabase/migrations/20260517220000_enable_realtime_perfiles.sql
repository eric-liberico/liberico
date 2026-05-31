-- Habilita realtime para la tabla perfiles
-- Necesario para que postgres_changes dispare actualizaciones de créditos en el cliente
-- sin necesidad de hacer refresh de página.
alter publication supabase_realtime add table public.perfiles;
