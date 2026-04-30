import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
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

export const Route = createFileRoute("/profesor-sesiones")({
  head: () => ({
    meta: [{ title: "Mis sesiones — LIBerico" }],
  }),
  component: ProfesorSesionesPage,
});

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
  created_at: string;
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

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "text-amber-700 bg-amber-50 border-amber-200",
  confirmed: "text-green-700 bg-green-50 border-green-200",
  cancelled: "text-muted-foreground bg-muted border-border",
  completed: "text-blue-700 bg-blue-50 border-blue-200",
  no_show: "text-destructive bg-destructive/10 border-destructive/20",
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
    <>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Mis sesiones</h1>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{proximas.length}</strong> próxima
              {proximas.length !== 1 ? "s" : ""}
            </span>
            {pendientes.length > 0 && (
              <span className="text-amber-700">
                <strong>{pendientes.length}</strong> pendiente
                {pendientes.length !== 1 ? "s" : ""}
              </span>
            )}
            <span>
              <strong className="text-foreground">{availableSlots.length}</strong> slot
              {availableSlots.length !== 1 ? "s" : ""} libre
              {availableSlots.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(["sesiones", "disponibilidad"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "sesiones" ? "Sesiones" : "Mi disponibilidad"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              <p className="text-muted-foreground text-sm py-4">
                No tienes sesiones todavía. Añade horarios en la pestaña "Mi disponibilidad".
              </p>
            )}
          </div>
        ) : (
          /* ── Disponibilidad ── */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir horario disponible
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-date">Fecha</Label>
                    <Input
                      id="slot-date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>

                  {/* Time dropdown — 10-min intervals */}
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-time">Hora de inicio (hora Stockholm)</Label>
                    <select
                      id="slot-time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="slot-duration">Duración</Label>
                    <select
                      id="slot-duration"
                      value={newDurationMin}
                      onChange={(e) => setNewDurationMin(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value={60}>60 minutos</option>
                      <option value={75}>75 minutos (recomendado)</option>
                      <option value={90}>90 minutos</option>
                    </select>
                  </div>
                  {newSlotEnd && (
                    <div className="flex items-end pb-1.5">
                      <p className="text-sm text-muted-foreground">
                        Fin:{" "}
                        <strong className="text-foreground">
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
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {conflictMsg}
                  </div>
                )}

                <div className="space-y-1.5 max-w-xs">
                  <Label htmlFor="slot-price">Precio base (SEK, sin moms)</Label>
                  <Input
                    id="slot-price"
                    type="number"
                    min="0"
                    step="50"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>

                <Button
                  onClick={crearSlot}
                  disabled={savingSlot || !newDate || !newTime || !!conflictMsg}
                >
                  {savingSlot ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Añadir horario
                </Button>
              </CardContent>
            </Card>

            {/* Slot list */}
            <div className="space-y-2">
              <SectionTitle>Próximos horarios</SectionTitle>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes horarios próximos.</p>
              ) : (
                slots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize">{fmtLargo(s.starts_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-5">
                        {s.price_sek} SEK + moms ·{" "}
                        <span
                          className={
                            s.status === "available"
                              ? "text-green-700 font-medium"
                              : s.status === "booked"
                                ? "text-blue-700 font-medium"
                                : "text-amber-600 font-medium"
                          }
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
                        onClick={() => eliminarSlot(s.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 ml-2"
                        title="Eliminar horario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {children}
    </h2>
  );
}

function PendingCard({ booking: b }: { booking: Booking }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-amber-900">
          {b.student_email ?? `Alumno #${b.student_id.slice(0, 8)}`}
        </span>
        <span className="text-xs text-amber-700">Solicitado {fmtFecha(b.created_at)}</span>
      </div>
      {b.slot_starts_at && (
        <div className="text-xs text-amber-800 flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          <span className="capitalize">{fmtCorto(b.slot_starts_at)}</span>
        </div>
      )}
      {b.student_goal && <p className="text-xs text-amber-700 italic">"{b.student_goal}"</p>}
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
  const statusColor = STATUS_COLOR[b.status] ?? "bg-muted border-border text-muted-foreground";
  const isLoadingBrief = brief === undefined && isExpanded;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">
                {b.student_email ?? `Alumno #${b.student_id.slice(0, 8)}`}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}
              >
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            {b.slot_starts_at && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5 flex-wrap">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <span className="capitalize">{fmtCorto(b.slot_starts_at)}</span>
                {b.slot_ends_at && (
                  <>
                    <Clock className="h-3 w-3 ml-1 shrink-0" />
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
            onClick={onToggle}
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Ver detalle
              </>
            )}
          </button>
        </div>

        {b.student_goal && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 max-w-lg">
            Objetivo: "{b.student_goal}"
          </p>
        )}

        {b.meet_link && b.status === "confirmed" && (
          <a
            href={b.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            <Video className="h-3.5 w-3.5" />
            Unirse a Google Meet
          </a>
        )}

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-6 mt-2">
            {isLoadingBrief ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando historial del alumno…
              </div>
            ) : brief === "no-access" ? (
              <div className="flex items-start gap-2 bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
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
    { label: "Nota IB", val: brief.nota_media, max: 7 },
    { label: "Crit. A", val: brief.banda_a_media, max: 5 },
    { label: "Crit. B", val: brief.banda_b_media, max: 5 },
    { label: "Crit. C", val: brief.banda_c_media, max: 5 },
    { label: "Crit. D", val: brief.banda_d_media, max: 5 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-sm">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{brief.email}</span>
      </div>

      {brief.evaluaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este alumno aún no tiene correcciones en LIBerico.
        </p>
      ) : (
        <>
          {/* Band averages */}
          <div>
            <SectionLabel icon={<BookOpen className="h-3 w-3" />}>
              Medias ({brief.evaluaciones.length} evaluación
              {brief.evaluaciones.length !== 1 ? "es" : ""})
            </SectionLabel>
            <div className="grid grid-cols-5 gap-2 text-center mt-2">
              {medias.map((m) => (
                <div key={m.label} className="bg-muted/50 rounded-lg py-2 px-1">
                  <div className="text-lg font-bold text-foreground">{m.val ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.label}
                    <span className="opacity-60">/{m.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation list */}
          <div>
            <SectionLabel icon={<FileText className="h-3 w-3" />}>
              Correcciones (más reciente primero)
            </SectionLabel>
            <div className="space-y-2 mt-2">
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
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
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
    <div className="rounded-lg border border-border overflow-hidden text-xs">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-muted-foreground">{fmtFecha(ev.created_at)}</span>
          <div className="flex items-center gap-1.5 font-mono font-semibold">
            {[
              { k: "A", v: ev.banda_a },
              { k: "B", v: ev.banda_b },
              { k: "C", v: ev.banda_c },
              { k: "D", v: ev.banda_d },
            ].map(({ k, v }) => (
              <span key={k} className="inline-flex items-center gap-0.5">
                <span className="text-muted-foreground font-normal font-sans">{k}:</span>
                {v}
              </span>
            ))}
            {ev.nota_ib !== null && (
              <span className="ml-1.5 text-primary font-semibold font-sans">→ {ev.nota_ib}</span>
            )}
          </div>
          {ev.pregunta_orientacion && (
            <span className="text-muted-foreground italic truncate max-w-[240px]">
              "{ev.pregunta_orientacion.slice(0, 60)}
              {ev.pregunta_orientacion.length > 60 ? "…" : ""}"
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
        )}
      </button>

      {/* Detail */}
      {expanded && (
        <div className="px-3 pb-4 pt-1 space-y-4 bg-muted/10 border-t">
          {/* Pregunta */}
          {ev.pregunta_orientacion && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Pregunta de orientación</p>
              <p className="leading-relaxed">{ev.pregunta_orientacion}</p>
            </div>
          )}

          {/* Criterios con justificaciones */}
          <div>
            <p className="font-semibold text-muted-foreground mb-2">Calificación por criterios</p>
            <div className="space-y-2">
              {criterios.map((c) => (
                <div
                  key={c.label}
                  className="rounded-md bg-background border border-border px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.label}</span>
                    <span className="font-bold font-mono">{c.banda}/5</span>
                  </div>
                  {c.just && <p className="text-muted-foreground mt-1 leading-relaxed">{c.just}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Comentario global */}
          {ev.comentario_global && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Comentario global</p>
              <p className="leading-relaxed">{ev.comentario_global}</p>
            </div>
          )}

          {/* Fortalezas */}
          {ev.fortalezas && (
            <div>
              <p className="font-semibold text-green-700 mb-1">Fortalezas</p>
              <p className="text-green-900 leading-relaxed">{ev.fortalezas}</p>
            </div>
          )}

          {/* Áreas de mejora */}
          {ev.areas_mejora && (
            <div>
              <p className="font-semibold text-amber-700 mb-1">Áreas de mejora</p>
              <p className="text-amber-900 leading-relaxed">{ev.areas_mejora}</p>
            </div>
          )}

          {/* Texto literario (collapsible) */}
          <div>
            <button
              onClick={() => setShowTexto(!showTexto)}
              className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookMarked className="h-3.5 w-3.5" />
              Texto literario
              {showTexto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTexto && (
              <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground bg-background border border-border rounded-md px-3 py-2">
                {ev.texto_literario}
              </p>
            )}
          </div>

          {/* Análisis del alumno (collapsible) */}
          <div>
            <button
              onClick={() => setShowAnalisis(!showAnalisis)}
              className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Análisis del alumno
              {showAnalisis ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showAnalisis && (
              <p className="mt-2 leading-relaxed whitespace-pre-line bg-background border border-border rounded-md px-3 py-2">
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
        <Label className="text-xs">Resumen de la sesión</Label>
        <Textarea
          rows={3}
          className="resize-none text-sm"
          placeholder="¿Qué trabajasteis? ¿Cuáles fueron los puntos clave?"
          value={draft.summary}
          onChange={(e) => onChange("summary", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Próximos pasos para el alumno</Label>
        <Textarea
          rows={3}
          className="resize-none text-sm"
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
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="visible-student" className="text-xs cursor-pointer">
          Mostrar estas notas al alumno en su página de sesiones
        </Label>
      </div>

      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        {hasExisting ? "Actualizar notas" : "Guardar notas"}
      </Button>
    </div>
  );
}
