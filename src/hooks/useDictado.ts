import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Tipos mínimos para la Web Speech API (no incluidos en el tsconfig de este proyecto)
interface IRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
}
interface IRecognitionErrorEvent {
  error: string;
}
interface IRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: IRecognitionErrorEvent) => void) | null;
  onresult: ((e: IRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => IRecognition;

const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ??
    w["webkitSpeechRecognition"] ??
    null) as SpeechRecognitionCtor | null;
};

/**
 * Hook de dictado por voz (Web Speech API).
 * Compatible con Chrome, Edge y Safari (incluyendo iOS, con auto-restart
 * porque Safari para el reconocimiento tras silencio aunque continuous=true).
 *
 * @param onTextoFinal - Llamado con cada fragmento de texto reconocido como final.
 */
export function useDictado(onTextoFinal: (texto: string) => void) {
  const [dictando, setDictando] = useState(false);
  const [interimTexto, setInterimTexto] = useState("");

  // dictandoRef refleja la intención del usuario, independiente del ciclo React
  const dictandoRef = useRef(false);
  const reconocimientoRef = useRef<IRecognition | null>(null);
  // iniciarRecRef actualizada en cada render para que onend siempre
  // tenga los callbacks frescos (necesario para el auto-restart de iOS Safari)
  const iniciarRecRef = useRef<(() => void) | null>(null);
  // onTextoFinalRef evita que el callback quede stale en closures
  const onTextoFinalRef = useRef(onTextoFinal);
  onTextoFinalRef.current = onTextoFinal;

  useEffect(
    () => () => {
      dictandoRef.current = false;
      reconocimientoRef.current?.stop();
    },
    [],
  );

  iniciarRecRef.current = () => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => setDictando(true);

    rec.onend = () => {
      setInterimTexto("");
      if (dictandoRef.current) {
        // iOS Safari para el reconocimiento tras silencio aunque continuous=true;
        // si el usuario aún quiere dictar, arrancamos una nueva instancia.
        iniciarRecRef.current?.();
      } else {
        setDictando(false);
      }
    };

    rec.onerror = (e: IRecognitionErrorEvent) => {
      setInterimTexto("");
      if (e.error === "aborted" || e.error === "no-speech") return;
      dictandoRef.current = false;
      setDictando(false);
      toast.error("Error en el dictado. Comprueba los permisos del micrófono.");
    };

    rec.onresult = (e: IRecognitionEvent) => {
      let finalTexto = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTexto += t;
        else interim += t;
      }
      setInterimTexto(interim);
      if (finalTexto) onTextoFinalRef.current(finalTexto);
    };

    reconocimientoRef.current = rec;
    try {
      rec.start();
    } catch {
      dictandoRef.current = false;
      setDictando(false);
    }
  };

  const toggleDictado = () => {
    if (dictandoRef.current) {
      dictandoRef.current = false;
      reconocimientoRef.current?.stop();
      return;
    }
    if (!getSpeechRecognition()) {
      toast.error("Tu navegador no soporta dictado por voz. Usa Chrome, Edge o Safari.");
      return;
    }
    dictandoRef.current = true;
    iniciarRecRef.current?.();
  };

  return { dictando, interimTexto, toggleDictado };
}
