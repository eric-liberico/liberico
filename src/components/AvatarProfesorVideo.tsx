// Avatar del profesor IA para la sesión oral en vivo.
//
// Estado actual: renderiza el avatar animado (AvatarProfesor), que es totalmente
// funcional y refleja los estados escuchando/hablando del agente.
//
// Punto de extensión para avatar de VÍDEO realista (Simli / Tavus): cuando se
// configure el SDK + las claves correspondientes, este wrapper montará el vídeo
// con lip-sync alimentado por el audio TTS de ElevenLabs y caerá al avatar animado
// si el vídeo no carga o el navegador no soporta WebRTC. La interfaz (`modo`) se
// mantiene idéntica a AvatarProfesor para poder intercambiarlos sin fricción.

import { AvatarProfesor } from "@/components/AvatarProfesor";

type Modo = "inactivo" | "escuchando" | "hablando";

export function AvatarProfesorVideo({ modo }: { modo: Modo }) {
  // TODO(avatar-video): integrar Simli/Tavus aquí con fallback a <AvatarProfesor />.
  return <AvatarProfesor modo={modo} />;
}
