-- Necesario para que postgres_changes envíe el row completo (incluyendo 'creditos')
-- al cliente cuando se hace UPDATE en perfiles.
-- Sin esto, el payload solo incluye la PK y el cliente no puede leer el nuevo saldo.
ALTER TABLE public.perfiles REPLICA IDENTITY FULL;
