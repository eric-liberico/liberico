import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

export const Route = createFileRoute("/admin-bookings")({
  head: () => ({
    meta: [{ title: "Reservas — Admin LIBerico" }],
  }),
  component: AdminBookingsPage,
});

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
const STATUS_COLOR: Record<string, string> = {
  pending_payment: "text-amber-700 bg-amber-50 border-amber-200",
  confirmed: "text-green-700 bg-green-50 border-green-200",
  cancelled: "text-muted-foreground bg-muted border-border",
  completed: "text-blue-700 bg-blue-50 border-blue-200",
  no_show: "text-destructive bg-destructive/10 border-destructive/20",
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
    <>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Panel de administración
          </Link>
          <h1 className="text-2xl font-serif font-semibold text-ink">Reservas de sesiones</h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total reservas", value: total, icon: CalendarDays },
            { label: "Confirmadas", value: confirmadas, icon: CheckCircle2 },
            { label: "Pendientes", value: pendientes, icon: Clock },
            { label: "Ingresos (SEK)", value: ingresos.toLocaleString(), icon: CheckCircle2 },
          ].map((k) => (
            <Card key={k.label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <k.icon className="h-3.5 w-3.5" />
                  {k.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de reservas */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay reservas todavía.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{b.student_email}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[b.status] ?? ""}`}
                        >
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {b.slot_starts_at && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
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
                        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-2 max-w-md">
                          "{b.student_goal}"
                        </p>
                      )}
                      {b.meet_link && (
                        <a
                          href={b.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Video className="h-3 w-3" />
                          Google Meet
                        </a>
                      )}
                      {b.calendar_sync_error && (
                        <p className="text-xs text-destructive max-w-xl">
                          Error Calendar: {b.calendar_sync_error}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {(b.status === "confirmed" || b.status === "pending_payment") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => accion(b.id, "cancel")}
                          disabled={actioning === b.id}
                        >
                          {actioning === b.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          Cancelar
                        </Button>
                      )}
                      {b.status === "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
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
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
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
      </div>
    </>
  );
}
