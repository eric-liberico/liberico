import { useEffect, useState } from "react";

export type SessionPhase = "before" | "soon" | "live" | "ended";

export type Countdown = {
  phase: SessionPhase;
  msToStart: number;
  label: string;
};

const SOON_MS = 15 * 60 * 1000; // la sala "abre" 15 min antes
const GRACE_AFTER_END_MS = 30 * 60 * 1000;
const DEFAULT_DURATION_MS = 75 * 60 * 1000;

export function computeCountdown(
  startsAt: string | null,
  endsAt: string | null,
  now: number,
  isEN: boolean,
): Countdown {
  if (!startsAt) return { phase: "before", msToStart: Infinity, label: "" };

  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + DEFAULT_DURATION_MS;
  const msToStart = start - now;

  if (now >= end + GRACE_AFTER_END_MS) {
    return { phase: "ended", msToStart, label: isEN ? "Class finished" : "Clase finalizada" };
  }
  if (now >= start) {
    return { phase: "live", msToStart, label: isEN ? "In progress" : "En curso" };
  }
  if (msToStart <= SOON_MS) {
    const mins = Math.max(1, Math.round(msToStart / 60000));
    return {
      phase: "soon",
      msToStart,
      label: isEN ? `Starts in ${mins} min` : `Empieza en ${mins} min`,
    };
  }

  const totalMin = Math.round(msToStart / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  let label: string;
  if (days > 0) {
    label = isEN ? `Starts in ${days} d ${hours} h` : `Empieza en ${days} d ${hours} h`;
  } else if (hours > 0) {
    label = isEN ? `Starts in ${hours} h ${mins} min` : `Empieza en ${hours} h ${mins} min`;
  } else {
    label = isEN ? `Starts in ${mins} min` : `Empieza en ${mins} min`;
  }
  return { phase: "before", msToStart, label };
}

export function useCountdown(
  startsAt: string | null,
  endsAt: string | null,
  isEN: boolean,
): Countdown {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return computeCountdown(startsAt, endsAt, now, isEN);
}
