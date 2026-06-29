import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, type ElementType, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  ArrowLeft,
  History,
  Loader2,
  User,
  AlertCircle,
  BookOpen,
  Sparkles,
  Ticket,
  Video,
} from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { formatTimeZoneLabel, getBrowserTimeZone } from "@/lib/timezone";

export const Route = createFileRoute("/reservar-sesion")({
  head: () => ({
    meta: [{ title: "1:1 session — LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ReservarSesionPage,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

const sekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const reservarRootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--ink": L.ink,
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

function ReservarScopedStyles() {
  return (
    <style>{`
      #reservar-root .lib-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
      #reservar-root .lib-press:active{transform:scale(0.98);}
      #reservar-root .lib-reveal{animation:reservarReveal 0.45s cubic-bezier(0.22,1,0.36,1) both;}
      #reservar-root a:focus-visible,#reservar-root button:focus-visible,#reservar-root textarea:focus-visible,#reservar-root select:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
      #reservar-root button:not([disabled]){cursor:pointer;}
      #reservar-root .booking-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
      #reservar-root .booking-soft{background:${L.bg2};border-color:${L.line};}
      @media (hover:hover) and (pointer:fine){
        #reservar-root .booking-hover:hover{transform:translateY(-2px);box-shadow:0 20px 36px -24px rgba(15,23,42,0.36),0 4px 10px -6px rgba(15,23,42,0.12);}
      }
      @media (prefers-reduced-motion: reduce){
        #reservar-root .lib-reveal{animation:none !important;}
        #reservar-root .lib-press,#reservar-root .booking-hover{transition:none !important;}
      }
      @keyframes reservarReveal{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
    `}</style>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type AvailableSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  price_sek: number;
  teacher_id: string;
};

type TeacherProfile = {
  user_id: string;
  nombre: string;
  bio: string | null;
  credenciales: string | null;
  es_estandarizador_ib: boolean;
};

type MyBooking = {
  id: string;
  status: string;
  student_goal: string | null;
  theory_focus_id: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  teacher_id: string | null;
  teacher_nombre: string | null;
  teacher_estandarizador: boolean;
  note_summary: string | null;
  note_next_steps: string | null;
  meet_link: string | null;
  calendar_sync_status: string | null;
  calendar_sync_error: string | null;
};

const getTheoryFocusOptions = (isEN: boolean): { value: string; label: string }[] => [
  {
    value: "",
    label: isEN ? "I'm not sure / don't unlock theory" : "No lo sé todavía / no desbloquear teoría",
  },
  { value: "poesia", label: isEN ? "Poetry" : "Poesía" },
  { value: "narratologia", label: isEN ? "Narratology" : "Narratología" },
  { value: "teatro", label: isEN ? "Drama" : "Teatro" },
  {
    value: "recursos",
    label: isEN ? "Literary resources in the IB exam" : "Recursos literarios en el examen IB",
  },
  {
    value: "vocabulario",
    label: isEN ? "Literary analysis vocabulary" : "Vocabulario de análisis literario",
  },
  { value: "movimientos", label: isEN ? "Literary movements" : "Movimientos literarios" },
  { value: "teoria-literaria", label: isEN ? "Literary theory" : "Teoría literaria" },
  { value: "topicos", label: isEN ? "Literary topics" : "Tópicos literarios" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string, isEN: boolean = false, timeZone: string = getBrowserTimeZone()) {
  return new Date(iso).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

function fmtHora(iso: string, isEN: boolean = false, timeZone: string = getBrowserTimeZone()) {
  return new Date(iso).toLocaleTimeString(isEN ? "en-GB" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function durationMinutes(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null;
  return Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000),
  );
}

function fmtSEK(value: number) {
  return sekFormatter.format(value);
}

function fmtCorto(iso: string, isEN: boolean = false, timeZone: string = getBrowserTimeZone()) {
  return new Date(iso).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "short",
    timeZone,
  });
}

function horasHasta(startsAt: string | null): number {
  if (!startsAt) return Infinity;
  return (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
}

async function invokeManageBooking(payload: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sesión expirada");
  const { data, error } = await supabase.functions.invoke("manage-booking", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: payload,
  });
  if (error || data?.error) throw new Error(data?.error ?? error?.message);
  return data;
}

type StatusCfg = {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: ElementType | null;
  iconColor: string;
};

const getStatusConfig = (isEN: boolean): Record<string, StatusCfg> => ({
  pending_payment: {
    label: isEN ? "Pending manual payment" : "Pendiente de pago manual",
    color: L.amberDeep,
    bg: "#FEF3C7",
    border: "#F59E0B",
    Icon: AlertCircle,
    iconColor: "#D97706",
  },
  confirmed: {
    label: isEN ? "Confirmed" : "Confirmada",
    color: L.ok,
    bg: "#ECFDF5",
    border: "#10B981",
    Icon: CheckCircle2,
    iconColor: L.ok,
  },
  completed: {
    label: isEN ? "Completed" : "Completada",
    color: L.primary,
    bg: "#EEF2FF",
    border: L.primary,
    Icon: CheckCircle2,
    iconColor: L.primary,
  },
  cancelled: {
    label: isEN ? "Cancelled" : "Cancelada",
    color: L.muted,
    bg: L.bg2,
    border: L.line,
    Icon: null,
    iconColor: L.muted,
  },
});

// ── Component ─────────────────────────────────────────────────────────────────

function ReservarSesionPage() {
  const { user, loading: authLoading, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const theoryFocusOptions = getTheoryFocusOptions(isEN);
  const studentTimeZone = getBrowserTimeZone();
  const studentTimeZoneLabel = formatTimeZoneLabel(studentTimeZone);

  // Student's existing bookings
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Booking form
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [teachers, setTeachers] = useState<Record<string, TeacherProfile>>({});
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [goal, setGoal] = useState("");
  const [theoryFocusId, setTheoryFocusId] = useState("");
  const [sessionFocus, setSessionFocus] = useState<"p1" | "p2" | "oral" | "">("");
  const [consentHistory, setConsentHistory] = useState(false);
  const [consentPayment, setConsentPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Session voucher
  const [valeActivo, setValeActivo] = useState(false);
  const [valeCount, setValeCount] = useState(0);
  const [valeExpira, setValeExpira] = useState<string | null>(null);
  const [usarVale, setUsarVale] = useState(false);

  // Manage (cancel/reschedule) modal state
  const [manage, setManage] = useState<
    | { booking: MyBooking; mode: "cancel" | "reschedule" }
    | null
  >(null);
  const [manageBusy, setManageBusy] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[] | null>(null);

  // Esc to close manage modal
  useEffect(() => {
    if (!manage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !manageBusy) setManage(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [manage, manageBusy]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("session_vouchers")
        .select("id, expires_at")
        .eq("student_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });
      if (error) {
        console.error("[reservar-sesion] Error loading voucher:", error);
        setValeActivo(false);
        setValeCount(0);
        setValeExpira(null);
        return;
      }
      const vales = data ?? [];
      setValeActivo(vales.length > 0);
      setValeCount(vales.length);
      setValeExpira(vales.length > 0 ? (vales[0].expires_at as string) : null);
    })();
  }, [user]);

  useEffect(() => {
    if (manage?.mode !== "reschedule") { setRescheduleSlots(null); return; }
    void (async () => {
      const { data, error } = await supabase
        .from("booking_slots")
        .select("id, starts_at, ends_at, price_sek, teacher_id")
        .eq("status", "available")
        .eq("teacher_id", manage.booking.teacher_id ?? "")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      if (error) {
        const msg = isEN
          ? "Error loading available slots"
          : "Error al cargar los huecos disponibles";
        toast.error(msg);
        setRescheduleSlots([]);
        return;
      }
      setRescheduleSlots((data ?? []) as AvailableSlot[]);
    })();
  }, [manage]);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Load student's own bookings
  const cargarMisReservas = useCallback(async () => {
    if (!user) return;
    setLoadingBookings(true);

    const reservaSelectConCalendar =
      "id, status, student_goal, theory_focus_id, created_at, confirmed_at, slot_id, teacher_id, meet_link, calendar_sync_status, calendar_sync_error, slot:booking_slots(starts_at, ends_at)";
    const reservaSelectBase =
      "id, status, student_goal, theory_focus_id, created_at, confirmed_at, slot_id, teacher_id, meet_link, slot:booking_slots(starts_at, ends_at)";

    const { data: bookingsRaw, error: bookingsError } = await supabase
      .from("bookings")
      .select(reservaSelectConCalendar)
      .eq("student_id", user.id)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });

    const bookingsData =
      bookingsError?.code === "42703"
        ? (
            await supabase
              .from("bookings")
              .select(reservaSelectBase)
              .eq("student_id", user.id)
              .not("status", "eq", "cancelled")
              .order("created_at", { ascending: false })
          ).data
        : bookingsRaw;

    if (bookingsError && bookingsError.code !== "42703") {
      toast.error(isEN ? "Error loading your sessions" : "Error al cargar tus sesiones");
      setLoadingBookings(false);
      return;
    }

    if (!bookingsData || bookingsData.length === 0) {
      setMyBookings([]);
      setLoadingBookings(false);
      return;
    }

    const teacherIds = [...new Set(bookingsData.map((b) => b.teacher_id as string))].filter(
      Boolean,
    );
    const bookingIds = bookingsData.map((b) => b.id);

    const [{ data: teacherProfiles }, { data: notesData }] = await Promise.all([
      teacherIds.length > 0
        ? supabase
            .from("teacher_profiles")
            .select("user_id, nombre, es_estandarizador_ib")
            .in("user_id", teacherIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("booking_notes")
        .select("booking_id, summary, next_steps")
        .in("booking_id", bookingIds)
        .eq("visible_to_student", true),
    ]);

    const teacherMap = Object.fromEntries((teacherProfiles ?? []).map((t) => [t.user_id, t]));
    const notesMap = Object.fromEntries((notesData ?? []).map((n) => [n.booking_id, n]));

    const mapped: MyBooking[] = bookingsData.map((b) => {
      const bookingConCalendar = b as typeof b & {
        calendar_sync_status?: string | null;
        calendar_sync_error?: string | null;
      };
      const slotRaw = Array.isArray(b.slot)
        ? b.slot[0]
        : (b.slot as { starts_at?: string; ends_at?: string } | null);
      const teacher = teacherMap[b.teacher_id as string];
      const note = notesMap[b.id];
      return {
        id: b.id,
        status: b.status,
        student_goal: b.student_goal,
        theory_focus_id:
          (b as typeof b & { theory_focus_id?: string | null }).theory_focus_id ?? null,
        created_at: b.created_at,
        confirmed_at: b.confirmed_at,
        slot_starts_at: slotRaw?.starts_at ?? null,
        slot_ends_at: slotRaw?.ends_at ?? null,
        teacher_id: (b.teacher_id as string | null) ?? null,
        teacher_nombre: teacher?.nombre ?? null,
        teacher_estandarizador: teacher?.es_estandarizador_ib ?? false,
        note_summary: note?.summary ?? null,
        note_next_steps: note?.next_steps ?? null,
        meet_link: (b.meet_link as string | null) ?? null,
        calendar_sync_status: bookingConCalendar.calendar_sync_status ?? null,
        calendar_sync_error: bookingConCalendar.calendar_sync_error ?? null,
      };
    });

    setMyBookings(mapped);
    setLoadingBookings(false);
  }, [user, isEN]);

  // Load available slots
  useEffect(() => {
    if (!user) return;
    void cargarMisReservas();
    void (async () => {
      const { data: slotsData, error } = await supabase
        .from("booking_slots")
        .select("id, starts_at, ends_at, price_sek, teacher_id")
        .eq("status", "available")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(30);

      if (error) {
        toast.error(
          isEN ? "Error loading available time slots" : "Error al cargar los horarios disponibles",
        );
        setLoadingSlots(false);
        return;
      }

      setAvailableSlots((slotsData ?? []) as AvailableSlot[]);

      const ids = [...new Set((slotsData ?? []).map((s) => s.teacher_id))];
      if (ids.length > 0) {
        const { data: td } = await supabase
          .from("teacher_profiles")
          .select("user_id, nombre, bio, credenciales, es_estandarizador_ib")
          .in("user_id", ids);
        const map: Record<string, TeacherProfile> = {};
        for (const t of td ?? []) map[t.user_id] = t as TeacherProfile;
        setTeachers(map);
      }
      setLoadingSlots(false);
    })();
  }, [user, cargarMisReservas, isEN]);

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión expirada");

      const { data, error } = await supabase.functions.invoke("create-booking", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          slot_id: selectedSlot.id,
          student_goal: goal,
          student_timezone: studentTimeZone,
          consent_history: consentHistory,
          consent_payment: consentPayment,
          theory_focus_id: theoryFocusId || undefined,
          session_focus: sessionFocus || undefined,
          usar_vale: usarVale || undefined,
        },
      });

      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      toast.success(
        isEN
          ? "Session confirmed. The teacher can already see it."
          : "Sesión confirmada. El profesor ya puede verla.",
      );
      setSelectedSlot(null);
      setGoal("");
      setTheoryFocusId("");
      setSessionFocus("");
      setConsentHistory(false);
      setConsentPayment(false);
      setUsarVale(false);
      void cargarMisReservas();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEN
            ? "Error creating booking"
            : "Error al crear la reserva",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) return null;

  const now = new Date();
  const upcomingBookings = myBookings.filter(
    (b) => !b.slot_starts_at || new Date(b.slot_starts_at) >= now,
  );
  const pastBookings = myBookings.filter(
    (b) => b.slot_starts_at !== null && new Date(b.slot_starts_at) < now,
  );

  const selectedTeacher = selectedSlot ? teachers[selectedSlot.teacher_id] : null;

  return (
    <div id="reservar-root" className="min-h-screen" style={reservarRootStyle}>
      <ReservarScopedStyles />
      <SiteHeader claro />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <Link
          to="/"
          className="lib-press inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold"
          style={{ color: L.primary }}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {isEN ? "Home" : "Inicio"}
        </Link>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="lib-reveal">
          <div
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ ...fontMono, color: L.primary }}
          >
            {isEN ? "1:1 tutoring" : "Tutoría 1:1"}
          </div>
          <h1 className="text-4xl font-semibold leading-tight" style={headingStyle}>
            {isEN ? "IB calibration session 1:1" : "Sesión de calibración IB 1:1"}
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed" style={{ color: L.muted }}>
            {isEN
              ? "A focused session with an experienced IB standardizer. Review your grading history before the session to work on your real patterns."
              : "Una sesión enfocada con una profesora con experiencia en estandarización IB. Revisa tu historial de calificaciones antes de la sesión para trabajar sobre tus patrones reales."}
          </p>
        </div>

        {/* ── Banner de vale activo ─────────────────────────────────────────── */}
        {valeActivo && (
          <div
            className="lib-reveal flex items-start gap-3 rounded-2xl border p-4"
            style={{ borderColor: L.ok, backgroundColor: L.bg2 }}
          >
            <Ticket aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: L.ok }} />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold" style={{ color: L.ink }}>
                {isEN
                  ? `You have ${valeCount} session voucher${valeCount === 1 ? "" : "s"}`
                  : `Tienes ${valeCount} vale${valeCount === 1 ? "" : "s"} de sesión`}
              </p>
              <p className="text-sm" style={{ color: L.muted }}>
                {isEN
                  ? "A free session — apply it when you pick a slot below."
                  : "Una sesión gratis — aplícalo al elegir un hueco abajo."}
                {valeExpira
                  ? isEN
                    ? ` Valid until ${fmtFecha(valeExpira, isEN, studentTimeZone)}.`
                    : ` Válido hasta el ${fmtFecha(valeExpira, isEN, studentTimeZone)}.`
                  : ""}
              </p>
            </div>
          </div>
        )}

        {/* ── Sesiones próximas ─────────────────────────────────────────────── */}
        {(loadingBookings || upcomingBookings.length > 0) && (
          <section className="space-y-3">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ ...fontMono, color: L.muted }}
            >
              {isEN ? "Your sessions" : "Tus sesiones"}
            </h2>
            {loadingBookings ? (
              <div className="flex items-center gap-2 py-2 text-sm" style={{ color: L.muted }}>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {isEN ? "Loading…" : "Cargando…"}
              </div>
            ) : (
              upcomingBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isEN={isEN}
                  timeZone={studentTimeZone}
                  timeZoneLabel={studentTimeZoneLabel}
                  onCancel={(bk) => setManage({ booking: bk, mode: "cancel" })}
                  onReschedule={(bk) => setManage({ booking: bk, mode: "reschedule" })}
                />
              ))
            )}
          </section>
        )}

        {/* ── Historial de tutorías ─────────────────────────────────────────── */}
        {!loadingBookings && pastBookings.length > 0 && (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="lib-press flex w-full items-center gap-2 rounded-xl transition-colors"
              style={{ color: L.muted }}
            >
              <History aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="font-medium uppercase tracking-wide text-xs">
                {isEN ? "Past sessions" : "Tutorías anteriores"}
              </span>
              <span className="text-xs tabular-nums" style={{ color: L.muted }}>
                ({pastBookings.length})
              </span>
              {showHistory ? (
                <ChevronUp aria-hidden="true" className="ml-auto h-3.5 w-3.5" />
              ) : (
                <ChevronDown aria-hidden="true" className="ml-auto h-3.5 w-3.5" />
              )}
            </button>
            {showHistory && (
              <div className="space-y-3">
                {pastBookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    isEN={isEN}
                    timeZone={studentTimeZone}
                    timeZoneLabel={studentTimeZoneLabel}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Reservar nueva sesión ─────────────────────────────────────── */}
        {!loadingBookings && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ ...fontMono, color: L.muted }}
              >
                {isEN ? "Book session" : "Reservar sesión"}
              </h2>
            </div>

            {/* Propuesta de valor */}
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              {(isEN
                ? [
                    {
                      icon: <User aria-hidden="true" className="h-4 w-4" />,
                      title: "Calibrated expert",
                      desc: "IB criteria applied with real standardization experience.",
                    },
                    {
                      icon: <CalendarDays aria-hidden="true" className="h-4 w-4" />,
                      title: "Prior preparation",
                      desc: "Review your band history before the session.",
                    },
                    {
                      icon: <Clock aria-hidden="true" className="h-4 w-4" />,
                      title: "Flexible duration",
                      desc: "Diagnosis, strategy, and concrete next steps in the selected slot.",
                    },
                  ]
                : [
                    {
                      icon: <User aria-hidden="true" className="h-4 w-4" />,
                      title: "Experta calibrada",
                      desc: "Criterios IB aplicados con experiencia real en estandarización.",
                    },
                    {
                      icon: <CalendarDays aria-hidden="true" className="h-4 w-4" />,
                      title: "Preparación previa",
                      desc: "Revisa tu historial de bandas antes de la sesión.",
                    },
                    {
                      icon: <Clock aria-hidden="true" className="h-4 w-4" />,
                      title: "Duración flexible",
                      desc: "Diagnóstico, estrategia y próximos pasos dentro del horario elegido.",
                    },
                  ]
              ).map((item) => (
                <div key={item.title} className="booking-soft space-y-1 rounded-2xl border p-3">
                  <div className="flex items-center gap-1.5 font-semibold" style={{ color: L.ink }}>
                    <span style={{ color: L.primary }}>{item.icon}</span>
                    {item.title}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: L.muted }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Selector de slot */}
            <div className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: L.ink }}>
                {isEN ? "Choose a time slot" : "Elige un horario"}
              </p>
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-3 text-sm" style={{ color: L.muted }}>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  {isEN ? "Loading time slots…" : "Cargando horarios…"}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="py-3 text-sm" style={{ color: L.muted }}>
                  {isEN
                    ? "No time slots available right now. Come back soon."
                    : "No hay horarios disponibles en este momento. Vuelve pronto."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableSlots.map((slot) => {
                    const t = teachers[slot.teacher_id];
                    const selected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => setSelectedSlot(selected ? null : slot)}
                        className="lib-press booking-hover rounded-2xl border px-4 py-3 text-left"
                        style={{
                          backgroundColor: selected ? L.primary + "10" : L.surface,
                          borderColor: selected ? L.primary : L.line,
                          boxShadow: selected ? "0 0 0 1px " + L.primary : "none",
                        }}
                      >
                        <div className="text-sm font-semibold capitalize" style={{ color: L.ink }}>
                          {fmtFecha(slot.starts_at, isEN, studentTimeZone)}
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: L.muted }}>
                          {fmtHora(slot.starts_at, isEN, studentTimeZone)} –{" "}
                          {fmtHora(slot.ends_at, isEN, studentTimeZone)} ·{" "}
                          {durationMinutes(slot.starts_at, slot.ends_at)} min ·{" "}
                          {isEN ? "local time" : "hora local"} ({studentTimeZoneLabel})
                        </div>
                        {t && (
                          <div className="mt-1 text-xs" style={{ color: L.muted }}>
                            {t.nombre}
                            {t.es_estandarizador_ib && (
                              <span className="ml-1.5 font-semibold" style={{ color: L.primary }}>
                                · IB exp.
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-1.5 text-xs font-semibold" style={{ color: L.ink }}>
                          {fmtSEK(slot.price_sek)} + {isEN ? "VAT" : "moms"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formulario */}
            {selectedSlot && (
              <Card className="booking-card rounded-2xl border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base" style={headingStyle}>
                    {isEN ? "Complete your request" : "Completa tu solicitud"}
                  </CardTitle>
                  <p className="mt-0.5 text-xs" style={{ color: L.muted }}>
                    {fmtFecha(selectedSlot.starts_at, isEN, studentTimeZone)} ·{" "}
                    {fmtHora(selectedSlot.starts_at, isEN, studentTimeZone)} –{" "}
                    {fmtHora(selectedSlot.ends_at, isEN, studentTimeZone)} ·{" "}
                    {durationMinutes(selectedSlot.starts_at, selectedSlot.ends_at)} min ·{" "}
                    {isEN ? "local time" : "hora local"} ({studentTimeZoneLabel})
                    {selectedTeacher &&
                      (isEN
                        ? ` · with ${selectedTeacher.nombre}`
                        : ` · con ${selectedTeacher.nombre}`)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedTeacher && (
                    <div className="booking-soft space-y-0.5 rounded-2xl border px-4 py-3 text-sm">
                      <div className="font-semibold" style={{ color: L.ink }}>
                        {selectedTeacher.nombre}
                        {selectedTeacher.es_estandarizador_ib && (
                          <span className="ml-2 text-xs font-semibold" style={{ color: L.primary }}>
                            Estandarizadora IB
                          </span>
                        )}
                      </div>
                      {selectedTeacher.credenciales && (
                        <div className="text-xs" style={{ color: L.muted }}>
                          {selectedTeacher.credenciales}
                        </div>
                      )}
                      {selectedTeacher.bio && (
                        <div className="text-xs" style={{ color: L.muted }}>
                          {selectedTeacher.bio}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="goal" style={{ color: L.ink }}>
                      {isEN
                        ? "What is your goal for this session?"
                        : "¿Cuál es tu objetivo para esta sesión?"}
                    </Label>
                    <Textarea
                      id="goal"
                      placeholder={
                        isEN
                          ? "E.g.: I want to understand why my criterion B always drops and how to improve the structure of my analysis."
                          : "Ej: Quiero entender por qué mi criterio B baja siempre y cómo mejorar la estructura de mi análisis."
                      }
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="min-h-28 resize-none rounded-2xl"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    />
                    <p className="text-right text-xs" style={{ color: L.muted }}>
                      {goal.length}/1000
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label style={{ color: L.ink }}>
                      {isEN ? "What is this session about?" : "¿Sobre qué es esta sesión?"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: "p1", label: isEN ? "Paper 1" : "Prueba 1" },
                        { value: "p2", label: isEN ? "Paper 2" : "Prueba 2" },
                        { value: "oral", label: isEN ? "Individual Oral" : "Oral Individual" },
                      ] as const).map((opt) => {
                        const selected = sessionFocus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setSessionFocus(selected ? "" : opt.value)}
                            className="lib-press min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold"
                            style={{
                              backgroundColor: selected ? L.primary + "12" : L.surface,
                              borderColor: selected ? L.primary : L.line,
                              color: selected ? L.primary : L.ink,
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs" style={{ color: L.muted }}>
                      {isEN
                        ? "Helps your teacher prepare and show your work for that paper first."
                        : "Ayuda a tu profesora a preparar la clase y ver primero tu trabajo de esa prueba."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="theory-focus" style={{ color: L.ink }}>
                      {isEN
                        ? "What do you want to work on in the session?"
                        : "¿Qué quieres trabajar en la sesión?"}
                    </Label>
                    <select
                      id="theory-focus"
                      value={theoryFocusId}
                      onChange={(e) => setTheoryFocusId(e.target.value)}
                      className="w-full rounded-2xl border px-3 py-2 text-sm"
                      style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                    >
                      {theoryFocusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {theoryFocusId && (
                      <p className="text-xs" style={{ color: L.muted }}>
                        {isEN
                          ? "When you confirm the session, the matching theory card is unlocked in /teoria."
                          : "Al confirmar la sesión se desbloquea la ficha de teoría correspondiente en /teoria."}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-4" style={{ borderColor: L.line }}>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ ...fontMono, color: L.muted }}
                    >
                      {isEN ? "Required consents" : "Consentimientos requeridos"}
                    </p>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent-history"
                        checked={consentHistory}
                        onCheckedChange={(v) => setConsentHistory(v === true)}
                      />
                      <Label
                        htmlFor="consent-history"
                        className="cursor-pointer text-sm leading-relaxed"
                        style={{ color: L.ink }}
                      >
                        {isEN
                          ? "I authorize the assigned teacher to access my complete LIBerico history: bands A/B/C/D, IB notes, analyzed texts, my written analyses, and correction comments. Access expires 7 days after the session."
                          : "Autorizo a la profesora asignada a acceder a mi historial completo en LIBerico: bandas A/B/C/D, notas IB, textos analizados, mis análisis escritos y los comentarios de corrección. El acceso expira 7 días después de la sesión."}
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent-payment"
                        checked={consentPayment}
                        onCheckedChange={(v) => setConsentPayment(v === true)}
                      />
                      <Label
                        htmlFor="consent-payment"
                        className="cursor-pointer text-sm leading-relaxed"
                        style={{ color: L.ink }}
                      >
                        {isEN
                          ? "I confirm that I am over 18 years old or that I am the legal guardian of the student and am making this reservation on their behalf."
                          : "Confirmo que soy mayor de 18 años o que soy el/la tutor/a legal del alumno y realizo esta reserva en su nombre."}
                      </Label>
                    </div>
                  </div>

                  {/* Resumen de precio */}
                  <div className="booking-soft space-y-1 rounded-2xl border px-4 py-3 text-sm">
                    <div className="flex justify-between" style={{ color: L.muted }}>
                      <span>{isEN ? "Base price" : "Precio base"}</span>
                      <span>{selectedSlot.price_sek} SEK</span>
                    </div>
                    <div className="flex justify-between" style={{ color: L.muted }}>
                      <span>{isEN ? "VAT (25%)" : "IVA (25% moms)"}</span>
                      <span>{Math.round(selectedSlot.price_sek * 0.25)} SEK</span>
                    </div>
                    <div
                      className="mt-1 flex justify-between border-t pt-1 font-semibold"
                      style={{ borderColor: L.line, color: usarVale ? L.ok : L.ink }}
                    >
                      <span>{isEN ? "Total" : "Total"}</span>
                      <span>
                        {usarVale
                          ? isEN
                            ? "Free (voucher)"
                            : "Gratis (vale)"
                          : `${selectedSlot.price_sek + Math.round(selectedSlot.price_sek * 0.25)} SEK`}
                      </span>
                    </div>
                  </div>

                  {valeActivo && (
                    <label
                      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer"
                      style={{ borderColor: L.primary, color: L.ink }}
                    >
                      <Checkbox
                        checked={usarVale}
                        onCheckedChange={(v) => setUsarVale(v === true)}
                      />
                      {isEN ? "Use my session voucher (free)" : "Usar mi vale de sesión (gratis)"}
                    </label>
                  )}

                  {usarVale ? (
                    <p className="text-xs" style={{ color: L.ok }}>
                      {isEN
                        ? "This session is covered by your voucher — no payment required."
                        : "Esta sesión está cubierta por tu vale — no se requiere pago."}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: L.muted }}>
                      {isEN
                        ? "Payment is handled manually after booking. The session is confirmed when you accept this slot."
                        : "El pago se gestiona manualmente después de reservar. La sesión queda confirmada al aceptar este horario."}
                    </p>
                  )}

                  <Button
                    type="button"
                    className="lib-press w-full rounded-2xl"
                    style={ctaPrimary}
                    disabled={submitting || !consentHistory || !consentPayment}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                        {isEN ? "Sending…" : "Enviando…"}
                      </>
                    ) : isEN ? (
                      "Confirm session"
                    ) : (
                      "Confirmar sesión"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </main>

      {/* ── Cancel modal ─────────────────────────────────────────────── */}
      {manage?.mode === "cancel" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.45)" }}
          onClick={() => !manageBusy && setManage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={isEN ? "Cancel session" : "Cancelar sesión"}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5"
            style={{ backgroundColor: L.surface, borderColor: L.line }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold" style={{ color: L.ink }}>
              {isEN ? "Cancel session" : "Cancelar sesión"}
            </h3>
            <p className="mt-1 text-sm" style={{ color: L.muted }}>
              {isEN
                ? "You're cancelling with 100% refund. Choose how:"
                : "Cancelas con reembolso del 100%. Elige cómo:"}
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={manageBusy}
                onClick={async () => {
                  setManageBusy(true);
                  try {
                    await invokeManageBooking({
                      booking_id: manage.booking.id,
                      action: "cancel",
                      refund: "voucher",
                    });
                    toast.success(
                      isEN ? "Cancelled. Voucher issued." : "Cancelada. Vale emitido.",
                    );
                    setManage(null);
                    void cargarMisReservas();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Error");
                  } finally {
                    setManageBusy(false);
                  }
                }}
                className="lib-press rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-40"
                style={{ borderColor: L.primary, color: L.ink }}
              >
                {isEN ? "Session voucher (instant)" : "Vale de sesión (inmediato)"}
              </button>
              <button
                type="button"
                disabled={manageBusy}
                onClick={async () => {
                  setManageBusy(true);
                  try {
                    await invokeManageBooking({
                      booking_id: manage.booking.id,
                      action: "cancel",
                      refund: "money",
                    });
                    toast.success(
                      isEN
                        ? "Cancelled. Money refund requested."
                        : "Cancelada. Reembolso solicitado.",
                    );
                    setManage(null);
                    void cargarMisReservas();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Error");
                  } finally {
                    setManageBusy(false);
                  }
                }}
                className="lib-press rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-40"
                style={{ borderColor: L.line, color: L.ink }}
              >
                {isEN ? "Money refund (manual, slower)" : "Devolución de dinero (manual, tarda)"}
              </button>
            </div>
            <button
              type="button"
              disabled={manageBusy}
              onClick={() => setManage(null)}
              className="mt-3 text-xs disabled:opacity-40"
              style={{ color: L.muted }}
            >
              {isEN ? "Keep my session" : "Mantener mi sesión"}
            </button>
          </div>
        </div>
      )}

      {/* ── Reschedule modal ─────────────────────────────────────────── */}
      {manage?.mode === "reschedule" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.45)" }}
          onClick={() => !manageBusy && setManage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={isEN ? "Reschedule session" : "Reprogramar sesión"}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5"
            style={{ backgroundColor: L.surface, borderColor: L.line }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold" style={{ color: L.ink }}>
              {isEN ? "Reschedule" : "Reprogramar"}
            </h3>
            {rescheduleSlots === null ? (
              <p className="mt-2 text-sm" style={{ color: L.muted }}>
                {isEN ? "Loading…" : "Cargando…"}
              </p>
            ) : rescheduleSlots.length === 0 ? (
              <div className="mt-2 space-y-3">
                <p className="text-sm" style={{ color: L.muted }}>
                  {isEN
                    ? "No free slots right now. Get a voucher for a future session?"
                    : "No hay huecos libres ahora. ¿Quieres un vale para una sesión futura?"}
                </p>
                <button
                  type="button"
                  disabled={manageBusy}
                  onClick={async () => {
                    setManageBusy(true);
                    try {
                      await invokeManageBooking({
                        booking_id: manage.booking.id,
                        action: "reschedule",
                        force_voucher_no_slot: true,
                      });
                      toast.success(isEN ? "Voucher issued." : "Vale emitido.");
                      setManage(null);
                      void cargarMisReservas();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Error");
                    } finally {
                      setManageBusy(false);
                    }
                  }}
                  className="lib-press rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: L.primary, color: "#fff" }}
                >
                  {isEN ? "Get voucher" : "Conseguir vale"}
                </button>
              </div>
            ) : (
              <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto">
                {rescheduleSlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={manageBusy}
                    onClick={async () => {
                      setManageBusy(true);
                      try {
                        await invokeManageBooking({
                          booking_id: manage.booking.id,
                          action: "reschedule",
                          new_slot_id: s.id,
                        });
                        toast.success(isEN ? "Rescheduled." : "Reprogramada.");
                        setManage(null);
                        void cargarMisReservas();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Error");
                      } finally {
                        setManageBusy(false);
                      }
                    }}
                    className="lib-press rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-40"
                    style={{ borderColor: L.line, color: L.ink }}
                  >
                    {fmtFecha(s.starts_at, isEN, studentTimeZone)} ·{" "}
                    {fmtHora(s.starts_at, isEN, studentTimeZone)}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={manageBusy}
              onClick={() => setManage(null)}
              className="mt-3 text-xs disabled:opacity-40"
              style={{ color: L.muted }}
            >
              {isEN ? "Close" : "Cerrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Booking status card ───────────────────────────────────────────────────────

function BookingCard({
  booking: b,
  isEN,
  timeZone,
  timeZoneLabel,
  onCancel,
  onReschedule,
}: {
  booking: MyBooking;
  isEN: boolean;
  timeZone: string;
  timeZoneLabel: string;
  onCancel?: (b: MyBooking) => void;
  onReschedule?: (b: MyBooking) => void;
}) {
  const theoryFocusOptions = getTheoryFocusOptions(isEN);
  const statusConfig = getStatusConfig(isEN);
  const cfg = (statusConfig as Record<string, StatusCfg>)[b.status] ?? statusConfig.cancelled;
  const isFuture = b.slot_starts_at ? new Date(b.slot_starts_at) > new Date() : false;
  const isConfirmed = b.status === "confirmed";
  const isPending = b.status === "pending_payment";
  const isCompleted = b.status === "completed";
  const horasHastaSlot = horasHasta(b.slot_starts_at);

  return (
    <div
      className="booking-hover space-y-3 rounded-2xl border p-4"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border, boxShadow: cardShadow }}
    >
      {/* Status row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {cfg.Icon && (
            <cfg.Icon aria-hidden="true" className="h-5 w-5" style={{ color: cfg.iconColor }} />
          )}
          <span className="text-sm font-semibold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        {b.slot_starts_at && (
          <span className="text-xs" style={{ color: L.muted }}>
            {isEN ? "Requested on" : "Solicitado el"} {fmtCorto(b.created_at ?? "", isEN, timeZone)}
          </span>
        )}
      </div>

      {/* Date & teacher */}
      {b.slot_starts_at && (
        <div className="space-y-0.5">
          <div
            className="flex items-center gap-1.5 text-sm font-semibold capitalize"
            style={{ color: L.ink }}
          >
            <CalendarDays
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
              style={{ color: L.muted }}
            />
            {fmtFecha(b.slot_starts_at, isEN, timeZone)}
          </div>
          <div className="flex items-center gap-1.5 pl-5 text-xs" style={{ color: L.muted }}>
            <Clock aria-hidden="true" className="h-3 w-3" />
            {fmtHora(b.slot_starts_at, isEN, timeZone)} –{" "}
            {fmtHora(b.slot_ends_at ?? b.slot_starts_at, isEN, timeZone)} ·{" "}
            {durationMinutes(b.slot_starts_at, b.slot_ends_at) ?? 75} min ·{" "}
            {isEN ? "local time" : "hora local"} ({timeZoneLabel})
          </div>
          {b.teacher_nombre && (
            <div className="flex items-center gap-1.5 pl-5 text-xs" style={{ color: L.muted }}>
              <User aria-hidden="true" className="h-3 w-3" />
              {b.teacher_nombre}
              {b.teacher_estandarizador && (
                <span className="font-semibold" style={{ color: L.primary }}>
                  · {isEN ? "IB exp." : "exp. IB"}
                </span>
              )}
            </div>
          )}
          {b.meet_link && (
            <a
              href={b.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 pl-5 text-xs font-semibold hover:underline"
              style={{ color: L.primary }}
            >
              <Video aria-hidden="true" className="h-3 w-3" />
              {isEN ? "Google Meet link" : "Enlace de Google Meet"}
            </a>
          )}
          {!b.meet_link && b.status === "confirmed" && (
            <p className="pl-5 text-xs" style={{ color: L.amberDeep }}>
              {b.calendar_sync_status === "failed"
                ? isEN
                  ? "Meet link could not be created yet."
                  : "El enlace de Meet no se ha podido crear todavía."
                : isEN
                  ? "Meet link will appear here when Calendar syncs."
                  : "El enlace de Meet aparecerá aquí cuando se sincronice Calendar."}
            </p>
          )}
          {!b.meet_link && b.status === "confirmed" && b.calendar_sync_error && (
            <p className="pl-5 text-xs" style={{ color: L.muted }}>
              {isEN ? "Technical detail: " : "Detalle técnico: "}
              {b.calendar_sync_error}
            </p>
          )}
        </div>
      )}

      {/* Pending message */}
      {isPending && (
        <p
          className="rounded-xl px-3 py-2 text-xs leading-relaxed"
          style={{ backgroundColor: "#FEF3C7", color: L.amberDeep }}
        >
          {isEN
            ? "Your session is reserved. Manual payment instructions will arrive separately."
            : "Tu sesión está reservada. Las instrucciones de pago manual llegarán por separado."}
        </p>
      )}

      {/* Confirmed + future: meet link + prep tips */}
      {isConfirmed && isFuture && (
        <div className="space-y-3 border-t pt-3" style={{ borderColor: L.line }}>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: L.ok }}>
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              {isEN ? "How to prepare your session" : "Cómo preparar tu sesión"}
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1 text-xs" style={{ color: L.ink }}>
              {(isEN
                ? [
                    "Review your last 2-3 corrections in LIBerico",
                    "Write down 2-3 specific questions you want to resolve",
                    "If you have any pending text, use it as a starting point",
                  ]
                : [
                    "Revisa tus últimas 2-3 correcciones en LIBerico",
                    "Anota 2-3 dudas concretas que quieras resolver",
                    "Si tienes algún texto pendiente, úsalo como punto de partida",
                  ]
              ).map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
            {b.student_goal && (
              <p className="mt-1 pl-1 text-xs" style={{ color: L.ok }}>
                <span className="font-semibold">{isEN ? "Your goal: " : "Tu objetivo:"}</span>{" "}
                {b.student_goal}
              </p>
            )}
          </div>
          {/* Cancel / Reschedule action row */}
          {(onCancel || onReschedule) && (
            <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: L.line }}>
              {onReschedule && (
                <button
                  type="button"
                  disabled={horasHastaSlot < 24}
                  onClick={() => onReschedule(b)}
                  title={
                    horasHastaSlot < 24
                      ? isEN
                        ? "Only up to 24h before"
                        : "Solo hasta 24h antes"
                      : undefined
                  }
                  className="lib-press rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  style={{ borderColor: L.line, color: L.ink }}
                >
                  {isEN ? "Reschedule" : "Reprogramar"}
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  disabled={horasHastaSlot < 48}
                  onClick={() => onCancel(b)}
                  title={
                    horasHastaSlot < 48
                      ? isEN
                        ? "Only up to 48h before"
                        : "Solo hasta 48h antes"
                      : undefined
                  }
                  className="lib-press rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  style={{ borderColor: "#FB7185", color: "#BE123C" }}
                >
                  {isEN ? "Cancel" : "Cancelar"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Entry link to the class room */}
      {(b.status === "confirmed" || b.status === "pending_payment") && (
        <Link
          to="/clase/$bookingId"
          params={{ bookingId: b.id }}
          className="lib-press inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: L.primary, color: "#fff" }}
        >
          {isEN ? "Enter the class" : "Entrar a la clase"}
        </Link>
      )}

      {/* Student goal (for past/completed) */}
      {!isFuture && b.student_goal && (isCompleted || (isConfirmed && !isFuture)) && (
        <p
          className="border-l-2 pl-2 text-xs italic"
          style={{ borderColor: L.line, color: L.muted }}
        >
          "{b.student_goal}"
        </p>
      )}

      {/* Theory focus */}
      {b.theory_focus_id && (
        <p className="text-xs" style={{ color: L.muted }}>
          <span className="font-semibold" style={{ color: L.ink }}>
            {isEN ? "Theory focus: " : "Foco de teoría: "}
          </span>
          {theoryFocusOptions.find((o) => o.value === b.theory_focus_id)?.label ??
            b.theory_focus_id}
          {b.status === "confirmed" && (
            <span className="ml-1 font-semibold" style={{ color: L.primary }}>
              · {isEN ? "unlocked" : "desbloqueado"}
            </span>
          )}
        </p>
      )}

      {/* Teacher notes visible to student */}
      {(b.note_summary || b.note_next_steps) && (
        <div className="space-y-2 border-t pt-3" style={{ borderColor: L.line }}>
          <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: L.ink }}>
            <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
            {isEN ? "Your teacher's notes" : "Notas de tu profesora"}
          </p>
          {b.note_summary && (
            <div>
              <p className="mb-0.5 text-xs font-semibold" style={{ color: L.muted }}>
                {isEN ? "Summary" : "Resumen"}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: L.ink }}>
                {b.note_summary}
              </p>
            </div>
          )}
          {b.note_next_steps && (
            <div>
              <p className="mb-0.5 text-xs font-semibold" style={{ color: L.muted }}>
                {isEN ? "Next steps" : "Próximos pasos"}
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed" style={{ color: L.ink }}>
                {b.note_next_steps}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
