import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useCallback, useEffect, useId, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
import {
  addDaysToDateInput,
  dateInputToUtcNoon,
  dateTimeInTimeZoneToDate,
  formatTimeZoneLabel,
  getBrowserTimeZone,
  minutesOfDayInTimeZone,
  toDateInputInTimeZone,
  toTimeInputInTimeZone,
} from "@/lib/timezone";

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

const START_TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break;
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const BUFFER_MS = 15 * 60 * 1000; // 15-min gap required between sessions
const AGENDA_START_HOUR = 7;
const AGENDA_END_HOUR = 22;
const AGENDA_HOUR_HEIGHT = 26;
const DURATION_OPTIONS = [60, 75, 90] as const;
const PRICE_PRESETS = [900, 1250, 1500, 1800] as const;
const MAX_REPEAT_OCCURRENCES = 52;
const REPEAT_OPTIONS = [
  { value: "none", label: "No se repite", helper: "Solo este día" },
  { value: "weekly", label: "Semanal", helper: "Mismo día y hora" },
  { value: "biweekly", label: "Cada 2 semanas", helper: "Misma hora alterna" },
] as const;
const QUICK_DAYS = [
  { label: "Hoy", offsetDays: 0 },
  { label: "Mañana", offsetDays: 1 },
  { label: "+7 días", offsetDays: 7 },
] as const;

const sekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

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
  slot_id: string;
  student_goal: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  student_id: string;
  student_email: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  meet_link: string | null;
};

type SlotDraft = {
  startsAt: Date;
  endsAt: Date;
  occurrence: number;
};

type RepeatMode = (typeof REPEAT_OPTIONS)[number]["value"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLargo(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function fmtCorto(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function fmtFecha(iso: string, timeZone: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
}

function fmtHora(iso: string, timeZone: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function fmtSEK(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? sekFormatter.format(n) : "—";
}

function startOfWeekDateInput(date: Date, timeZone: string) {
  const dateValue = toDateInputInTimeZone(date, timeZone);
  const utcNoon = dateInputToUtcNoon(dateValue);
  const day = utcNoon.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysFromMonday);
  return utcNoon.toISOString().slice(0, 10);
}

function fmtSemana(weekStart: string, timeZone: string) {
  const start = dateTimeInTimeZoneToDate(weekStart, "12:00", timeZone);
  const end = dateTimeInTimeZoneToDate(addDaysToDateInput(weekStart, 6), "12:00", timeZone);
  const sameMonth = start.getMonth() === end.getMonth();

  const startText = start.toLocaleDateString("es-ES", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    timeZone,
  });
  const endText = end.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
  return `${startText}–${endText}`;
}

function fmtDiaAgenda(dateValue: string, timeZone: string) {
  return dateTimeInTimeZoneToDate(dateValue, "12:00", timeZone).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    timeZone,
  });
}

function durationMinutes(startsAt: string, endsAt: string) {
  return Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000),
  );
}

function buildSlotDrafts(
  dateValue: string,
  timeValue: string,
  durationMin: number,
  timeZone: string,
  repeatMode: RepeatMode,
  repeatEndsOn: string,
): SlotDraft[] {
  if (!dateValue || !timeValue) return [];
  const repeatEveryWeeks = repeatMode === "weekly" ? 1 : repeatMode === "biweekly" ? 2 : 0;
  const endDateValue =
    repeatMode === "none" || !repeatEndsOn || repeatEndsOn < dateValue ? dateValue : repeatEndsOn;

  const drafts: SlotDraft[] = [];
  let occurrence = 0;
  let occurrenceDate = dateValue;
  while (occurrenceDate <= endDateValue && occurrence < MAX_REPEAT_OCCURRENCES) {
    const firstStart = dateTimeInTimeZoneToDate(occurrenceDate, timeValue, timeZone);
    drafts.push({
      startsAt: firstStart,
      endsAt: new Date(firstStart.getTime() + durationMin * 60_000),
      occurrence,
    });

    occurrence += 1;
    if (repeatMode === "none") break;
    occurrenceDate = addDaysToDateInput(dateValue, occurrence * repeatEveryWeeks * 7);
  }

  return drafts;
}

function hasConflict(
  newStartMs: number,
  newEndMs: number,
  slots: Slot[],
  timeZone: string,
): { conflict: boolean; reason: string } {
  for (const s of slots) {
    const sStart = new Date(s.starts_at).getTime();
    const sEnd = new Date(s.ends_at).getTime();
    if (newStartMs < sEnd + BUFFER_MS && newEndMs > sStart - BUFFER_MS) {
      return {
        conflict: true,
        reason: `Conflicto con sesión del ${fmtCorto(s.starts_at, timeZone)} (incluye margen de 15 min).`,
      };
    }
  }
  return { conflict: false, reason: "" };
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente de pago",
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
  const teacherTimeZone = getBrowserTimeZone();
  const teacherTimeZoneLabel = formatTimeZoneLabel(teacherTimeZone);

  const [tab, setTab] = useState<"sesiones" | "disponibilidad">("sesiones");
  const [agendaWeekStart, setAgendaWeekStart] = useState(() =>
    startOfWeekDateInput(new Date(), teacherTimeZone),
  );
  const [historialOpen, setHistorialOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // All non-cancelled future slots — used for conflict detection and display
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  // Availability form
  const [newDate, setNewDate] = useState(() =>
    toDateInputInTimeZone(new Date(Date.now() + 24 * 60 * 60 * 1000), teacherTimeZone),
  );
  const [newTime, setNewTime] = useState("09:00");
  const [newDurationMin, setNewDurationMin] = useState(75);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [repeatEndsOn, setRepeatEndsOn] = useState(() =>
    addDaysToDateInput(
      toDateInputInTimeZone(new Date(Date.now() + 24 * 60 * 60 * 1000), teacherTimeZone),
      28,
    ),
  );
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
  const historialDropdownId = useId();
  const todayInTeacherTimeZone = useMemo(
    () => toDateInputInTimeZone(new Date(), teacherTimeZone),
    [teacherTimeZone],
  );
  const priceNumber = Number(newPrice);
  const priceIsValid = Number.isFinite(priceNumber) && priceNumber >= 0;
  const vatSek = priceIsValid ? Math.round(priceNumber * 0.25) : 0;
  const totalSek = priceIsValid ? priceNumber + vatSek : 0;
  const previewSlots = useMemo(
    () =>
      buildSlotDrafts(newDate, newTime, newDurationMin, teacherTimeZone, repeatMode, repeatEndsOn),
    [newDate, newTime, newDurationMin, teacherTimeZone, repeatMode, repeatEndsOn],
  );
  const previewStart = previewSlots[0]?.startsAt ?? null;
  const previewEnd = previewSlots.length > 0 ? previewSlots[previewSlots.length - 1].endsAt : null;
  const batchTotalSek = priceIsValid ? totalSek * previewSlots.length : 0;
  const visiblePreviewSlots = previewSlots.slice(0, 8);
  const hiddenPreviewCount = Math.max(0, previewSlots.length - visiblePreviewSlots.length);
  const repeatEndForDisplay = repeatEndsOn || newDate;
  const repeatEndDateLabel = fmtFecha(
    dateTimeInTimeZoneToDate(repeatEndForDisplay, "12:00", teacherTimeZone).toISOString(),
    teacherTimeZone,
  );
  const repeatSummary =
    repeatMode === "none"
      ? "Una vez"
      : repeatMode === "weekly"
        ? `Semanal hasta ${repeatEndDateLabel}`
        : `Cada 2 semanas hasta ${repeatEndDateLabel}`;

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
          "id, status, student_goal, created_at, confirmed_at, student_id, slot_id, meet_link, slot:booking_slots(starts_at, ends_at)",
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
        slot_id: b.slot_id as string,
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

  useEffect(() => {
    if (repeatEndsOn < newDate) setRepeatEndsOn(newDate);
  }, [newDate, repeatEndsOn]);

  // Re-check conflict whenever form fields change
  useEffect(() => {
    if (previewSlots.length === 0) {
      setConflictMsg("");
      return;
    }
    for (const [index, draft] of previewSlots.entries()) {
      const draftLabel = fmtCorto(draft.startsAt.toISOString(), teacherTimeZone);
      if (draft.startsAt.getTime() <= Date.now()) {
        setConflictMsg(
          previewSlots.length === 1
            ? "El horario debe estar en el futuro."
            : `El horario ${index + 1} (${draftLabel}) debe estar en el futuro.`,
        );
        return;
      }
      const { conflict, reason } = hasConflict(
        draft.startsAt.getTime(),
        draft.endsAt.getTime(),
        slots,
        teacherTimeZone,
      );
      if (conflict) {
        setConflictMsg(
          previewSlots.length === 1 ? reason : `Horario ${index + 1} (${draftLabel}): ${reason}`,
        );
        return;
      }
    }
    setConflictMsg("");
  }, [previewSlots, slots, teacherTimeZone]);

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
    if (!newDate || !newTime || previewSlots.length === 0) return;
    if (previewSlots.some((draft) => draft.startsAt.getTime() <= Date.now())) {
      toast.error("Todos los horarios deben estar en el futuro.");
      return;
    }
    if (!priceIsValid) {
      toast.error("Introduce un precio válido.");
      return;
    }

    // Double-check conflict (in case slots changed since last check)
    for (const [index, draft] of previewSlots.entries()) {
      const draftLabel = fmtCorto(draft.startsAt.toISOString(), teacherTimeZone);
      const { conflict, reason } = hasConflict(
        draft.startsAt.getTime(),
        draft.endsAt.getTime(),
        slots,
        teacherTimeZone,
      );
      if (conflict) {
        toast.error(
          previewSlots.length === 1 ? reason : `Horario ${index + 1} (${draftLabel}): ${reason}`,
        );
        return;
      }
    }

    setSavingSlot(true);
    const { error } = await supabase.from("booking_slots").insert(
      previewSlots.map((draft) => ({
        teacher_id: user!.id,
        starts_at: draft.startsAt.toISOString(),
        ends_at: draft.endsAt.toISOString(),
        price_sek: Math.round(priceNumber),
        status: "available",
      })),
    );

    if (error) {
      if (error.code === "23505") {
        toast.error("Ya tienes un horario en alguno de esos momentos.");
      } else {
        toast.error("Error al crear el horario: " + error.message);
      }
    } else {
      const lastDraft = previewSlots[previewSlots.length - 1];
      const nextStart = new Date(lastDraft.endsAt.getTime() + BUFFER_MS);
      const nextDate = toDateInputInTimeZone(nextStart, teacherTimeZone);
      const nextTime = toTimeInputInTimeZone(nextStart, teacherTimeZone);
      const slotLabel = previewSlots.length === 1 ? "Horario añadido" : "Horarios añadidos";
      toast.success(`${slotLabel}. Siguiente hueco listo a las ${nextTime}.`);
      setNewDate(nextDate);
      if (START_TIME_OPTIONS.includes(nextTime)) setNewTime(nextTime);
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
  const historialIds = new Set(historial.map((b) => b.id));
  const availableSlots = slots.filter((s) => s.status === "available");
  const toggleBookingFromAgenda = (bookingId: string, studentId: string) => {
    if (historialIds.has(bookingId)) setHistorialOpen(true);
    toggleExpand(bookingId, studentId);
  };

  return (
    <div id="profesor-sesiones-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-5">
        {/* Header */}
        <div>
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            Panel del profesor
          </div>
          <h1 className="text-2xl font-semibold" style={headingStyle}>
            Mis sesiones
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: L.muted }}>
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
              className="session-press -mb-px border-b-2 px-3 py-1.5 text-sm transition-colors"
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
          <div className="space-y-5">
            <AgendaSemanal
              weekStart={agendaWeekStart}
              bookings={bookings}
              slots={slots}
              expanded={expanded}
              timeZone={teacherTimeZone}
              timeZoneLabel={teacherTimeZoneLabel}
              onWeekChange={setAgendaWeekStart}
              onToggleBooking={toggleBookingFromAgenda}
            />

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
                timeZone={teacherTimeZone}
                onToggle={toggleExpand}
                onNoteChange={(id, field, value) =>
                  setNoteDraft((prev) => ({ ...prev, [id]: { ...prev[id]!, [field]: value } }))
                }
                onSaveNote={guardarNota}
              />
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <section className="space-y-3">
                <button
                  type="button"
                  className="session-card session-press flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
                  style={{ color: L.ink }}
                  aria-expanded={historialOpen}
                  aria-controls={historialDropdownId}
                  onClick={() => setHistorialOpen((open) => !open)}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Historial</span>
                    <span className="block text-xs" style={{ color: L.muted }}>
                      {historial.length} sesión{historial.length !== 1 ? "es" : ""} anterior
                      {historial.length !== 1 ? "es" : ""}
                    </span>
                  </span>
                  <span
                    className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                    style={softStyle}
                    aria-hidden="true"
                  >
                    {historialOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {historialOpen && (
                  <div id={historialDropdownId}>
                    <BookingGroup
                      title="Sesiones anteriores"
                      bookings={historial}
                      expanded={expanded}
                      briefs={briefs}
                      notes={notes}
                      noteDraft={noteDraft}
                      savingNote={savingNote}
                      timeZone={teacherTimeZone}
                      onToggle={toggleExpand}
                      onNoteChange={(id, field, value) =>
                        setNoteDraft((prev) => ({
                          ...prev,
                          [id]: { ...prev[id]!, [field]: value },
                        }))
                      }
                      onSaveNote={guardarNota}
                    />
                  </div>
                )}
              </section>
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
            <Card className="session-card overflow-hidden rounded-2xl border">
              <CardHeader className="border-b pb-3" style={{ borderColor: L.line }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base" style={headingStyle}>
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Constructor de horarios
                  </CardTitle>
                  <span
                    className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: L.bg2, borderColor: L.line, color: L.muted }}
                  >
                    {teacherTimeZoneLabel}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-5 p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
                      <div className="space-y-2">
                        <Label style={{ color: L.ink }}>Día</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {QUICK_DAYS.map((day) => {
                            const date = toDateInputInTimeZone(
                              new Date(Date.now() + day.offsetDays * 24 * 60 * 60 * 1000),
                              teacherTimeZone,
                            );
                            const selected = newDate === date;
                            return (
                              <button
                                key={day.label}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setNewDate(date)}
                                className="session-press min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold"
                                style={{
                                  backgroundColor: selected ? L.primary + "12" : L.surface,
                                  borderColor: selected ? L.primary : L.line,
                                  color: selected ? L.primary : L.ink,
                                }}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slot-date-custom" style={{ color: L.ink }}>
                          Empieza
                        </Label>
                        <Input
                          id="slot-date-custom"
                          name="slot-date"
                          type="date"
                          min={todayInTeacherTimeZone}
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="h-11 rounded-xl"
                          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <Label htmlFor="slot-time" style={{ color: L.ink }}>
                          Inicio
                        </Label>
                        <span className="text-xs" style={{ color: L.muted }}>
                          {teacherTimeZoneLabel}
                        </span>
                      </div>
                      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
                        <div className="flex min-w-max gap-2">
                          {START_TIME_OPTIONS.map((time) => {
                            const selected = newTime === time;
                            return (
                              <button
                                key={time}
                                id={time === newTime ? "slot-time" : undefined}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setNewTime(time)}
                                className="session-press min-h-11 min-w-[72px] rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums"
                                style={{
                                  backgroundColor: selected ? L.primary + "12" : L.surface,
                                  borderColor: selected ? L.primary : L.line,
                                  color: selected ? L.primary : L.ink,
                                }}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="max-w-sm space-y-2">
                      <Label style={{ color: L.ink }}>Duración</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {DURATION_OPTIONS.map((minutes) => {
                          const selected = newDurationMin === minutes;
                          return (
                            <button
                              key={minutes}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setNewDurationMin(minutes)}
                              className="session-press min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold tabular-nums"
                              style={{
                                backgroundColor: selected ? L.primary + "12" : L.surface,
                                borderColor: selected ? L.primary : L.line,
                                color: selected ? L.primary : L.ink,
                              }}
                            >
                              {minutes} min
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label style={{ color: L.ink }}>Repetición</Label>
                      <div className="grid gap-2 md:grid-cols-3">
                        {REPEAT_OPTIONS.map((option) => {
                          const selected = repeatMode === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setRepeatMode(option.value)}
                              className="session-press min-h-14 rounded-xl border px-3 py-2 text-left"
                              style={{
                                backgroundColor: selected ? L.primary + "12" : L.surface,
                                borderColor: selected ? L.primary : L.line,
                                color: selected ? L.primary : L.ink,
                              }}
                            >
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span
                                className="block text-[11px] font-normal"
                                style={{ color: selected ? L.primary : L.muted }}
                              >
                                {option.helper}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {repeatMode !== "none" && (
                        <div
                          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2"
                          style={softStyle}
                        >
                          <div className="space-y-1.5">
                            <Label htmlFor="repeat-start" style={{ color: L.ink }}>
                              Empieza
                            </Label>
                            <Input
                              id="repeat-start"
                              name="repeat-start"
                              type="date"
                              min={todayInTeacherTimeZone}
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="h-10 rounded-lg"
                              style={{
                                backgroundColor: L.surface,
                                borderColor: L.line,
                                color: L.ink,
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="repeat-end" style={{ color: L.ink }}>
                              Termina
                            </Label>
                            <Input
                              id="repeat-end"
                              name="repeat-end"
                              type="date"
                              min={newDate}
                              value={repeatEndsOn}
                              onChange={(e) => setRepeatEndsOn(e.target.value)}
                              className="h-10 rounded-lg"
                              style={{
                                backgroundColor: L.surface,
                                borderColor: L.line,
                                color: L.ink,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slot-price" style={{ color: L.ink }}>
                        Precio base
                      </Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PRICE_PRESETS.map((price) => {
                          const selected = Number(newPrice) === price;
                          return (
                            <button
                              key={price}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setNewPrice(String(price))}
                              className="session-press min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums"
                              style={{
                                backgroundColor: selected ? L.primary + "12" : L.surface,
                                borderColor: selected ? L.primary : L.line,
                                color: selected ? L.primary : L.ink,
                              }}
                            >
                              {fmtSEK(price)}
                            </button>
                          );
                        })}
                      </div>
                      <Input
                        id="slot-price"
                        name="slot-price"
                        type="number"
                        min="0"
                        step="50"
                        inputMode="numeric"
                        autoComplete="off"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="h-11 max-w-xs rounded-xl"
                        aria-describedby="slot-price-note"
                        style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                      />
                      <p id="slot-price-note" className="text-xs" style={{ color: L.muted }}>
                        Sin moms
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex flex-col justify-between border-t p-4 sm:p-5 lg:border-l lg:border-t-0"
                    style={{ backgroundColor: L.bg2, borderColor: L.line }}
                    aria-live="polite"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Clock
                            aria-hidden="true"
                            className="h-4 w-4"
                            style={{ color: L.primary }}
                          />
                          Vista previa
                        </div>
                        <span className="text-xs font-semibold" style={{ color: L.muted }}>
                          {previewSlots.length} horario{previewSlots.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {previewStart && previewEnd ? (
                        <div className="space-y-3">
                          <div>
                            <p
                              className="text-sm font-semibold capitalize"
                              style={{ color: L.ink }}
                            >
                              {fmtFecha(previewStart.toISOString(), teacherTimeZone)}
                              {toDateInputInTimeZone(previewStart, teacherTimeZone) !==
                                toDateInputInTimeZone(previewEnd, teacherTimeZone) && (
                                <> – {fmtFecha(previewEnd.toISOString(), teacherTimeZone)}</>
                              )}
                            </p>
                            <p className="text-xs tabular-nums" style={{ color: L.muted }}>
                              {fmtHora(previewStart.toISOString(), teacherTimeZone)}–
                              {fmtHora(previewEnd.toISOString(), teacherTimeZone)} · {repeatSummary}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            {visiblePreviewSlots.map((draft, index) => (
                              <div
                                key={`${draft.startsAt.toISOString()}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs"
                                style={{
                                  backgroundColor: L.surface,
                                  borderColor: L.line,
                                  color: L.ink,
                                }}
                              >
                                <span
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                                  style={{ backgroundColor: L.primary + "12", color: L.primary }}
                                >
                                  {index + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate tabular-nums">
                                  <span className="mr-1 capitalize" style={{ color: L.muted }}>
                                    {fmtCorto(draft.startsAt.toISOString(), teacherTimeZone)}
                                  </span>
                                  {fmtHora(draft.startsAt.toISOString(), teacherTimeZone)}–
                                  {fmtHora(draft.endsAt.toISOString(), teacherTimeZone)}
                                </span>
                                <span className="shrink-0 tabular-nums" style={{ color: L.muted }}>
                                  {newDurationMin} min
                                </span>
                              </div>
                            ))}
                            {hiddenPreviewCount > 0 && (
                              <div
                                className="rounded-xl border px-3 py-2 text-center text-xs font-semibold"
                                style={{
                                  backgroundColor: L.surface,
                                  borderColor: L.line,
                                  color: L.muted,
                                }}
                              >
                                +{hiddenPreviewCount} horario
                                {hiddenPreviewCount !== 1 ? "s" : ""} más
                              </div>
                            )}
                          </div>

                          <div
                            className="space-y-1 rounded-xl border px-3 py-2 text-xs"
                            style={cardStyle}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span style={{ color: L.muted }}>Base por sesión</span>
                              <strong className="tabular-nums">
                                {priceIsValid ? fmtSEK(priceNumber) : "—"}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span style={{ color: L.muted }}>Moms por sesión</span>
                              <strong className="tabular-nums">
                                {priceIsValid ? fmtSEK(vatSek) : "—"}
                              </strong>
                            </div>
                            <div
                              className="mt-1 flex items-center justify-between gap-3 border-t pt-1"
                              style={{ borderColor: L.line }}
                            >
                              <span style={{ color: L.ink }}>Alumno paga</span>
                              <strong className="tabular-nums">
                                {priceIsValid ? fmtSEK(totalSek) : "—"}
                              </strong>
                            </div>
                            {previewSlots.length > 1 && (
                              <div
                                className="flex items-center justify-between gap-3 border-t pt-1"
                                style={{ borderColor: L.line }}
                              >
                                <span style={{ color: L.muted }}>Total de la serie</span>
                                <strong className="tabular-nums">
                                  {priceIsValid ? fmtSEK(batchTotalSek) : "—"}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: L.muted }}>
                          Sin horario seleccionado.
                        </p>
                      )}

                      {conflictMsg && (
                        <div
                          className="flex items-start gap-2 rounded-xl border px-3 py-2 text-xs"
                          style={{
                            backgroundColor: "#FFF1F2",
                            borderColor: "#FB7185",
                            color: "#BE123C",
                          }}
                          role="alert"
                        >
                          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {conflictMsg}
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      className="session-press mt-5 h-11 rounded-xl"
                      style={ctaStyle}
                      onClick={crearSlot}
                      disabled={
                        savingSlot ||
                        !newDate ||
                        !newTime ||
                        previewSlots.length === 0 ||
                        !!conflictMsg ||
                        !priceIsValid
                      }
                    >
                      {savingSlot ? (
                        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
                      )}
                      {previewSlots.length === 1
                        ? "Crear horario"
                        : `Crear ${previewSlots.length} horarios`}
                    </Button>
                  </div>
                </div>
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
                        <span className="capitalize">{fmtLargo(s.starts_at, teacherTimeZone)}</span>
                      </div>
                      <div className="pl-5 text-xs" style={{ color: L.muted }}>
                        {fmtHora(s.starts_at, teacherTimeZone)}–
                        {fmtHora(s.ends_at, teacherTimeZone)} ·{" "}
                        {durationMinutes(s.starts_at, s.ends_at)} min · {fmtSEK(s.price_sek)} + moms
                        ·{" "}
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
                        aria-label={`Eliminar horario del ${fmtCorto(s.starts_at, teacherTimeZone)}`}
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

type AgendaItem =
  | {
      kind: "booking";
      id: string;
      status: string;
      starts_at: string;
      ends_at: string;
      title: string;
      meta: string;
      booking: Booking;
    }
  | {
      kind: "slot";
      id: string;
      status: string;
      starts_at: string;
      ends_at: string;
      title: string;
      meta: string;
    };

function AgendaSemanal({
  weekStart,
  bookings,
  slots,
  expanded,
  timeZone,
  timeZoneLabel,
  onWeekChange,
  onToggleBooking,
}: {
  weekStart: string;
  bookings: Booking[];
  slots: Slot[];
  expanded: string | null;
  timeZone: string;
  timeZoneLabel: string;
  onWeekChange: (weekStart: string) => void;
  onToggleBooking: (id: string, studentId: string) => void;
}) {
  const weekDates = Array.from({ length: 7 }, (_, index) => addDaysToDateInput(weekStart, index));
  const weekDateSet = new Set(weekDates);
  const occupiedSlotIds = new Set(
    bookings.filter((b) => b.status !== "cancelled").map((b) => b.slot_id),
  );
  const agendaHeight = (AGENDA_END_HOUR - AGENDA_START_HOUR) * AGENDA_HOUR_HEIGHT;
  const hours = Array.from(
    { length: AGENDA_END_HOUR - AGENDA_START_HOUR + 1 },
    (_, index) => AGENDA_START_HOUR + index,
  );

  const bookingItems: AgendaItem[] = bookings
    .filter((b) => b.status !== "cancelled" && b.slot_starts_at)
    .map((b) => {
      const fallbackEnd = new Date(new Date(b.slot_starts_at!).getTime() + 75 * 60_000);
      return {
        kind: "booking" as const,
        id: b.id,
        status: b.status,
        starts_at: b.slot_starts_at!,
        ends_at: b.slot_ends_at ?? fallbackEnd.toISOString(),
        title: b.student_email ?? `Alumno #${b.student_id.slice(0, 8)}`,
        meta: STATUS_LABEL[b.status] ?? b.status,
        booking: b,
      };
    })
    .filter((item) => weekDateSet.has(toDateInputInTimeZone(new Date(item.starts_at), timeZone)));

  const slotItems: AgendaItem[] = slots
    .filter((s) => !occupiedSlotIds.has(s.id))
    .map((s) => ({
      kind: "slot" as const,
      id: s.id,
      status: s.status,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      title:
        s.status === "available"
          ? "Hueco libre"
          : s.status === "held"
            ? "Retenido"
            : s.status === "booked"
              ? "Reservado"
              : s.status,
      meta: `${durationMinutes(s.starts_at, s.ends_at)} min · ${fmtSEK(s.price_sek)}`,
    }))
    .filter((item) => weekDateSet.has(toDateInputInTimeZone(new Date(item.starts_at), timeZone)));

  const itemsByDay = [...bookingItems, ...slotItems]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .reduce<Record<string, AgendaItem[]>>((acc, item) => {
      const day = toDateInputInTimeZone(new Date(item.starts_at), timeZone);
      acc[day] = [...(acc[day] ?? []), item];
      return acc;
    }, {});

  const totalItems = bookingItems.length + slotItems.length;

  return (
    <Card className="session-card rounded-2xl border">
      <CardHeader className="space-y-2 px-3 pb-2 pt-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle
              className="flex items-center gap-2 text-sm sm:text-base"
              style={headingStyle}
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Agenda semanal
            </CardTitle>
            <p className="mt-0.5 text-[11px]" style={{ color: L.muted }}>
              {fmtSemana(weekStart, timeZone)} · {timeZoneLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="session-press inline-flex h-8 w-8 items-center justify-center rounded-lg border"
              style={softStyle}
              aria-label="Semana anterior"
              onClick={() => onWeekChange(addDaysToDateInput(weekStart, -7))}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="session-press h-8 rounded-lg border px-2 text-xs font-semibold"
              style={softStyle}
              onClick={() => onWeekChange(startOfWeekDateInput(new Date(), timeZone))}
            >
              Hoy
            </button>
            <button
              type="button"
              className="session-press inline-flex h-8 w-8 items-center justify-center rounded-lg border"
              style={softStyle}
              aria-label="Semana siguiente"
              onClick={() => onWeekChange(addDaysToDateInput(weekStart, 7))}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px]" style={{ color: L.muted }}>
          <AgendaLegend color={L.ok} bg="#ECFDF5" label="Confirmada" />
          <AgendaLegend color={L.amberDeep} bg="#FEF3C7" label="Pendiente" />
          <AgendaLegend color={L.primary} bg="#EEF2FF" label="Completada" />
          <AgendaLegend color={L.muted} bg={L.bg2} label="Libre" />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 sm:px-4">
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: L.line }}>
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div
                className="grid border-b text-[11px] font-semibold"
                style={{
                  gridTemplateColumns: "50px repeat(7, minmax(96px, 1fr))",
                  borderColor: L.line,
                  backgroundColor: L.bg2,
                  color: L.muted,
                }}
              >
                <div className="px-1 py-2" />
                {weekDates.map((day) => (
                  <div
                    key={day}
                    className="border-l px-2 py-2 capitalize"
                    style={{
                      borderColor: L.line,
                      color:
                        day === toDateInputInTimeZone(new Date(), timeZone) ? L.primary : L.ink,
                    }}
                  >
                    {fmtDiaAgenda(day, timeZone)}
                  </div>
                ))}
              </div>

              <div
                className="grid"
                style={{ gridTemplateColumns: "50px repeat(7, minmax(96px, 1fr))" }}
              >
                <div
                  className="relative border-r"
                  style={{ height: agendaHeight, borderColor: L.line }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums"
                      style={{
                        top: (hour - AGENDA_START_HOUR) * AGENDA_HOUR_HEIGHT,
                        color: L.muted,
                      }}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {weekDates.map((day) => (
                  <div
                    key={day}
                    className="relative border-l"
                    style={{
                      height: agendaHeight,
                      borderColor: L.line,
                      backgroundColor: L.surface,
                    }}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t"
                        style={{
                          top: (hour - AGENDA_START_HOUR) * AGENDA_HOUR_HEIGHT,
                          borderColor: L.line,
                        }}
                      />
                    ))}

                    {(itemsByDay[day] ?? []).map((item) => (
                      <AgendaBlock
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        selected={item.kind === "booking" && expanded === item.id}
                        timeZone={timeZone}
                        onToggleBooking={onToggleBooking}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {totalItems === 0 && (
            <div
              className="border-t px-4 py-3 text-sm"
              style={{ borderColor: L.line, color: L.muted }}
            >
              No hay sesiones ni huecos publicados en esta semana.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaLegend({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5"
      style={{ borderColor: L.line, backgroundColor: bg, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function AgendaBlock({
  item,
  selected,
  timeZone,
  onToggleBooking,
}: {
  item: AgendaItem;
  selected: boolean;
  timeZone: string;
  onToggleBooking: (id: string, studentId: string) => void;
}) {
  const startMinutes = minutesOfDayInTimeZone(item.starts_at, timeZone);
  const endMinutes = minutesOfDayInTimeZone(item.ends_at, timeZone);
  const clampedStart = Math.max(AGENDA_START_HOUR * 60, startMinutes);
  const clampedEnd = Math.min(AGENDA_END_HOUR * 60, Math.max(endMinutes, startMinutes + 30));
  const top = ((clampedStart - AGENDA_START_HOUR * 60) / 60) * AGENDA_HOUR_HEIGHT + 2;
  const height = Math.max(26, ((clampedEnd - clampedStart) / 60) * AGENDA_HOUR_HEIGHT - 4);
  const style = getAgendaItemStyle(item);
  const timeLabel = `${fmtHora(item.starts_at, timeZone)}–${fmtHora(item.ends_at, timeZone)}`;
  const showMeta = height >= 38;
  const content = (
    <>
      <span className="block truncate text-[10px] font-semibold leading-tight tabular-nums">
        {timeLabel}
      </span>
      <span className="block truncate text-[11px] font-semibold leading-tight">{item.title}</span>
      {showMeta && (
        <span className="block truncate text-[10px] leading-tight opacity-80">{item.meta}</span>
      )}
    </>
  );
  const blockStyle: CSSProperties = {
    position: "absolute",
    top,
    left: 4,
    right: 4,
    height,
    backgroundColor: style.bg,
    borderColor: selected ? L.primary : style.border,
    color: style.color,
    boxShadow: selected ? "0 0 0 1px " + L.primary : "none",
  };

  if (item.kind === "booking") {
    return (
      <button
        type="button"
        className="session-press overflow-hidden rounded-md border px-1.5 py-0.5 text-left"
        style={blockStyle}
        aria-label={`${timeLabel}, ${item.title}, ${item.meta}`}
        onClick={() => onToggleBooking(item.id, item.booking.student_id)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border px-1.5 py-0.5" style={blockStyle}>
      {content}
    </div>
  );
}

function getAgendaItemStyle(item: AgendaItem) {
  if (item.kind === "slot") {
    return { bg: L.bg2, border: L.line, color: L.muted };
  }
  if (item.status === "confirmed") {
    return { bg: "#ECFDF5", border: "#10B981", color: "#166534" };
  }
  if (item.status === "pending_payment") {
    return { bg: "#FEF3C7", border: "#F59E0B", color: L.amberDeep };
  }
  if (item.status === "completed") {
    return { bg: "#EEF2FF", border: L.primary, color: L.primary };
  }
  if (item.status === "no_show") {
    return { bg: "#FFF1F2", border: "#FB7185", color: "#BE123C" };
  }
  return { bg: L.bg2, border: L.line, color: L.ink };
}

function BookingGroup({
  title,
  bookings,
  expanded,
  briefs,
  notes,
  noteDraft,
  savingNote,
  timeZone,
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
  timeZone: string;
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
          timeZone={timeZone}
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
  timeZone,
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
  timeZone: string;
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
                <span className="capitalize">{fmtCorto(b.slot_starts_at, timeZone)}</span>
                {b.slot_ends_at && (
                  <>
                    <Clock aria-hidden="true" className="ml-1 h-3 w-3 shrink-0" />
                    <span>hasta {fmtHora(b.slot_ends_at, timeZone)}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/clase/$bookingId"
              params={{ bookingId: b.id }}
              className="session-press inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: L.primary, color: L.primary }}
            >
              Abrir sala
            </Link>
            <button
              type="button"
              onClick={onToggle}
              className="session-press flex items-center gap-1 rounded-xl text-xs font-semibold hover:underline"
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
              <StudentBriefPanel brief={brief} timeZone={timeZone} />
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

function StudentBriefPanel({ brief, timeZone }: { brief: StudentBrief; timeZone: string }) {
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
                  timeZone={timeZone}
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
  timeZone,
  onToggle,
}: {
  ev: EvalCompleta;
  expanded: boolean;
  timeZone: string;
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
          <span style={{ color: L.muted }}>{fmtFecha(ev.created_at, timeZone)}</span>
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
  const summaryId = useId();
  const nextStepsId = useId();
  const visibleId = useId();

  return (
    <div className="space-y-3">
      <SectionLabel icon={null}>Notas post-sesión</SectionLabel>

      <div className="space-y-1.5">
        <Label htmlFor={summaryId} className="text-xs" style={{ color: L.ink }}>
          Resumen de la sesión
        </Label>
        <Textarea
          id={summaryId}
          name="booking-summary"
          rows={3}
          className="resize-none rounded-2xl text-sm"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
          placeholder="Ej.: tesis, criterio B y próximos ajustes…"
          value={draft.summary}
          onChange={(e) => onChange("summary", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={nextStepsId} className="text-xs" style={{ color: L.ink }}>
          Próximos pasos para el alumno
        </Label>
        <Textarea
          id={nextStepsId}
          name="booking-next-steps"
          rows={3}
          className="resize-none rounded-2xl text-sm"
          style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
          placeholder="Ej.: 1. Practica introducciones. 2. Añade citas breves…"
          value={draft.next_steps}
          onChange={(e) => onChange("next_steps", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={visibleId}
          checked={draft.visible}
          onChange={(e) => onChange("visible", e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor={visibleId} className="cursor-pointer text-xs" style={{ color: L.ink }}>
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
