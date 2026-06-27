import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, Video } from "lucide-react";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
import { useCountdown } from "@/hooks/useCountdown";
import type { ClaseBooking } from "./types";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

function fmtFecha(iso: string, isEN: boolean, timeZone: string) {
  return new Date(iso).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}
function fmtHora(iso: string, isEN: boolean, timeZone: string) {
  return new Date(iso).toLocaleTimeString(isEN ? "en-GB" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export function SessionHeader({
  booking,
  backTo,
  backLabel,
  counterpartLabel,
  counterpartSub,
  isEN,
  timeZone,
  timeZoneLabel,
}: {
  booking: ClaseBooking;
  backTo: string;
  backLabel: string;
  counterpartLabel: string;
  counterpartSub?: string | null;
  isEN: boolean;
  timeZone: string;
  timeZoneLabel: string;
}) {
  const cd = useCountdown(booking.slot_starts_at, booking.slot_ends_at, isEN);
  const cancelled = booking.status === "cancelled";
  const pending = booking.status === "pending_payment";
  const hasLink = !!booking.meet_link;
  const emphasize = cd.phase === "soon" || cd.phase === "live";
  const showJoin = !cancelled && cd.phase !== "ended";

  return (
    <header className="space-y-4">
      <Link
        to={backTo}
        className="clase-press inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold"
        style={{ color: L.primary }}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {backLabel}
      </Link>

      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: L.surface, borderColor: L.line }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: L.primary }}>
          {isEN ? "1:1 class" : "Clase 1:1"}
        </div>
        <h1 className="mt-1 text-2xl font-semibold" style={headingStyle}>
          {counterpartLabel}
        </h1>
        {counterpartSub && (
          <p className="text-sm" style={{ color: L.muted }}>{counterpartSub}</p>
        )}

        {booking.slot_starts_at && (
          <div className="mt-3 space-y-1 text-sm" style={{ color: L.ink }}>
            <div className="flex items-center gap-1.5 capitalize">
              <CalendarDays aria-hidden="true" className="h-4 w-4" style={{ color: L.muted }} />
              {fmtFecha(booking.slot_starts_at, isEN, timeZone)}
            </div>
            <div className="flex items-center gap-1.5" style={{ color: L.muted }}>
              <Clock aria-hidden="true" className="h-4 w-4" />
              {fmtHora(booking.slot_starts_at, isEN, timeZone)}
              {booking.slot_ends_at && <>–{fmtHora(booking.slot_ends_at, isEN, timeZone)}</>}{" "}
              · {timeZoneLabel}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold" style={{ color: emphasize ? L.ok : L.muted }}>
            {cancelled ? (isEN ? "Cancelled" : "Cancelada") : cd.label}
          </span>

          {showJoin && hasLink ? (
            <a
              href={booking.meet_link!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isEN ? "Join the class on Google Meet" : "Entrar a la clase en Google Meet"}
              className={`clase-press inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold ${
                emphasize ? "clase-join-live" : ""
              }`}
              style={{
                backgroundColor: emphasize ? L.primary : L.surface,
                color: emphasize ? "#fff" : L.primary,
                border: `1px solid ${L.primary}`,
                boxShadow: emphasize ? "0 16px 30px -12px rgba(79,70,229,0.55)" : "none",
                opacity: emphasize ? 1 : 0.85,
              }}
            >
              <Video aria-hidden="true" className="h-4 w-4" />
              {isEN ? "Join the class" : "Entrar a la clase"}
            </a>
          ) : showJoin && !hasLink ? (
            <span className="text-xs" style={{ color: L.amberDeep }}>
              {isEN
                ? "The link will appear once Calendar syncs."
                : "El enlace aparecerá al confirmarse con Calendar."}
            </span>
          ) : null}
        </div>

        {!emphasize && showJoin && hasLink && (
          <p className="mt-2 text-xs" style={{ color: L.muted }}>
            {isEN ? "The room opens 15 min before." : "La sala abre 15 min antes."}
          </p>
        )}
        {pending && (
          <p className="mt-2 text-xs" style={{ color: L.amberDeep }}>
            {isEN
              ? "Pending payment. Your class is reserved."
              : "Pendiente de pago. Tu clase está reservada."}
          </p>
        )}
      </div>
    </header>
  );
}
