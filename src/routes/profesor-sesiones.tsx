import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { TextoLectura } from "@/components/TextoLectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  AlertCircle,
  FileText,
  BookMarked,
  Video,
} from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/profesor-sesiones")({
  head: () => ({
    meta: [{ title: "Mis sesiones — LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ProfesorSesionesPage,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--secondary": L.bg2,
  "--secondary-foreground": L.ink,
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--accent": L.primary + "10",
  "--accent-foreground": L.ink,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
};
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const softStyle = { backgroundColor: L.bg2, borderColor: L.line };
const ctaStyle = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
};

const scopedCss = `
  #profesor-sesiones-root .session-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
  #profesor-sesiones-root .session-soft{background:${L.bg2};border-color:${L.line};}
  #profesor-sesiones-root .session-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
  #profesor-sesiones-root .session-press:active{transform:scale(0.985);}
  #profesor-sesiones-root a:focus-visible,#profesor-sesiones-root button:focus-visible,#profesor-sesiones-root textarea:focus-visible,#profesor-sesiones-root input:focus-visible,#profesor-sesiones-root select:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #profesor-sesiones-root button:not([disabled]){cursor:pointer;}
  @media (hover:hover) and (pointer:fine){
    #profesor-sesiones-root .session-hover:hover{transform:translateY(-1px);border-color:${L.primary};box-shadow:0 20px 38px -28px rgba(15,23,42,0.42),0 4px 10px -6px rgba(15,23,42,0.12);}
  }
  @media (prefers-reduced-motion: reduce){
    #profesor-sesiones-root .session-press,#profesor-sesiones-root .session-hover{transition:none !important;}
  }
`;

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 22 && m > 0) break;
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const BUFFER_MS = 15 * 60 * 1000; // 15-min gap required between sessions

// ── Types ──────────────────────────────────────────────────────────────────────

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_sek: number;
};

type EvalCompleta = {
  id: string;
  created_at: string;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  nota_ib: number | null;
  texto_literario: string;
  pregunta_orientacion: string;
  analisis_estudiante: string;
  comentario_global: string | null;
  fortalezas: string | null;
  areas_mejora: string | null;
  justificacion_a: string | null;
  justificacion_b: string | null;
  justificacion_c: string | null;
  justificacion_d: string | null;
};

type StudentBrief = {
  email: string;
  nota_media: number | null;
  banda_a_media: number | null;
  banda_b_media: number | null;
  banda_c_media: number | null;
  banda_d_media: number | null;
  evaluaciones: EvalCompleta[];
};

type BookingNote = {
  id: string;
  summary: string | null;
  next_steps: string | null;
  visible_to_student: boolean;
};

type Booking = {
  id: string;
  status: string;
  student_goal: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  student_id: string;
  student_email: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  meet_link: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLargo(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function fmtCorto(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hasConflict(
  newStartMs: number,
  newEndMs: number,
  slots: Slot[],
): { conflict: boolean; reason: string } {
  for (const s of slots) {
    const sStart = new Date(s.starts_at).getTime();
    const sEnd = new Date(s.ends_at).getTime();
    if (newStartMs < sEnd + BUFFER_MS && newEndMs > sStart - BUFFER_MS) {
      return {
        conflict: true,
        reason: `Conflicto con sesión del ${fmtCorto(s.starts_at)} (incluye margen de 15 min).`,
      };
    }
  }
  return { conflict: false, reason: "" };
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente de confirmación",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No presentado",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  pending_payment: { color: L.amberDeep, bg: "#FEF3C7", border: "#F59E0B" },
  confirmed: { color: L.ok, bg: "#ECFDF5", border: "#10B981" },
  cancelled: { color: L.muted, bg: L.bg2, border: L.line },
  completed: { color: L.primary, bg: "#EEF2FF", border: L.primary },
  no_show: { color: "#BE123C", bg: "#FFF1F2", border: "#FB7185" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

function ProfesorSesionesPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"sesiones" | "disponibilidad">("sesiones");
  const [bookings, setBookings] = useState<Booking[]>([]);
  // All non-cancelled future slots — used for conflict detection and display
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  // Availability form
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newDurationMin, setNewDurationMin] = useState(75);
  const [newPrice, setNewPrice] = useState("1250");
  const [savingSlot, setSavingSlot] = useState(false);
  const [conflictMsg, setConflictMsg] = useState("");

  // Expanded booking state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<Record<string, StudentBrief | null | "no-access">>({});
  const [notes, setNotes] = useState<Record<string, BookingNote | null>>({});
  const [noteDraft, setNoteDraft] = useState<
    Record<string, { summary: string; next_steps: string; visible: boolean }>
  >({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || rol !== "profesor")) void navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: bookingsRaw }, { data: slotsRaw }] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, status, student_goal, created_at, confirmed_at, student_id, meet_link, slot:booking_slots(starts_at, ends_at)",
        )
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      // Fetch ALL non-cancelled future slots (for conflict detection + display)
      supabase
        .from("booking_slots")
        .select("id, starts_at, ends_at, status, price_sek")
        .eq("teacher_id", user.id)
        .neq("status", "cancelled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(100),
    ]);

    // Fetch student emails from perfiles (two-step — student_id → auth.users, not perfiles)
    const studentIds = [...new Set((bookingsRaw ?? []).map((b) => b.student_id as string))].filter(
      Boolean,
    );
    const emailMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const { data: perfilesData } = await supabase
        .from("perfiles")
        .select("user_id, email")
        .in("user_id", studentIds);
      for (const p of perfilesData ?? []) {
        if (p.user_id && p.email) emailMap[p.user_id] = p.email;
      }
    }

    const mapped: Booking[] = (bookingsRaw ?? []).map((b) => {
      const slot = Array.isArray(b.slot)
        ? b.slot[0]
        : (b.slot as { starts_at?: string; ends_at?: string } | null);
      return {
        id: b.id,
        status: b.status,
        student_goal: b.student_goal,
        created_at: b.created_at,
        confirmed_at: b.confirmed_at,
        student_id: b.student_id as string,
        student_email: emailMap[b.student_id as string] ?? null,
        slot_starts_at: slot?.starts_at ?? null,
        slot_ends_at: slot?.ends_at ?? null,
        meet_link: (b.meet_link as string | null) ?? null,
      };
    });

    setBookings(mapped);
    setSlots((slotsRaw ?? []) as Slot[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && rol === "profesor") void cargar();
  }, [user, rol, cargar]);

  // Re-check conflict whenever form fields change
  useEffect(() => {
    if (!newDate || !newTime) {
      setConflictMsg("");
      return;
    }
    const startsAt = new Date(`${newDate}T${newTime}:00`);
    const endsAt = new Date(startsAt.getTime() + newDurationMin * 60_000);
    const { conflict, reason } = hasConflict(startsAt.getTime(), endsAt.getTime(), slots);
    setConflictMsg(conflict ? reason : "");
  }, [newDate, newTime, newDurationMin, slots]);

  // Load student brief + notes on expand
  const cargarDetalle = useCallback(
    async (bookingId: string, studentId: string) => {
      const [{ data: access }, { data: noteData }] = await Promise.all([
        supabase
          .from("booking_teacher_access")
          .select("student_id")
          .eq("booking_id", bookingId)
          .lte("access_starts_at", new Date().toISOString())
          .gt("access_ends_at", new Date().toISOString())
          .is("revoked_at", null)
          .maybeSingle(),
        supabase
          .from("booking_notes")
          .select("id, summary, next_steps, visible_to_student")
          .eq("booking_id", bookingId)
          .eq("teacher_id", user!.id)
          .maybeSingle(),
      ]);

      setNotes((prev) => ({ ...prev, [bookingId]: noteData as BookingNote | null }));
      setNoteDraft((prev) => ({
        ...prev,
        [bookingId]: {
          summary: noteData?.summary ?? "",
          next_steps: noteData?.next_steps ?? "",
          visible: noteData?.visible_to_student ?? false,
        },
      }));

      if (!access?.student_id) {
        setBriefs((prev) => ({ ...prev, [bookingId]: "no-access" }));
        return;
      }

      const [{ data: perfil }, { data: evals }] = await Promise.all([
        supabase.from("perfiles").select("email").eq("user_id", studentId).maybeSingle(),
        supabase
          .from("evaluaciones")
          .select(
            "id, created_at, banda_a, banda_b, banda_c, banda_d, nota_ib, texto_literario, pregunta_orientacion, analisis_estudiante, comentario_global, fortalezas, areas_mejora, justificacion_a, justificacion_b, justificacion_c, justificacion_d",
          )
          .eq("user_id", studentId)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      const evalsArr = (evals ?? []) as EvalCompleta[];
      const n = evalsArr.length;
      const avg = (key: "banda_a" | "banda_b" | "banda_c" | "banda_d" | "nota_ib") =>
        n > 0 ? Math.round((evalsArr.reduce((s, e) => s + (e[key] ?? 0), 0) / n) * 10) / 10 : null;

      setBriefs((prev) => ({
        ...prev,
        [bookingId]: {
          email: perfil?.email ?? "—",
          nota_media: avg("nota_ib"),
          banda_a_media: avg("banda_a"),
          banda_b_media: avg("banda_b"),
          banda_c_media: avg("banda_c"),
          banda_d_media: avg("banda_d"),
          evaluaciones: evalsArr,
        },
      }));
    },
    [user],
  );

  const toggleExpand = (bookingId: string, studentId: string) => {
    if (expanded === bookingId) {
      setExpanded(null);
      return;
    }
    setExpanded(bookingId);
    if (briefs[bookingId] === undefined) {
      void cargarDetalle(bookingId, studentId);
    }
  };

  const guardarNota = async (bookingId: string) => {
    const draft = noteDraft[bookingId];
    if (!draft) return;
    setSavingNote(bookingId);
    const existing = notes[bookingId];
    const payload = {
      summary: draft.summary || null,
      next_steps: draft.next_steps || null,
      visible_to_student: draft.visible,
    };
    const { error } = existing
      ? await supabase.from("booking_notes").update(payload).eq("id", existing.id)
      : await supabase.from("booking_notes").insert({
          booking_id: bookingId,
          teacher_id: user!.id,
          ...payload,
        });

    if (error) {
      toast.error("Error al guardar las notas");
    } else {
      toast.success("Notas guardadas");
      const { data } = await supabase
        .from("booking_notes")
        .select("id, summary, next_steps, visible_to_student")
        .eq("booking_id", bookingId)
        .eq("teacher_id", user!.id)
        .maybeSingle();
      setNotes((prev) => ({ ...prev, [bookingId]: data as BookingNote | null }));
    }
    setSavingNote(null);
  };

  const crearSlot = async () => {
    if (!newDate || !newTime) return;
    const startsAt = new Date(`${newDate}T${newTime}:00`);
    const endsAt = new Date(startsAt.getTime() + newDurationMin * 60_000);

    // Double-check conflict (in case slots changed since last check)
    const { conflict, reason } = hasConflict(startsAt.getTime(), endsAt.getTime(), slots);
    if (conflict) {
      toast.error(reason);
      return;
    }

    setSavingSlot(true);
    const { error } = await supabase.from("booking_slots").insert({
      teacher_id: user!.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price_sek: parseInt(newPrice) || 1250,
      status: "available",
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Ya tienes un horario en ese momento exacto.");
      } else {
        toast.error("Error al crear el horario: " + error.message);
      }
    } else {
      toast.success("Horario añadido");
      setNewDate("");
      setNewTime("09:00");
      void cargar();
    }
    setSavingSlot(false);
  };

  const eliminarSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("booking_slots")
      .delete()
      .eq("id", slotId)
      .eq("status", "available");
    if (error) toast.error("Error al eliminar el horario");
    else {
      toast.success("Horario eliminado");
      void cargar();
    }
  };

  if (authLoading || !user || rol !== "profesor") return null;

  const now = new Date();
  const proximas = bookings.filter(
    (b) => b.status === "confirmed" && b.slot_starts_at && new Date(b.slot_starts_at) > now,
  );
  const pendientes = bookings.filter((b) => b.status === "pending_payment");
  const historial = bookings.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "no_show" ||
      (b.status === "confirmed" && b.slot_starts_at && new Date(b.slot_starts_at) <= now),
  );
  const availableSlots = slots.filter((s) => s.status === "available");

  // Preview of new slot end time
  const newSlotEnd =
    newDate && newTime
      ? new Date(new Date(`${newDate}T${newTime}:00`).getTime() + newDurationMin * 60_000)
      : null;

  return (
    <div id="profesor-sesiones-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Header */}
        <div>
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            Panel del profesor
          </div>
          <h1 className="text-3xl font-semibold" style={headingStyle}>
            Mis sesiones
          </h1>
          <div className="mt-2 flex gap-4 text-sm" style={{ color: L.muted }}>
            <span>
              <strong style={{ color: L.ink }}>{proximas.length}</strong> próxima
              {proximas.length !== 1 ? "s" : ""}
            </span>
            {pendientes.length > 0 && (
              <span style={{ color: L.amberDeep }}>
                <strong>{pendientes.length}</strong> pendiente
                {pendientes.length !== 1 ? "s" : ""}
              </span>
            )}
            <span>
              <strong style={{ color: L.ink }}>{availableSlots.length}</strong> slot
              {availableSlots.length !== 1 ? "s" : ""} libre
              {availableSlots.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: L.line }}>
          {(["sesiones", "disponibilidad"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              className="session-press -mb-px border-b-2 px-4 py-2 text-sm transition-colors"
              style={{
                borderColor: tab === t ? L.primary : "transparent",
                color: tab === t ? L.ink : L.muted,
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === "sesiones" ? "Sesiones" : "Mi disponibilidad"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin"
              style={{ color: L.muted }}
            />
          </div>
        ) : tab === "sesiones" ? (
          <div className="space-y-8">
            {/* Próximas confirmadas */}
            {proximas.length > 0 && (
              <BookingGroup
                title="Próximas sesiones"
                bookings={proximas}
                expanded={expanded}
                briefs={briefs}
                notes={notes}
                noteDraft={noteDraft}
                savingNote={savingNote}
                onToggle={toggleExpand}
                onNoteChange={(id, field, value) =>
                  setNoteDraft((prev) => ({ ...prev, [id]: { ...prev[id]!, [field]: value } }))
                }
                onSaveNote={guardarNota}
              />
            )}

            {/* Pendientes */}
            {pendientes.length > 0 && (
              <div className="space-y-3">
                <SectionTitle>En proceso</SectionTitle>
                <div className="space-y-2">
                  {pendientes.map((b) => (
                    <PendingCard key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <BookingGroup
                title="Historial"
                bookings={historial}
                expanded={expanded}
                briefs={briefs}
                notes={notes}
                noteDraft={noteDraft}
                savingNote={savingNote}
                onToggle={toggleExpand}
                onNoteChange={(id, field, value) =>
                  setNoteDraft((prev) => ({ ...prev, [id]: { ...prev[id]!, [field]: value } }))
                }
                onSaveNote={guardarNota}
              />
            )}

            {bookings.length === 0 && (
              <p className="py-4 text-sm" style={{ color: L.muted }}>
                No tienes sesiones todavía. Añade horarios en la pestaña "Mi disponibilidad".
              </p>
            )}
          </div>
        ) : (
          /* ── Disponibilidad ── */
          <div className="space-y-6">
            <Card className="session-card rounded-2xl border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" style={headingStyle}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Añadir horario disponible
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-date" style={{ color: L.ink }}>
                      Fecha
                    </Label>
                    <Input
                      id="slot-date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="rounded-2xl"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    />
                  </div>

                  {/* Time dropdown — 10-min intervals */}
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-time" style={{ color: L.ink }}>
                      Hora de inicio (hora Stockholm)
                    </Label>
                    <select
                      id="slot-time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="h-9 w-full rounded-2xl border px-3 text-sm focus:outline-none"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration + end time preview */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-duration" style={{ color: L.ink }}>
                      Duración
                    </Label>
                    <select
                      id="slot-duration"
                      value={newDurationMin}
                      onChange={(e) => setNewDurationMin(Number(e.target.value))}
                      className="h-9 w-full rounded-2xl border px-3 text-sm focus:outline-none"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      <option value={60}>60 minutos</option>
                      <option value={75}>75 minutos (recomendado)</option>
                      <option value={90}>90 minutos</option>
                    </select>
                  </div>
                  {newSlotEnd && (
                    <div className="flex items-end pb-1.5">
                      <p className="text-sm" style={{ color: L.muted }}>
                        Fin:{" "}
                        <strong style={{ color: L.ink }}>
                          {newSlotEnd.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Stockholm",
                          })}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Conflict warning */}
                {conflictMsg && (
                  <div
                    className="flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs"
                    style={{ backgroundColor: "#FFF1F2", borderColor: "#FB7185", color: "#BE123C" }}
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {conflictMsg}
                  </div>
                )}

                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="slot-price" style={{ color: L.ink }}>
                    Precio base (SEK, sin moms)
                  </Label>
                  <Input
                    id="slot-price"
                    type="number"
                    min="0"
                    step="50"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="rounded-2xl"
                    style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                  />
                </div>

                <Button
                  type="button"
                  className="session-press rounded-2xl"
                  style={ctaStyle}
                  onClick={crearSlot}
                  disabled={savingSlot || !newDate || !newTime || !!conflictMsg}
                >
                  {savingSlot ? (
                    <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Añadir horario
                </Button>
              </CardContent>
            </Card>

            {/* Slot list */}
            <div className="space-y-2">
              <SectionTitle>Próximos horarios</SectionTitle>
              {slots.length === 0 ? (
                <p className="text-sm" style={{ color: L.muted }}>
                  No tienes horarios próximos.
                </p>
              ) : (
                slots.map((s) => (
                  <div
                    key={s.id}
                    className="session-card flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          style={{ color: L.muted }}
                        />
                        <span className="capitalize">{fmtLargo(s.starts_at)}</span>
                      </div>
                      <div className="pl-5 text-xs" style={{ color: L.muted }}>
                        {s.price_sek} SEK + moms ·{" "}
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              s.status === "available"
                                ? L.ok
                                : s.status === "booked"
                                  ? L.primary
                                  : L.amberDeep,
                          }}
                        >
                          {s.status === "available"
                            ? "Disponible"
                            : s.status === "booked"
                              ? "Reservado"
                              : s.status === "held"
                                ? "Retenido"
                                : s.status}
                        </span>
                      </div>
                    </div>
                    {s.status === "available" && (
                      <button
                        type="button"
                        onClick={() => eliminarSlot(s.id)}
                        className="session-press ml-2 rounded-xl p-1 transition-colors hover:text-destructive"
                        style={{ color: L.muted }}
                        title="Eliminar horario"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-wide"
      style={{ ...fontMono, color: L.muted }}
    >
      {children}
    </h2>
  );
}

function PendingCard({ booking: b }: { booking: Booking }) {
  return (
    <div
      className="space-y-1 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: L.ink }}>
          {b.student_email ?? `Alumno #${b.student_id.slice(0, 8)}`}
        </span>
        <span className="text-xs" style={{ color: L.amberDeep }}>
          Solicitado {fmtFecha(b.created_at ?? "")}
        </span>
      </div>
      {b.slot_starts_at && (
        <div className="flex items-center gap-1 text-xs" style={{ color: L.amberDeep }}>
          <CalendarDays aria-hidden="true" className="h-3 w-3" />
          <span className="capitalize">{fmtCorto(b.slot_starts_at)}</span>
        </div>
      )}
      {b.student_goal && (
        <p className="text-xs italic" style={{ color: L.amberDeep }}>
          "{b.student_goal}"
        </p>
      )}
    </div>
  );
}

function BookingGroup({
  title,
  bookings,
  expanded,
  briefs,
  notes,
  noteDraft,
  savingNote,
  onToggle,
  onNoteChange,
  onSaveNote,
}: {
  title: string;
  bookings: Booking[];
  expanded: string | null;
  briefs: Record<string, StudentBrief | null | "no-access">;
  notes: Record<string, BookingNote | null>;
  noteDraft: Record<string, { summary: string; next_steps: string; visible: boolean }>;
  savingNote: string | null;
  onToggle: (id: string, studentId: string) => void;
  onNoteChange: (id: string, field: string, value: string | boolean) => void;
  onSaveNote: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      {bookings.map((b) => (
        <BookingDetailCard
          key={b.id}
          booking={b}
          isExpanded={expanded === b.id}
          brief={briefs[b.id]}
          note={notes[b.id]}
          draft={noteDraft[b.id]}
          savingNote={savingNote === b.id}
          onToggle={() => onToggle(b.id, b.student_id)}
          onNoteChange={(field, value) => onNoteChange(b.id, field, value)}
          onSaveNote={() => onSaveNote(b.id)}
        />
      ))}
    </div>
  );
}

function BookingDetailCard({
  booking: b,
  isExpanded,
  brief,
  note,
  draft,
  savingNote,
  onToggle,
  onNoteChange,
  onSaveNote,
}: {
  booking: Booking;
  isExpanded: boolean;
  brief: StudentBrief | null | "no-access" | undefined;
  note: BookingNote | null | undefined;
  draft: { summary: string; next_steps: string; visible: boolean } | undefined;
  savingNote: boolean;
  onToggle: () => void;
  onNoteChange: (field: string, value: string | boolean) => void;
  onSaveNote: () => void;
}) {
  const statusStyle = STATUS_STYLE[b.status] ?? STATUS_STYLE.cancelled;
  const isLoadingBrief = brief === undefined && isExpanded;

  return (
    <Card className="session-card overflow-hidden rounded-2xl border">
      <CardContent className="space-y-3 pb-3 pt-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <User
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: L.muted }}
              />
              <span className="text-sm font-semibold">
                {b.student_email ?? `Alumno #${b.student_id.slice(0, 8)}`}
              </span>
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: statusStyle.bg,
                  borderColor: statusStyle.border,
                  color: statusStyle.color,
                }}
              >
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            {b.slot_starts_at && (
              <div
                className="flex flex-wrap items-center gap-1.5 pl-5 text-xs"
                style={{ color: L.muted }}
              >
                <CalendarDays aria-hidden="true" className="h-3 w-3 shrink-0" />
                <span className="capitalize">{fmtCorto(b.slot_starts_at)}</span>
                {b.slot_ends_at && (
                  <>
                    <Clock aria-hidden="true" className="ml-1 h-3 w-3 shrink-0" />
                    <span>
                      hasta{" "}
                      {new Date(b.slot_ends_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Stockholm",
                      })}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="session-press flex shrink-0 items-center gap-1 rounded-xl text-xs font-semibold hover:underline"
            style={{ color: L.primary }}
          >
            {isExpanded ? (
              <>
                <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" /> Ocultar
              </>
            ) : (
              <>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /> Ver detalle
              </>
            )}
          </button>
        </div>

        {b.student_goal && (
          <p
            className="max-w-lg border-l-2 pl-2 text-xs italic"
            style={{ borderColor: L.line, color: L.muted }}
          >
            Objetivo: "{b.student_goal}"
          </p>
        )}

        {b.meet_link && b.status === "confirmed" && (
          <a
            href={b.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="session-press inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: L.ok }}
          >
            <Video aria-hidden="true" className="h-3.5 w-3.5" />
            Unirse a Google Meet
          </a>
        )}

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-2 space-y-6 border-t pt-4" style={{ borderColor: L.line }}>
            {isLoadingBrief ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: L.muted }}>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Cargando historial del alumno…
              </div>
            ) : brief === "no-access" ? (
              <div
                className="session-soft flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm"
                style={{ color: L.muted }}
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  No tienes acceso activo al historial de este alumno. El acceso se activa al
                  confirmar la sesión (si el alumno dio su consentimiento).
                </span>
              </div>
            ) : brief ? (
              <StudentBriefPanel brief={brief} />
            ) : null}

            {(b.status === "confirmed" || b.status === "completed") && draft !== undefined && (
              <NotesEditor
                draft={draft}
                saving={savingNote}
                hasExisting={!!note}
                onChange={onNoteChange}
                onSave={onSaveNote}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Student brief panel ───────────────────────────────────────────────────────

function StudentBriefPanel({ brief }: { brief: StudentBrief }) {
  const [expandedEval, setExpandedEval] = useState<string | null>(null);

  const medias = [
    { label: "Nota", val: brief.nota_media, max: 7 },
    { label: "Crit. A", val: brief.banda_a_media, max: 5 },
    { label: "Crit. B", val: brief.banda_b_media, max: 5 },
    { label: "Crit. C", val: brief.banda_c_media, max: 5 },
    { label: "Crit. D", val: brief.banda_d_media, max: 5 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-sm">
        <User aria-hidden="true" className="h-3.5 w-3.5" style={{ color: L.muted }} />
        <span className="font-semibold">{brief.email}</span>
      </div>

      {brief.evaluaciones.length === 0 ? (
        <p className="text-sm" style={{ color: L.muted }}>
          Este alumno aún no tiene correcciones en LIBerico.
        </p>
      ) : (
        <>
          {/* Band averages */}
          <div>
            <SectionLabel icon={<BookOpen aria-hidden="true" className="h-3 w-3" />}>
              Medias ({brief.evaluaciones.length} evaluación
              {brief.evaluaciones.length !== 1 ? "es" : ""})
            </SectionLabel>
            <div className="mt-2 grid grid-cols-5 gap-2 text-center">
              {medias.map((m) => (
                <div key={m.label} className="session-soft rounded-2xl border px-1 py-2">
                  <div className="text-lg font-bold" style={{ color: L.ink }}>
                    {m.val ?? "—"}
                  </div>
                  <div className="text-[10px]" style={{ color: L.muted }}>
                    {m.label}
                    <span className="opacity-60">/{m.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation list */}
          <div>
            <SectionLabel icon={<FileText aria-hidden="true" className="h-3 w-3" />}>
              Correcciones (más reciente primero)
            </SectionLabel>
            <div className="mt-2 space-y-2">
              {brief.evaluaciones.map((ev) => (
                <EvaluacionCard
                  key={ev.id}
                  ev={ev}
                  expanded={expandedEval === ev.id}
                  onToggle={() => setExpandedEval(expandedEval === ev.id ? null : ev.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide"
      style={{ ...fontMono, color: L.muted }}
    >
      {icon}
      {children}
    </p>
  );
}

// ── Evaluation card ───────────────────────────────────────────────────────────

function EvaluacionCard({
  ev,
  expanded,
  onToggle,
}: {
  ev: EvalCompleta;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showTexto, setShowTexto] = useState(false);
  const [showAnalisis, setShowAnalisis] = useState(false);

  const criterios = [
    {
      label: "A — Comprensión e interpretación",
      banda: ev.banda_a,
      just: ev.justificacion_a,
    },
    { label: "B — Apreciación del estilo", banda: ev.banda_b, just: ev.justificacion_b },
    {
      label: "C — Presentación y desarrollo",
      banda: ev.banda_c,
      just: ev.justificacion_c,
    },
    {
      label: "D — Uso convenciones",
      banda: ev.banda_d,
      just: ev.justificacion_d,
    },
  ];

  return (
    <div className="session-card overflow-hidden rounded-2xl border text-xs">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="session-press flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span style={{ color: L.muted }}>{fmtFecha(ev.created_at)}</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold">
            {[
              { k: "A", v: ev.banda_a },
              { k: "B", v: ev.banda_b },
              { k: "C", v: ev.banda_c },
              { k: "D", v: ev.banda_d },
            ].map(({ k, v }) => (
              <span key={k} className="inline-flex items-center gap-0.5">
                <span className="font-sans font-normal" style={{ color: L.muted }}>
                  {k}:
                </span>
                {v}
              </span>
            ))}
            {ev.nota_ib !== null && (
              <span className="ml-1.5 font-sans font-semibold" style={{ color: L.primary }}>
                → {ev.nota_ib}
              </span>
            )}
          </div>
          {ev.pregunta_orientacion && (
            <span className="max-w-[240px] truncate italic" style={{ color: L.muted }}>
              "{ev.pregunta_orientacion.slice(0, 60)}
              {ev.pregunta_orientacion.length > 60 ? "…" : ""}"
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp
            aria-hidden="true"
            className="ml-2 h-3.5 w-3.5 shrink-0"
            style={{ color: L.muted }}
          />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="ml-2 h-3.5 w-3.5 shrink-0"
            style={{ color: L.muted }}
          />
        )}
      </button>

      {/* Detail */}
      {expanded && (
        <div
          className="space-y-4 border-t px-3 pb-4 pt-1"
          style={{ backgroundColor: L.bg2, borderColor: L.line }}
        >
          {/* Pregunta */}
          {ev.pregunta_orientacion && (
            <div>
              <p className="mb-1 font-semibold" style={{ color: L.muted }}>
                Pregunta de orientación
              </p>
              <p className="leading-relaxed">{ev.pregunta_orientacion}</p>
            </div>
          )}

          {/* Criterios con justificaciones */}
          <div>
            <p className="mb-2 font-semibold" style={{ color: L.muted }}>
              Calificación por criterios
            </p>
            <div className="space-y-2">
              {criterios.map((c) => (
                <div key={c.label} className="rounded-2xl border px-3 py-2" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.label}</span>
                    <span className="font-bold font-mono">{c.banda}/5</span>
                  </div>
                  {c.just && (
                    <p className="mt-1 leading-relaxed" style={{ color: L.muted }}>
                      {c.just}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Comentario global */}
          {ev.comentario_global && (
            <div>
              <p className="mb-1 font-semibold" style={{ color: L.muted }}>
                Comentario global
              </p>
              <p className="leading-relaxed">{ev.comentario_global}</p>
            </div>
          )}

          {/* Fortalezas */}
          {ev.fortalezas && (
            <div>
              <p className="mb-1 font-semibold" style={{ color: L.ok }}>
                Fortalezas
              </p>
              <p className="leading-relaxed" style={{ color: L.ink }}>
                {ev.fortalezas}
              </p>
            </div>
          )}

          {/* Áreas de mejora */}
          {ev.areas_mejora && (
            <div>
              <p className="mb-1 font-semibold" style={{ color: L.amberDeep }}>
                Áreas de mejora
              </p>
              <p className="leading-relaxed" style={{ color: L.ink }}>
                {ev.areas_mejora}
              </p>
            </div>
          )}

          {/* Texto literario (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowTexto(!showTexto)}
              className="session-press flex items-center gap-1 rounded-xl font-semibold transition-colors hover:opacity-80"
              style={{ color: L.muted }}
            >
              <BookMarked aria-hidden="true" className="h-3.5 w-3.5" />
              Texto literario
              {showTexto ? (
                <ChevronUp aria-hidden="true" className="h-3 w-3" />
              ) : (
                <ChevronDown aria-hidden="true" className="h-3 w-3" />
              )}
            </button>
            {showTexto && (
              <TextoLectura
                texto={ev.texto_literario}
                className="mt-2 rounded-2xl border px-3 py-2"
                paragraphClassName="leading-relaxed"
              />
            )}
          </div>

          {/* Análisis del alumno (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAnalisis(!showAnalisis)}
              className="session-press flex items-center gap-1 rounded-xl font-semibold transition-colors hover:opacity-80"
              style={{ color: L.muted }}
            >
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              Análisis del alumno
              {showAnalisis ? (
                <ChevronUp aria-hidden="true" className="h-3 w-3" />
              ) : (
                <ChevronDown aria-hidden="true" className="h-3 w-3" />
              )}
            </button>
            {showAnalisis && (
              <p
                className="mt-2 whitespace-pre-line rounded-2xl border px-3 py-2 leading-relaxed"
                style={cardStyle}
              >
                {ev.analisis_estudiante}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes editor ──────────────────────────────────────────────────────────────

function NotesEditor({
  draft,
  saving,
  hasExisting,
  onChange,
  onSave,
}: {
  draft: { summary: string; next_steps: string; visible: boolean };
  saving: boolean;
  hasExisting: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <SectionLabel icon={null}>Notas post-sesión</SectionLabel>

      <div className="space-y-1.5">
        <Label className="text-xs" style={{ color: L.ink }}>
          Resumen de la sesión
        </Label>
        <Textarea
          rows={3}
          className="resize-none rounded-2xl text-sm"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
          placeholder="¿Qué trabajasteis? ¿Cuáles fueron los puntos clave?"
          value={draft.summary}
          onChange={(e) => onChange("summary", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs" style={{ color: L.ink }}>
          Próximos pasos para el alumno
        </Label>
        <Textarea
          rows={3}
          className="resize-none rounded-2xl text-sm"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
          placeholder="Ej: 1. Practica introducciones con tesis clara. 2. Añade más citas textuales cortas."
          value={draft.next_steps}
          onChange={(e) => onChange("next_steps", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="visible-student"
          checked={draft.visible}
          onChange={(e) => onChange("visible", e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <Label
          htmlFor="visible-student"
          className="cursor-pointer text-xs"
          style={{ color: L.ink }}
        >
          Mostrar estas notas al alumno en su página de sesiones
        </Label>
      </div>

      <Button
        type="button"
        size="sm"
        className="session-press rounded-xl"
        style={ctaStyle}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? <Loader2 aria-hidden="true" className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
        {hasExisting ? "Actualizar notas" : "Guardar notas"}
      </Button>
    </div>
  );
}
