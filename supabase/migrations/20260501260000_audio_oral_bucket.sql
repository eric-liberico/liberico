-- Bucket privado para almacenamiento temporal del audio del oral.
-- El audio se sube directamente desde el cliente (sin pasar por edge functions),
-- la edge function transcribe-oral lo descarga, lo procesa y lo borra de inmediato.
-- Nunca se almacena de forma persistente — solo existe durante la transcripción.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-oral',
  'audio-oral',
  false,
  26214400, -- 25 MB, límite de OpenAI Whisper
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm',
    'video/webm', 'video/mp4', 'audio/x-m4a', 'audio/aac', 'audio/m4a'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- El usuario solo puede subir a su propia carpeta: {user_id}/{uuid}.ext
CREATE POLICY "upload propio audio oral"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio-oral'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- El usuario puede borrar solo sus propios archivos (fallback si el edge function falla)
CREATE POLICY "borrar propio audio oral"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audio-oral'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
