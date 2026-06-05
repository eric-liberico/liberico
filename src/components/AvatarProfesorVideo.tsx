// Avatar del profesor IA para la sesión oral en vivo.
//
// Si hay pista de vídeo del avatar (worker GPU: SoulX, vía LiveKit) la renderiza; si no, cae al
// avatar animado (`AvatarProfesor`), que refleja los estados escuchando/hablando. El audio del
// avatar viaja en una pista LiveKit aparte (lo reproduce el cliente), por eso el <video> va muted.
import { useEffect, useRef } from "react";

import { AvatarProfesor } from "@/components/AvatarProfesor";

type Modo = "inactivo" | "escuchando" | "hablando";

export function AvatarProfesorVideo({
  modo,
  videoTrack,
}: {
  modo: Modo;
  videoTrack?: MediaStreamTrack | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !videoTrack) return;
    el.srcObject = new MediaStream([videoTrack]);
    el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [videoTrack]);

  if (!videoTrack) return <AvatarProfesor modo={modo} />;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="aspect-square w-full rounded-2xl bg-black object-cover"
    />
  );
}
