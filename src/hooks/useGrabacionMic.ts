// Hook para grabar el AUDIO del micrófono del alumno durante una sesión oral en
// vivo (sin cámara). Captura una pista cruda continua a lo largo de toda la sesión
// para transcribirla luego en modo verbatim (conserva los errores L2 → Criterio A).
//
// Usa su propio stream de getUserMedia, independiente del que abre ElevenLabs ConvAI.

import { useCallback, useRef, useState } from "react";

type GrabacionMic = {
  grabando: boolean;
  /** Pide permiso de micrófono y empieza a grabar. Lanza si se deniega. */
  iniciar: () => Promise<void>;
  /** Detiene la grabación y resuelve con el audio capturado (o null si no hubo). */
  detener: () => Promise<Blob | null>;
  /** Libera el micrófono sin devolver audio (cancelación/limpieza). */
  cancelar: () => void;
};

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function useGrabacionMic(): GrabacionMic {
  const [grabando, setGrabando] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const liberarStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const iniciar = useCallback(async () => {
    if (recorderRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(1000); // fragmentos cada 1 s para no perder audio si se corta
    setGrabando(true);
  }, []);

  const detener = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type }) : null;
        chunksRef.current = [];
        recorderRef.current = null;
        liberarStream();
        setGrabando(false);
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch {
        recorderRef.current = null;
        liberarStream();
        setGrabando(false);
        resolve(null);
      }
    });
  }, [liberarStream]);

  const cancelar = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    liberarStream();
    setGrabando(false);
  }, [liberarStream]);

  return { grabando, iniciar, detener, cancelar };
}

/** Extensión de fichero a partir del mimeType del Blob grabado. */
export function extDeBlob(blob: Blob): string {
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("ogg")) return "ogg";
  return "webm";
}
