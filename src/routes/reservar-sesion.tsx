import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  Clock,
  CheckCircle2,
  Loader2,
  User,
  AlertCircle,
  BookOpen,
  Sparkles,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/reservar-sesion")({
  head: () => ({
    meta: [{ title: "Sesión 1:1 — LIBerico" }],
  }),
  component: ReservarSesionPage,
});

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
  created_at: string;
  confirmed_at: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  teacher_nombre: string | null;
  teacher_estandarizador: boolean;
  note_summary: string | null;
  note_next_steps: string | null;
  meet_link: string | null;
  calendar_sync_status: string | null;
  calendar_sync_error: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function fmtCorto(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

type StatusCfg = {
  label: string;
  color: string;
  bg: string;
  Icon: React.ElementType | null;
  iconClass: string;
};

const STATUS_CONFIG: Record<string, StatusCfg> = {
  pending_payment: {
    label: "Pendiente de confirmación",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    Icon: AlertCircle,
    iconClass: "text-amber-600",
  },
  confirmed: {
    label: "Confirmada",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    Icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  completed: {
    label: "Completada",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    Icon: CheckCircle2,
    iconClass: "text-blue-600",
  },
  cancelled: {
    label: "Cancelada",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    Icon: null,
    iconClass: "",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

function ReservarSesionPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Student's existing bookings
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Booking form
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [teachers, setTeachers] = useState<Record<string, TeacherProfile>>({});
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [goal, setGoal] = useState("");
  const [consentHistory, setConsentHistory] = useState(false);
  const [consentPayment, setConsentPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  // Load student's own bookings
  const cargarMisReservas = useCallback(async () => {
    if (!user) return;
    setLoadingBookings(true);

    const reservaSelectConCalendar =
      "id, status, student_goal, created_at, confirmed_at, slot_id, teacher_id, meet_link, calendar_sync_status, calendar_sync_error, slot:booking_slots(starts_at, ends_at)";
    const reservaSelectBase =
      "id, status, student_goal, created_at, confirmed_at, slot_id, teacher_id, meet_link, slot:booking_slots(starts_at, ends_at)";

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
      toast.error("Error al cargar tus sesiones");
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
        created_at: b.created_at,
        confirmed_at: b.confirmed_at,
        slot_starts_at: slotRaw?.starts_at ?? null,
        slot_ends_at: slotRaw?.ends_at ?? null,
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
  }, [user]);

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
        toast.error("Error al cargar los horarios disponibles");
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
  }, [user, cargarMisReservas]);

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
          student_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          consent_history: consentHistory,
          consent_payment: consentPayment,
        },
      });

      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      if (data?.meet_link) {
        toast.success("Sesión reservada con enlace de Meet");
      } else if (data?.calendar_sync_status === "failed") {
        toast.warning("Sesión reservada, pero el enlace de Meet aún no se ha creado");
      } else {
        toast.success("Sesión reservada correctamente");
      }
      setSelectedSlot(null);
      setGoal("");
      setConsentHistory(false);
      setConsentPayment(false);
      void cargarMisReservas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) return null;

  const selectedTeacher = selectedSlot ? teachers[selectedSlot.teacher_id] : null;

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Sesión de calibración IB 1:1
          </h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-lg">
            75 minutos con una profesora con experiencia en estandarización IB. Revisa tu historial
            de calificaciones antes de la sesión para trabajar sobre tus patrones reales.
          </p>
        </div>

        {/* ── Mis sesiones ─────────────────────────────────────────────────── */}
        {(loadingBookings || myBookings.length > 0) && (
          <section className="space-y-3">
            <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Tus sesiones
            </h2>
            {loadingBookings ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            ) : (
              myBookings.map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </section>
        )}

        {/* ── Reservar nueva sesión ─────────────────────────────────────── */}
        {!loadingBookings && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Reservar sesión
              </h2>
            </div>

            {/* Propuesta de valor */}
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {[
                {
                  icon: <User className="h-4 w-4" />,
                  title: "Experta calibrada",
                  desc: "Criterios IB aplicados con experiencia real en estandarización.",
                },
                {
                  icon: <CalendarDays className="h-4 w-4" />,
                  title: "Preparación previa",
                  desc: "Revisa tu historial de bandas antes de la sesión.",
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  title: "75 minutos",
                  desc: "Diagnóstico, estrategia y próximos pasos concretos.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-muted/40 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    {item.icon}
                    {item.title}
                  </div>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Selector de slot */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Elige un horario</p>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando horarios…
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm py-3">
                  No hay horarios disponibles en este momento. Vuelve pronto.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {availableSlots.map((slot) => {
                    const t = teachers[slot.teacher_id];
                    const selected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(selected ? null : slot)}
                        className={`text-left rounded-lg border px-4 py-3 transition-all ${
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/40"
                        }`}
                      >
                        <div className="text-sm font-medium capitalize">
                          {fmtFecha(slot.starts_at)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmtHora(slot.starts_at)} – {fmtHora(slot.ends_at)} (hora Stockholm)
                        </div>
                        {t && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.nombre}
                            {t.es_estandarizador_ib && (
                              <span className="ml-1.5 text-primary font-medium">· exp. IB</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs font-semibold text-foreground mt-1.5">
                          {slot.price_sek} SEK + moms
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formulario */}
            {selectedSlot && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Completa tu solicitud</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtFecha(selectedSlot.starts_at)} · {fmtHora(selectedSlot.starts_at)} –{" "}
                    {fmtHora(selectedSlot.ends_at)}
                    {selectedTeacher && ` · con ${selectedTeacher.nombre}`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedTeacher && (
                    <div className="bg-muted/40 rounded-md px-4 py-3 text-sm space-y-0.5">
                      <div className="font-medium">
                        {selectedTeacher.nombre}
                        {selectedTeacher.es_estandarizador_ib && (
                          <span className="ml-2 text-xs text-primary font-medium">
                            Estandarizadora IB
                          </span>
                        )}
                      </div>
                      {selectedTeacher.credenciales && (
                        <div className="text-xs text-muted-foreground">
                          {selectedTeacher.credenciales}
                        </div>
                      )}
                      {selectedTeacher.bio && (
                        <div className="text-xs text-muted-foreground">{selectedTeacher.bio}</div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="goal">¿Cuál es tu objetivo para esta sesión?</Label>
                    <Textarea
                      id="goal"
                      placeholder="Ej: Quiero entender por qué mi criterio B baja siempre y cómo mejorar la estructura de mi análisis."
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{goal.length}/1000</p>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Consentimientos requeridos
                    </p>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent-history"
                        checked={consentHistory}
                        onCheckedChange={(v) => setConsentHistory(v === true)}
                      />
                      <Label
                        htmlFor="consent-history"
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        Autorizo a la profesora asignada a acceder a mi historial completo en
                        LIBerico: bandas A/B/C/D, notas IB, textos analizados, mis análisis escritos
                        y los comentarios de corrección. El acceso expira 7 días después de la
                        sesión.
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
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        Confirmo que soy mayor de 18 años o que soy el/la tutor/a legal del alumno y
                        realizo esta reserva en su nombre.
                      </Label>
                    </div>
                  </div>

                  {/* Resumen de precio */}
                  <div className="bg-muted/40 rounded-md px-4 py-3 text-sm space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Precio base</span>
                      <span>{selectedSlot.price_sek} SEK</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA (25% moms)</span>
                      <span>{Math.round(selectedSlot.price_sek * 0.25)} SEK</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total</span>
                      <span>
                        {selectedSlot.price_sek + Math.round(selectedSlot.price_sek * 0.25)} SEK
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    El pago se gestiona manualmente tras la confirmación. Recibirás instrucciones
                    por email.
                  </p>

                  <Button
                    className="w-full"
                    disabled={submitting || !consentHistory || !consentPayment}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Enviando…
                      </>
                    ) : (
                      "Solicitar sesión"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </div>
    </>
  );
}

// ── Booking status card ───────────────────────────────────────────────────────

function BookingCard({ booking: b }: { booking: MyBooking }) {
  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.cancelled;
  const isFuture = b.slot_starts_at ? new Date(b.slot_starts_at) > new Date() : false;
  const isConfirmed = b.status === "confirmed";
  const isPending = b.status === "pending_payment";
  const isCompleted = b.status === "completed";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cfg.bg}`}>
      {/* Status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {cfg.Icon && <cfg.Icon className={`h-5 w-5 ${cfg.iconClass}`} />}
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        {b.slot_starts_at && (
          <span className="text-xs text-muted-foreground">
            Solicitado el {fmtCorto(b.created_at)}
          </span>
        )}
      </div>

      {/* Date & teacher */}
      {b.slot_starts_at && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground capitalize">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            {fmtFecha(b.slot_starts_at)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5">
            <Clock className="h-3 w-3" />
            {fmtHora(b.slot_starts_at)} – {fmtHora(b.slot_ends_at ?? b.slot_starts_at)} (hora
            Stockholm)
          </div>
          {b.teacher_nombre && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5">
              <User className="h-3 w-3" />
              {b.teacher_nombre}
              {b.teacher_estandarizador && (
                <span className="text-primary font-medium">· exp. IB</span>
              )}
            </div>
          )}
          {b.meet_link && (
            <a
              href={b.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline pl-5"
            >
              <Video className="h-3 w-3" />
              Enlace de Google Meet
            </a>
          )}
          {!b.meet_link && b.status === "confirmed" && (
            <p className="pl-5 text-xs text-amber-700">
              {b.calendar_sync_status === "failed"
                ? "El enlace de Meet no se ha podido crear todavía."
                : "El enlace de Meet aparecerá aquí cuando se sincronice Calendar."}
            </p>
          )}
          {!b.meet_link && b.status === "confirmed" && b.calendar_sync_error && (
            <p className="pl-5 text-xs text-muted-foreground">
              Detalle técnico: {b.calendar_sync_error}
            </p>
          )}
        </div>
      )}

      {/* Pending message */}
      {isPending && (
        <p className="text-xs text-amber-800 bg-amber-100 rounded-md px-3 py-2 leading-relaxed">
          Hemos recibido tu solicitud. Te confirmaremos por email en menos de 24 horas.
        </p>
      )}

      {/* Confirmed + future: meet link + prep tips */}
      {isConfirmed && isFuture && (
        <div className="border-t border-green-200 pt-3 space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Cómo preparar tu sesión
            </p>
            <ul className="text-xs text-green-900 space-y-1 pl-1 list-disc list-inside">
              <li>Revisa tus últimas 2-3 correcciones en LIBerico</li>
              <li>Anota 2-3 dudas concretas que quieras resolver</li>
              <li>Si tienes algún texto pendiente, úsalo como punto de partida</li>
            </ul>
            {b.student_goal && (
              <p className="text-xs text-green-800 mt-1 pl-1">
                <span className="font-medium">Tu objetivo:</span> {b.student_goal}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Student goal (for past/completed) */}
      {!isFuture && b.student_goal && (isCompleted || (isConfirmed && !isFuture)) && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-current/20 pl-2">
          "{b.student_goal}"
        </p>
      )}

      {/* Teacher notes visible to student */}
      {(b.note_summary || b.note_next_steps) && (
        <div className="border-t border-current/10 pt-3 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Notas de tu profesora
          </p>
          {b.note_summary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Resumen</p>
              <p className="text-xs leading-relaxed">{b.note_summary}</p>
            </div>
          )}
          {b.note_next_steps && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Próximos pasos</p>
              <p className="text-xs leading-relaxed whitespace-pre-line">{b.note_next_steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
