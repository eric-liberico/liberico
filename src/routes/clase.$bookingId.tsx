import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Loader2 } from "lucide-react";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";
import { formatTimeZoneLabel, getBrowserTimeZone } from "@/lib/timezone";
import { SessionHeader } from "@/components/clase/SessionHeader";
import { TeacherRoom } from "@/components/clase/TeacherRoom";
import { StudentRoom } from "@/components/clase/StudentRoom";
import type { ClaseBooking, SessionFocus, ViewerRole } from "@/components/clase/types";

export const Route = createFileRoute("/clase/$bookingId")({
  head: () => ({
    meta: [{ title: "Clase 1:1 — LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ClasePage,
});

const scopedCss = `
  #clase-root .clase-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),box-shadow 0.18s ease,opacity 0.18s ease;}
  #clase-root .clase-press:active{transform:scale(0.98);}
  #clase-root a:focus-visible,#clase-root button:focus-visible,#clase-root textarea:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #clase-root button:not([disabled]){cursor:pointer;}
  #clase-root .clase-reveal{animation:claseReveal 0.45s cubic-bezier(0.22,1,0.36,1) both;}
  #clase-root .clase-join-live{animation:claseJoinPulse 2.4s ease-in-out infinite;}
  @keyframes claseReveal{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  @keyframes claseJoinPulse{0%,100%{box-shadow:0 16px 30px -12px rgba(79,70,229,0.55);}50%{box-shadow:0 18px 42px -8px rgba(79,70,229,0.78);}}
  @media (prefers-reduced-motion: reduce){
    #clase-root .clase-reveal,#clase-root .clase-join-live{animation:none !important;}
    #clase-root .clase-press{transition:none !important;}
  }
`;

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;
const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
};

function ClasePage() {
  const { bookingId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const timeZone = getBrowserTimeZone();
  const timeZoneLabel = formatTimeZoneLabel(timeZone);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<ClaseBooking | null>(null);
  const [role, setRole] = useState<ViewerRole | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, status, student_id, teacher_id, student_goal, theory_focus_id, session_focus, meet_link, slot:booking_slots(starts_at, ends_at)",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!data) {
      setBooking(null);
      setLoading(false);
      return;
    }
    const slot = Array.isArray(data.slot)
      ? data.slot[0]
      : (data.slot as { starts_at?: string; ends_at?: string } | null);
    setBooking({
      id: data.id,
      status: data.status,
      student_id: data.student_id as string,
      teacher_id: data.teacher_id as string,
      student_goal: data.student_goal,
      theory_focus_id: (data as { theory_focus_id?: string | null }).theory_focus_id ?? null,
      session_focus: ((data as { session_focus?: string | null }).session_focus ?? null) as SessionFocus | null,
      meet_link: (data.meet_link as string | null) ?? null,
      slot_starts_at: slot?.starts_at ?? null,
      slot_ends_at: slot?.ends_at ?? null,
    });
    setRole(user.id === (data.student_id as string) ? "student" : "teacher");
    if (user.id === (data.student_id as string)) {
      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("nombre, es_estandarizador_ib")
        .eq("user_id", data.teacher_id as string)
        .maybeSingle();
      setTeacherName(tp?.nombre ?? null);
    }
    setLoading(false);
  }, [user, bookingId]);

  useEffect(() => {
    if (user) void cargar();
  }, [user, cargar]);

  if (authLoading || !user) return null;

  return (
    <div id="clase-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="clase-reveal mx-auto max-w-5xl space-y-6 px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin" style={{ color: L.muted }} />
          </div>
        ) : !booking || !role ? (
          <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: L.surface, borderColor: L.line }}>
            <p className="text-sm" style={{ color: L.muted }}>
              {isEN ? "Class not found or you don't have access." : "Clase no encontrada o sin acceso."}
            </p>
          </div>
        ) : (
          <>
            <SessionHeader
              booking={booking}
              backTo={role === "teacher" ? "/profesor-sesiones" : "/reservar-sesion"}
              backLabel={role === "teacher" ? (isEN ? "My sessions" : "Mis sesiones") : (isEN ? "My classes" : "Mis clases")}
              counterpartLabel={
                role === "student" && teacherName
                  ? teacherName
                  : isEN ? "1:1 class" : "Clase 1:1"
              }
              counterpartSub={role === "student" ? (isEN ? "IB standardizer" : "Estandarizadora IB") : null}
              isEN={isEN}
              timeZone={timeZone}
              timeZoneLabel={timeZoneLabel}
            />
            {role === "teacher" && <TeacherRoom booking={booking} isEN={isEN} />}
            {role === "student" && <StudentRoom booking={booking} isEN={isEN} />}
          </>
        )}
      </main>
    </div>
  );
}
