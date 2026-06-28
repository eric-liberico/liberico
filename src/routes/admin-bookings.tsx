import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  Clock,
  CalendarDays,
  Video,
  CheckCircle2,
  Trash2,
  CreditCard,
} from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/admin-bookings")({
  head: () => ({
    meta: [{ title: "Reservas — Admin LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: AdminBookingsPage,
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

const scopedCss = `
  #admin-bookings-root .admin-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
  #admin-bookings-root .admin-soft{background:${L.bg2};border-color:${L.line};}
  #admin-bookings-root .admin-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
  #admin-bookings-root .admin-press:active{transform:scale(0.985);}
  #admin-bookings-root a:focus-visible,#admin-bookings-root button:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #admin-bookings-root button:not([disabled]){cursor:pointer;}
  @media (hover:hover) and (pointer:fine){
    #admin-bookings-root .admin-hover:hover{transform:translateY(-1px);border-color:${L.primary};box-shadow:0 20px 38px -28px rgba(15,23,42,0.42),0 4px 10px -6px rgba(15,23,42,0.12);}
  }
  @media (prefers-reduced-motion: reduce){
    #admin-bookings-root .admin-press,#admin-bookings-root .admin-hover{transition:none !important;}
  }
`;

type RefundRequest = {
  id: string;
  student_id: string;
  booking_id: string;
  amount_sek: number | null;
  status: string;
  created_at: string | null;
  student_email: string;
};

type Booking = {
  id: string;
  status: string;
  student_goal: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  price_sek: number | null;
  vat_sek: number | null;
  total_sek: number | null;
  student_email: string;
  teacher_email: string;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
  meet_link: string | null;
  calendar_sync_status: string | null;
  calendar_sync_error: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No presentado",
};
const STATUS_STYLE: Record<string, CSSProperties> = {
  pending_payment: {
    color: L.amberDeep,
    backgroundColor: "rgba(232,161,58,0.12)",
    borderColor: "rgba(154,94,16,0.22)",
  },
  confirmed: {
    color: L.ok,
    backgroundColor: "rgba(21,128,61,0.1)",
    borderColor: "rgba(21,128,61,0.2)",
  },
  cancelled: { color: L.muted, backgroundColor: L.bg2, borderColor: L.line },
  completed: {
    color: L.primary,
    backgroundColor: "rgba(79,70,229,0.1)",
    borderColor: "rgba(79,70,229,0.18)",
  },
  no_show: {
    color: "#B91C1C",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderColor: "rgba(185,28,28,0.18)",
  },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function AdminBookingsPage() {
  const { user, rol, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || rol !== "admin")) navigate({ to: "/" });
  }, [user, rol, authLoading, navigate]);

  const cargar = useCallback(async () => {
    setLoading(true);

    const selectConCalendar = `id, status, student_goal, created_at, confirmed_at,
         price_sek, vat_sek, total_sek, student_id, teacher_id, meet_link,
         calendar_sync_status, calendar_sync_error,
         slot:booking_slots(starts_at, ends_at)`;
    const selectBase = `id, status, student_goal, created_at, confirmed_at,
         price_sek, vat_sek, total_sek, student_id, teacher_id, meet_link,
         slot:booking_slots(starts_at, ends_at)`;

    // Step 1: load bookings + slot (bookings → booking_slots FK exists)
    const { data: rawBookings, error } = await supabase
      .from("bookings")
      .select(selectConCalendar)
      .order("created_at", { ascending: false })
      .limit(100);

    const bookingsData =
      error?.code === "42703"
        ? (
            await supabase
              .from("bookings")
              .select(selectBase)
              .order("created_at", { ascending: false })
              .limit(100)
          ).data
        : rawBookings;

    if (error && error.code !== "42703") {
      toast.error("Error al cargar reservas");
      setLoading(false);
      return;
    }

    // Step 2: fetch emails from perfiles for all involved user_ids
    const userIds = [
      ...new Set([
        ...(bookingsData ?? []).map((b) => b.student_id as string),
        ...(bookingsData ?? []).map((b) => b.teacher_id as string),
      ]),
    ].filter(Boolean);

    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("user_id, email")
        .in("user_id", userIds);
      for (const p of perfiles ?? []) {
        if (p.user_id && p.email) emailMap[p.user_id] = p.email;
      }
    }

    const mapped: Booking[] = (bookingsData ?? []).map((b) => {
      const bookingConCalendar = b as typeof b & {
        calendar_sync_status?: string | null;
        calendar_sync_error?: string | null;
      };
      const slot = Array.isArray(b.slot)
        ? b.slot[0]
        : (b.slot as { starts_at?: string; ends_at?: string } | null);
      return {
        id: b.id,
        status: b.status,
        student_goal: b.student_goal,
        created_at: b.created_at,
        confirmed_at: b.confirmed_at,
        price_sek: b.price_sek,
        vat_sek: b.vat_sek,
        total_sek: b.total_sek,
        student_email: emailMap[b.student_id as string] ?? "—",
        teacher_email: emailMap[b.teacher_id as string] ?? "—",
        slot_starts_at: slot?.starts_at ?? null,
        slot_ends_at: slot?.ends_at ?? null,
        meet_link: (b.meet_link as string | null) ?? null,
        calendar_sync_status: bookingConCalendar.calendar_sync_status ?? null,
        calendar_sync_error: bookingConCalendar.calendar_sync_error ?? null,
      };
    });

    setBookings(mapped);

    // Load pending refund requests
    const { data: refundData, error: refundError } = await supabase
      .from("refund_requests")
      .select("id, student_id, booking_id, amount_sek, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (refundError) {
      toast.error("Error al cargar solicitudes de reembolso");
      setLoading(false);
      return;
    }

    const refundStudentIds = [
      ...new Set((refundData ?? []).map((r) => r.student_id as string)),
    ].filter(Boolean);

    const refundEmailMap: Record<string, string> = {};
    if (refundStudentIds.length > 0) {
      const { data: refundPerfiles } = await supabase
        .from("perfiles")
        .select("user_id, email")
        .in("user_id", refundStudentIds);
      for (const p of refundPerfiles ?? []) {
        if (p.user_id && p.email) refundEmailMap[p.user_id] = p.email;
      }
    }

    const mappedRefunds: RefundRequest[] = (refundData ?? []).map((r) => ({
      id: r.id,
      student_id: r.student_id as string,
      booking_id: r.booking_id as string,
      amount_sek: r.amount_sek as number | null,
      status: r.status,
      created_at: r.created_at,
      student_email: refundEmailMap[r.student_id as string] ?? "—",
    }));

    setRefundRequests(mappedRefunds);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && rol === "admin") void cargar();
  }, [user, rol, cargar]);

  const accion = async (bookingId: string, action: "cancel" | "delete") => {
    setActioning(bookingId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("confirm-booking", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { booking_id: bookingId, action },
      });

      if (error || data?.error) {
        toast.error(data?.error ?? error?.message ?? "Error");
      } else {
        toast.success(action === "delete" ? "Reserva eliminada" : "Reserva cancelada");
        void cargar();
      }
    } finally {
      setActioning(null);
    }
  };

  const marcarProcesado = async (refundId: string) => {
    setProcessingRefund(refundId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesión expirada");
        return;
      }
      const { error } = await supabase
        .from("refund_requests")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
          processed_by: session.user.id,
        })
        .eq("id", refundId);

      if (error) {
        toast.error(error.message ?? "Error al procesar reembolso");
      } else {
        toast.success("Reembolso marcado como procesado");
        void cargar();
      }
    } finally {
      setProcessingRefund(null);
    }
  };

  // KPIs
  const total = bookings.length;
  const confirmadas = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  ).length;
  const pendientes = bookings.filter((b) => b.status === "pending_payment").length;
  const ingresos = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + (b.total_sek ?? 0), 0);

  if (authLoading || !user || rol !== "admin") return null;

  return (
    <div id="admin-bookings-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <Link
            to="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--foreground)]"
            style={{ color: L.muted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Panel de administración
          </Link>
          <h1 className="text-3xl font-semibold tracking-normal" style={headingStyle}>
            Reservas de sesiones
          </h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total reservas", value: total, icon: CalendarDays },
            { label: "Confirmadas", value: confirmadas, icon: CheckCircle2 },
            { label: "Pendientes", value: pendientes, icon: Clock },
            { label: "Ingresos (SEK)", value: ingresos.toLocaleString(), icon: CheckCircle2 },
          ].map((k) => (
            <Card key={k.label} className="admin-card rounded-2xl border">
              <CardHeader className="pb-1">
                <CardTitle
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{ ...fontMono, color: L.muted }}
                >
                  <k.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {k.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums" style={headingStyle}>
                  {k.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reembolsos pendientes */}
        {!loading && refundRequests.length > 0 && (
          <section className="space-y-3">
            <h2
              className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide"
              style={{ ...fontMono, color: L.amberDeep }}
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Reembolsos de dinero pendientes ({refundRequests.length})
            </h2>
            <div className="space-y-2">
              {refundRequests.map((r) => (
                <Card key={r.id} className="admin-card rounded-2xl border">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5 text-sm">
                        <div className="font-medium" style={{ color: L.ink }}>
                          {r.student_email}
                        </div>
                        <div className="text-xs" style={{ color: L.muted }}>
                          {r.amount_sek != null ? `${r.amount_sek} SEK` : "Importe pendiente"} ·
                          Solicitado: {fmt(r.created_at)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="admin-press shrink-0 rounded-xl border"
                        style={softStyle}
                        onClick={() => void marcarProcesado(r.id)}
                        disabled={processingRefund === r.id}
                      >
                        {processingRefund === r.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Marcar procesado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Lista de reservas */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: L.muted }}
              aria-hidden="true"
            />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-sm" style={{ color: L.muted }}>
            No hay reservas todavía.
          </p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id} className="admin-card admin-hover admin-press rounded-2xl border">
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{b.student_email}</span>
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{ ...fontMono, ...(STATUS_STYLE[b.status] ?? {}) }}
                        >
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-xs" style={{ color: L.muted }}>
                        {b.slot_starts_at && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" aria-hidden="true" />
                            {fmt(b.slot_starts_at)} – {fmt(b.slot_ends_at)}
                          </div>
                        )}
                        <div>Profesor: {b.teacher_email}</div>
                        <div>
                          Calendar:{" "}
                          {b.calendar_sync_status === "synced"
                            ? "sincronizado"
                            : b.calendar_sync_status === "failed"
                              ? "error"
                              : b.calendar_sync_status === "cancelled"
                                ? "cancelado"
                                : "pendiente"}
                        </div>
                        {b.total_sek && (
                          <div>
                            {b.price_sek} + {b.vat_sek} moms = {b.total_sek} SEK
                          </div>
                        )}
                        <div>Solicitado: {fmt(b.created_at)}</div>
                      </div>
                      {b.student_goal && (
                        <p
                          className="max-w-md border-l-2 pl-2 text-xs italic"
                          style={{ color: L.muted, borderColor: L.line }}
                        >
                          "{b.student_goal}"
                        </p>
                      )}
                      {b.meet_link && (
                        <a
                          href={b.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                          style={{ color: L.primary }}
                        >
                          <Video className="h-3 w-3" aria-hidden="true" />
                          Google Meet
                        </a>
                      )}
                      {b.calendar_sync_error && (
                        <p className="max-w-xl text-xs" style={{ color: "#B91C1C" }}>
                          Error Calendar: {b.calendar_sync_error}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {(b.status === "confirmed" || b.status === "pending_payment") && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="admin-press rounded-xl border"
                          style={softStyle}
                          onClick={() => accion(b.id, "cancel")}
                          disabled={actioning === b.id}
                        >
                          {actioning === b.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Cancelar
                        </Button>
                      )}
                      {b.status === "cancelled" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="admin-press rounded-xl border hover:text-red-700"
                          style={{ ...softStyle, color: "#B91C1C" }}
                          onClick={() => {
                            if (
                              confirm(
                                "¿Eliminar esta reserva permanentemente? Esta acción no se puede deshacer.",
                              )
                            ) {
                              void accion(b.id, "delete");
                            }
                          }}
                          disabled={actioning === b.id}
                        >
                          {actioning === b.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
