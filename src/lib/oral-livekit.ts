// Cliente LiveKit para el oral conversacional de Spanish B.
//
// Sustituye a @11labs/client: se conecta a la room que crea `create-oral-b-session`, publica el
// micrófono del alumno, recibe el audio+vídeo del avatar (worker GPU: SoulX+Kokoro) y las
// transcripciones que el worker envía por el datachannel. Expone una API tipo "startSession" con
// callbacks, para encajar con la máquina de fases existente sin reescribirla.
//
// Protocolo del datachannel (lo emite el bot del avatar):
//   { "type": "transcript", "source": "user" | "ai", "text": "..." }   → mensaje (alumno / examinador)
//   { "type": "mode", "mode": "speaking" | "listening" }                → estado del avatar
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";

export interface OralLiveKitSession {
  endSession: () => Promise<void>;
  /** Enciende/apaga el micro del alumno. En la preparación se conecta con el micro APAGADO (el bot
   *  calienta sin que el oral empiece); al pulsar "comenzar" se enciende → el bot saluda y arranca el oral. */
  setMicEnabled: (on: boolean) => Promise<void>;
  /** Desbloquea la reproducción de audio del avatar. DEBE llamarse desde un gesto del usuario (Safari y
   *  otros bloquean el autoplay): se invoca en el clic de "comenzar". */
  startAudio: () => Promise<void>;
}

export interface OralLiveKitHandlers {
  onMessage?: (p: { message: string; source: "ai" | "user" }) => void;
  onStatus?: (p: { status: "connected" | "disconnected" }) => void;
  onMode?: (modo: "hablando" | "escuchando") => void;
  onVideoTrack?: (track: MediaStreamTrack | null) => void;
  onError?: (e: unknown) => void;
}

export async function startOralLiveKitSession(
  url: string,
  token: string,
  handlers: OralLiveKitHandlers,
  opts?: { enableMic?: boolean },
): Promise<OralLiveKitSession> {
  // adaptiveStream/dynacast bajan la resolución recibida según el tamaño del <video>/red → emborronan la cara.
  // Con una sola pista importante (el avatar) los desactivamos para recibir siempre la calidad completa.
  const room = new Room({ adaptiveStream: false, dynacast: false });
  const audioEls: HTMLMediaElement[] = [];

  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) {
      handlers.onVideoTrack?.(track.mediaStreamTrack);
    } else if (track.kind === Track.Kind.Audio) {
      // El audio del avatar es una pista aparte → reproducir en un elemento oculto.
      const el = track.attach();
      el.style.display = "none";
      document.body.appendChild(el);
      audioEls.push(el);
      // Safari bloquea el autoplay de audio sin gesto reciente → reintentar el play() en la próxima
      // interacción del usuario (NotAllowedError); si no, el avatar se vería pero no se oiría.
      el.play().catch(() => {
        const resume = () => {
          el.play().catch(() => {});
          document.removeEventListener("click", resume);
          document.removeEventListener("keydown", resume);
        };
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("keydown", resume, { once: true });
      });
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) handlers.onVideoTrack?.(null);
    track.detach().forEach((el) => el.remove());
  });

  room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload)) as {
        type?: string;
        source?: "ai" | "user";
        text?: string;
        mode?: string;
      };
      if (data.type === "transcript" && data.text && data.source) {
        handlers.onMessage?.({ message: data.text, source: data.source });
      } else if (data.type === "mode" && data.mode) {
        handlers.onMode?.(data.mode === "speaking" ? "hablando" : "escuchando");
      }
    } catch {
      // mensaje malformado → ignorar
    }
  });

  room.on(RoomEvent.Connected, () => handlers.onStatus?.({ status: "connected" }));
  room.on(RoomEvent.Disconnected, () => handlers.onStatus?.({ status: "disconnected" }));
  room.on(RoomEvent.MediaDevicesError, (e) => handlers.onError?.(e));

  await room.connect(url, token);
  await room.localParticipant.setMicrophoneEnabled(opts?.enableMic ?? true);

  return {
    endSession: async () => {
      audioEls.forEach((el) => el.remove());
      handlers.onVideoTrack?.(null);
      await room.disconnect();
    },
    setMicEnabled: async (on: boolean) => {
      await room.localParticipant.setMicrophoneEnabled(on);
    },
    startAudio: async () => {
      try {
        await room.startAudio(); // desbloquea el autoplay del audio del avatar (Safari) desde el gesto
      } catch {
        /* ya desbloqueado o no necesario */
      }
    },
  };
}
