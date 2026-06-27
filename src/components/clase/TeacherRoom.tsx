import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
import type { ClaseBooking, SessionFocus } from "./types";
import {
  type CritAvg,
  focusLabel,
  oralAverages,
  orderByFocus,
  p1Averages,
  p2Averages,
  weakestCrit,
} from "./clase-helpers";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

type P1Row = { id: string; created_at: string; banda_a: number; banda_b: number; banda_c: number; banda_d: number; nota_ib: number | null; texto_literario: string | null; comentario_global: string | null };
type P2Row = { id: string; created_at: string; criterio_a: number; criterio_b1: number; criterio_b2: number; criterio_c: number; criterio_d: number; pregunta: string | null; comentario_global: string | null };
type OralRow = { id: string; created_at: string; criterio_a: number; criterio_b: number; criterio_c: number; criterio_d: number; asunto_global: string | null; comentario_global: string | null };

type Note = { id: string; summary: string | null; next_steps: string | null; visible_to_student: boolean };

function CritBar({ crits, weakest }: { crits: CritAvg[]; weakest: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {crits.map((c) => (
        <span
          key={c.key}
          className="rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums"
          style={{
            backgroundColor: c.key === weakest ? "#FFF1F2" : L.bg2,
            borderColor: c.key === weakest ? "#FB7185" : L.line,
            color: c.key === weakest ? "#BE123C" : L.ink,
          }}
        >
          {c.label} {c.value ?? "—"}/{c.max}
        </span>
      ))}
    </div>
  );
}

export function TeacherRoom({ booking, isEN }: { booking: ClaseBooking; isEN: boolean }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [p1, setP1] = useState<P1Row[]>([]);
  const [p2, setP2] = useState<P2Row[]>([]);
  const [oral, setOral] = useState<OralRow[]>([]);

  const [note, setNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ summary: "", next_steps: "", visible: false });
  const [savingNote, setSavingNote] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: access }, { data: noteData }] = await Promise.all([
      supabase
        .from("booking_teacher_access")
        .select("student_id")
        .eq("booking_id", booking.id)
        .lte("access_starts_at", new Date().toISOString())
        .gt("access_ends_at", new Date().toISOString())
        .is("revoked_at", null)
        .maybeSingle(),
      supabase
        .from("booking_notes")
        .select("id, summary, next_steps, visible_to_student")
        .eq("booking_id", booking.id)
        .eq("teacher_id", user.id)
        .maybeSingle(),
    ]);

    setNote(noteData as Note | null);
    setDraft({
      summary: noteData?.summary ?? "",
      next_steps: noteData?.next_steps ?? "",
      visible: noteData?.visible_to_student ?? false,
    });

    if (!access?.student_id) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setHasAccess(true);

    const [{ data: perfil }, { data: p1d }, { data: p2d }, { data: orald }] = await Promise.all([
      supabase.from("perfiles").select("email").eq("user_id", booking.student_id).maybeSingle(),
      supabase
        .from("evaluaciones")
        .select("id, created_at, banda_a, banda_b, banda_c, banda_d, nota_ib, texto_literario, comentario_global")
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("evaluaciones_prueba2")
        .select("id, created_at, criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d, pregunta, comentario_global")
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("evaluaciones_oral")
        .select("id, created_at, criterio_a, criterio_b, criterio_c, criterio_d, asunto_global, comentario_global")
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setStudentEmail(perfil?.email ?? null);
    setP1((p1d ?? []) as P1Row[]);
    setP2((p2d ?? []) as P2Row[]);
    setOral((orald ?? []) as OralRow[]);
    setLoading(false);
  }, [user, booking.id, booking.student_id]);

  useEffect(() => { void cargar(); }, [cargar]);

  const guardarNota = async () => {
    if (!user) return;
    setSavingNote(true);
    const payload = {
      summary: draft.summary || null,
      next_steps: draft.next_steps || null,
      visible_to_student: draft.visible,
    };
    const { error } = note
      ? await supabase.from("booking_notes").update(payload).eq("id", note.id)
      : await supabase.from("booking_notes").insert({ booking_id: booking.id, teacher_id: user.id, ...payload });
    if (error) {
      toast.error(isEN ? "Error saving notes" : "Error al guardar las notas");
    } else {
      toast.success(isEN ? "Notes saved" : "Notas guardadas");
      void cargar();
    }
    setSavingNote(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }

  const order = orderByFocus(booking.session_focus);
  const sections: Record<SessionFocus, ReactNode> = {
    p1: p1.length > 0 ? (
      <div key="p1" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={headingStyle}>{focusLabel("p1", isEN)}</h3>
          <CritBar crits={p1Averages(p1).crits} weakest={weakestCrit(p1Averages(p1).crits)} />
        </div>
        {p1.slice(0, 3).map((e) => (
          <div key={e.id} className="rounded-xl border px-3 py-2 text-xs" style={{ backgroundColor: L.surface, borderColor: L.line }}>
            <div className="font-semibold" style={{ color: L.ink }}>
              {new Date(e.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES")} · A{e.banda_a} B{e.banda_b} C{e.banda_c} D{e.banda_d}
              {e.nota_ib != null && <> · {isEN ? "Grade" : "Nota"} {e.nota_ib}</>}
            </div>
            {e.comentario_global && <p className="mt-1" style={{ color: L.muted }}>{e.comentario_global}</p>}
          </div>
        ))}
      </div>
    ) : null,
    p2: p2.length > 0 ? (
      <div key="p2" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={headingStyle}>{focusLabel("p2", isEN)}</h3>
          <CritBar crits={p2Averages(p2).crits} weakest={weakestCrit(p2Averages(p2).crits)} />
        </div>
        {p2.slice(0, 3).map((e) => (
          <div key={e.id} className="rounded-xl border px-3 py-2 text-xs" style={{ backgroundColor: L.surface, borderColor: L.line }}>
            <div className="font-semibold" style={{ color: L.ink }}>
              {new Date(e.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES")} · A{e.criterio_a} B{e.criterio_b1}/{e.criterio_b2} C{e.criterio_c} D{e.criterio_d}
            </div>
            {e.comentario_global && <p className="mt-1" style={{ color: L.muted }}>{e.comentario_global}</p>}
          </div>
        ))}
      </div>
    ) : null,
    oral: oral.length > 0 ? (
      <div key="oral" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={headingStyle}>{focusLabel("oral", isEN)}</h3>
          <CritBar crits={oralAverages(oral).crits} weakest={weakestCrit(oralAverages(oral).crits)} />
        </div>
        {oral.slice(0, 3).map((e) => (
          <div key={e.id} className="rounded-xl border px-3 py-2 text-xs" style={{ backgroundColor: L.surface, borderColor: L.line }}>
            <div className="font-semibold" style={{ color: L.ink }}>
              {new Date(e.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES")} · A{e.criterio_a} B{e.criterio_b} C{e.criterio_c} D{e.criterio_d}
            </div>
            {e.comentario_global && <p className="mt-1" style={{ color: L.muted }}>{e.comentario_global}</p>}
          </div>
        ))}
      </div>
    ) : null,
  };

  const noCorrections = p1.length === 0 && p2.length === 0 && oral.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: L.bg2, borderColor: L.line }}>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: L.primary }}>
            {isEN ? "Session focus" : "Enfoque de la sesión"}
          </div>
          <div className="text-base font-semibold" style={{ color: L.ink }}>
            {focusLabel(booking.session_focus, isEN)}
          </div>
          {studentEmail && <div className="mt-1 text-sm" style={{ color: L.muted }}>{studentEmail}</div>}
          {booking.student_goal && (
            <p className="mt-2 text-sm" style={{ color: L.ink }}>
              <span className="font-semibold">{isEN ? "Goal: " : "Objetivo: "}</span>{booking.student_goal}
            </p>
          )}
        </div>

        {!hasAccess ? (
          <div className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: L.surface, borderColor: L.line, color: L.muted }}>
            <Lock aria-hidden="true" className="h-4 w-4" />
            {isEN ? "No access to the student's history." : "Sin acceso al historial del alumno."}
          </div>
        ) : noCorrections ? (
          <p className="text-sm" style={{ color: L.muted }}>
            {isEN ? "This student has no corrections yet." : "Este alumno aún no tiene correcciones."}
          </p>
        ) : (
          <div className="space-y-5">{order.map((f) => sections[f])}</div>
        )}
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: L.surface, borderColor: L.line }}>
          <h3 className="text-sm font-semibold" style={headingStyle}>{isEN ? "Class notes" : "Notas de la clase"}</h3>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label style={{ color: L.ink }}>{isEN ? "Summary" : "Resumen"}</Label>
              <Textarea
                value={draft.summary}
                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                rows={4}
                className="resize-none rounded-xl"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: L.ink }}>{isEN ? "Next steps" : "Próximos pasos"}</Label>
              <Textarea
                value={draft.next_steps}
                onChange={(e) => setDraft((d) => ({ ...d, next_steps: e.target.value }))}
                rows={4}
                className="resize-none rounded-xl"
                style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: L.ink }}>
              <Checkbox checked={draft.visible} onCheckedChange={(v) => setDraft((d) => ({ ...d, visible: v === true }))} />
              {isEN ? "Visible to student" : "Visible para el alumno"}
            </label>
            <Button
              type="button"
              onClick={guardarNota}
              disabled={savingNote}
              className="w-full rounded-xl"
              style={{ backgroundColor: L.primary, color: "#fff" }}
            >
              {savingNote && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              {isEN ? "Save notes" : "Guardar notas"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
